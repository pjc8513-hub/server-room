import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.workerTemplate = null;
        this.oracleTemplate = null;
        this.activeNPCs = [];

        this.loadPromise = this._loadModels();
    }

    _loadModels() {
        return Promise.all([
            this._loadWorkerModel(),
            this._loadOracleModel()
        ]);
    }

    _loadWorkerModel() {
        return new Promise((resolve) => {
            const mtlLoader = new MTLLoader();
            mtlLoader.setPath('models/');
            mtlLoader.load(
                'worker.mtl',
                (materials) => {
                    materials.preload();
                    const objLoader = new OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.load(
                        'models/worker.obj',
                        (obj) => {
                            console.log('[NPCManager] worker model loaded');
                            this.workerTemplate = this._processModel(obj, 0.55);
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

    _loadOracleModel() {
        return new Promise((resolve) => {
            const mtlLoader = new MTLLoader();
            mtlLoader.setPath('models/');
            mtlLoader.load(
                'llm_entity.mtl',
                (materials) => {
                    materials.preload();
                    const objLoader = new OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.load(
                        'models/llm_entity.obj',
                        (obj) => {
                            console.log('[NPCManager] oracle model loaded');
                            const baseOracle = this._processModel(obj, 0.55);

                            // Create the complex Oracle structure with shells
                            const oracleGroup = new THREE.Group();
                            oracleGroup.add(baseOracle);

                            // -- Core icosahedron (solid, slightly emissive)
                            const icoGeo = new THREE.IcosahedronGeometry(0.85, 1);
                            const icoMat = new THREE.MeshStandardMaterial({
                                color: 0x113355,
                                emissive: 0x1155aa,
                                emissiveIntensity: 0.6,
                                metalness: 0.3,
                                roughness: 0.4,
                                flatShading: true,
                            });
                            const ico = new THREE.Mesh(icoGeo, icoMat);
                            oracleGroup.add(ico);

                            // -- Wireframe shell slightly larger
                            const wireGeo = new THREE.IcosahedronGeometry(0.92, 1);
                            const wireMat = new THREE.MeshBasicMaterial({
                                color: 0x55aaff,
                                wireframe: true,
                                transparent: true,
                                opacity: 0.18,
                            });
                            const wire = new THREE.Mesh(wireGeo, wireMat);
                            oracleGroup.add(wire);

                            // -- Outer glow shell
                            const glowGeo = new THREE.IcosahedronGeometry(1.1, 2);
                            const glowMat = new THREE.MeshStandardMaterial({
                                color: 0x001122,
                                emissive: 0x2277cc,
                                emissiveIntensity: 0.25,
                                transparent: true,
                                opacity: 0.12,
                                side: THREE.BackSide,
                            });
                            oracleGroup.add(new THREE.Mesh(glowGeo, glowMat));

                            this.oracleTemplate = oracleGroup;
                            resolve();
                        },
                        undefined,
                        (err) => {
                            console.warn('[NPCManager] Error loading llm_entity.obj', err);
                            resolve();
                        }
                    );
                },
                undefined,
                (err) => {
                    console.warn('[NPCManager] Error loading llm_entity.mtl', err);
                    resolve();
                }
            );
        });
    }

    _processModel(obj, targetHeight) {
        // Compute original bounding box
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Scale to target height
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

        return group;
    }

    spawnNPCs(position) {
        if (!this.workerTemplate || !this.oracleTemplate || this.activeNPCs.length > 0) return;

        // Spawn Worker
        const worker = this.workerTemplate.clone(true);
        worker.position.copy(position);
        worker.rotation.y = Math.random() * Math.PI * 2;
        worker.userData = { isNPC: true, npcType: 'worker', resolvedText: null };
        this.scene.add(worker);
        this.activeNPCs.push(worker);

        // Spawn Oracle
        const oracle = this.oracleTemplate.clone(true);
        // Offset horizontally and levitate
        const offset = new THREE.Vector3(2, 1.5, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
        oracle.position.copy(position).add(offset);
        oracle.rotation.y = Math.random() * Math.PI * 2;
        oracle.userData = { isNPC: true, npcType: 'oracle', resolvedText: null };
        this.scene.add(oracle);
        this.activeNPCs.push(oracle);

        console.log('[NPCManager] NPCs spawned at', position);
    }

    despawnNPCs() {
        if (this.activeNPCs.length === 0) return;

        this.activeNPCs.forEach(npc => {
            this.scene.remove(npc);
            npc.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        this.activeNPCs = [];
        console.log('[NPCManager] NPCs despawned');
    }

    getActiveNPCs() {
        return this.activeNPCs;
    }
}
