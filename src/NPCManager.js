import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.workerTemplate = null;
        this.activeWorker = null;

        this.loadPromise = this._loadModel();
    }

    _loadModel() {
        return new Promise((resolve) => {
            const mtlLoader = new MTLLoader();
            mtlLoader.setPath('/models/');
            mtlLoader.load(
                'worker.mtl',
                (materials) => {
                    materials.preload();
                    const objLoader = new OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.load(
                        '/models/worker.obj',
                        (obj) => {
                            console.log('[NPCManager] worker model loaded');

                            // Compute original bounding box
                            const box = new THREE.Box3().setFromObject(obj);
                            const size = new THREE.Vector3();
                            box.getSize(size);

                            // Scale to target height
                            const targetHeight = 0.55;
                            const scaleFactor = targetHeight / size.y;
                            obj.scale.setScalar(scaleFactor);

                            // IMPORTANT: update matrix before recalculating box
                            obj.updateMatrixWorld(true);

                            // Recalculate bounding box AFTER scaling
                            const scaledBox = new THREE.Box3().setFromObject(obj);
                            const scaledCenter = new THREE.Vector3();
                            scaledBox.getCenter(scaledCenter);

                            // Center horizontally
                            obj.position.x -= scaledCenter.x;
                            obj.position.z -= scaledCenter.z;

                            // Move feet to y = 0
                            obj.position.y -= scaledBox.min.y;

                            const group = new THREE.Group();
                            group.add(obj);

                            group.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });

                            this.workerTemplate = group;
                            resolve();
                        },
                        undefined,
                        (err) => {
                            console.warn('[NPCManager] Error loading worker.obj', err);
                            resolve();
                        }
                    );
                },
                undefined,
                (err) => {
                    console.warn('[NPCManager] Error loading worker.mtl', err);
                    resolve();
                }
            );
        });
    }

    spawnWorker(position) {
        if (!this.workerTemplate || this.activeWorker) return;

        const worker = this.workerTemplate.clone(true);
        worker.position.copy(position);

        // Slightly rotate to face a random direction or theoretically the player
        worker.rotation.y = Math.random() * Math.PI * 2;

        // NPC specific data
        worker.userData = {
            isNPC: true,
            resolvedText: null
        };

        this.scene.add(worker);
        this.activeWorker = worker;
        console.log('[NPCManager] Worker spawned at', position);
    }

    despawnWorker() {
        if (!this.activeWorker) return;

        this.scene.remove(this.activeWorker);
        this.activeWorker.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        this.activeWorker = null;
        console.log('[NPCManager] Worker despawned');
    }

    getActiveWorker() {
        return this.activeWorker;
    }
}
