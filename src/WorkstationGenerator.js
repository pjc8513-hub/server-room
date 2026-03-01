import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export class WorkstationGenerator {
    constructor(scene) {
        this.scene = scene;
        this.workstations = new Map(); // "x,z" -> group/mesh
        this.workstationSpacing = 4;
        this.workstationScale = 1.0; // Use natural scale for models or fallback
        this.workstationTemplate = null;

        this.loadPromise = this._loadModel();
    }

    _loadModel() {
        return new Promise((resolve) => {
            const mtlLoader = new MTLLoader();
            mtlLoader.setPath('models/');
            mtlLoader.load(
                'monolith.mtl',
                (materials) => {
                    materials.preload();
                    console.log('[WorkstationGenerator] monolith.mtl loaded successfully');
                    const objLoader = new OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.load(
                        'models/monolith.obj',
                        (obj) => {
                            console.log('[WorkstationGenerator] monolith.obj loaded successfully');

                            const box = new THREE.Box3().setFromObject(obj);
                            const center = new THREE.Vector3();
                            box.getCenter(center);

                            obj.position.set(-center.x, -box.min.y, -center.z);

                            const group = new THREE.Group();
                            group.add(obj);

                            group.rotation.x = -Math.PI / 2;

                            group.traverse((child) => {
                                if (child.isMesh) {
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });
                            this.workstationTemplate = group;
                            resolve();
                        },
                        undefined,
                        (err) => {
                            console.warn('[WorkstationGenerator] Failed to load model, using fallback.', err);
                            this._useFallback();
                            resolve();
                        }
                    );
                },
                undefined,
                (err) => {
                    console.warn('[WorkstationGenerator] MTL not found, loading OBJ with default material.', err);
                    const objLoader = new OBJLoader();
                    objLoader.load(
                        'models/monolith.obj',
                        (obj) => {
                            const box = new THREE.Box3().setFromObject(obj);
                            const center = new THREE.Vector3();
                            box.getCenter(center);

                            obj.position.set(-center.x, -box.min.y, -center.z);

                            const group = new THREE.Group();
                            group.add(obj);

                            group.traverse((child) => {
                                if (child.isMesh) {
                                    child.material = new THREE.MeshStandardMaterial({
                                        color: 0x3a3a5a, roughness: 0.7, metalness: 0.3,
                                    });
                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                }
                            });
                            this.workstationTemplate = group;
                            resolve();
                        },
                        undefined,
                        () => { this._useFallback(); resolve(); }
                    );
                }
            );
        });
    }

    _useFallback() {
        console.warn('[WorkstationGenerator] Using fallback desk/monitor geometry.');
        const group = new THREE.Group();

        // Typical desk: 1.5m wide, 0.75m high, 0.75m deep
        const deskGeo = new THREE.BoxGeometry(1.5, 0.75, 0.75);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.y = 0.375;
        desk.castShadow = true;
        desk.receiveShadow = true;
        group.add(desk);

        // Typical monitor: 0.5m wide, 0.3m high
        const monitorGeo = new THREE.BoxGeometry(0.5, 0.3, 0.05);
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
        const monitor = new THREE.Mesh(monitorGeo, monitorMat);
        monitor.position.y = 0.75 + 0.15; // Directly on desk
        monitor.position.z = -0.2; // Back of the desk
        monitor.castShadow = true;
        monitor.receiveShadow = true;
        group.add(monitor);

        this.workstationTemplate = group;
    }

    update(playerPosition, radius = 50) {
        if (!this.workstationTemplate) return;

        const px = Math.round(playerPosition.x / this.workstationSpacing);
        const pz = Math.round(playerPosition.z / this.workstationSpacing);
        const gridRadius = Math.ceil(radius / this.workstationSpacing);

        const currentKeys = new Set();

        for (let x = px - gridRadius; x <= px + gridRadius; x++) {
            for (let z = pz - gridRadius; z <= pz + gridRadius; z++) {
                const key = `${x},${z}`;
                currentKeys.add(key);
                if (!this.workstations.has(key)) {
                    this.createWorkstationAtGrid(x, z);
                }
            }
        }

        for (const [key, group] of this.workstations.entries()) {
            if (!currentKeys.has(key)) {
                this.scene.remove(group);
                group.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                this.workstations.delete(key);
            }
        }
    }

    createWorkstationAtGrid(gx, gz) {
        if (!this.workstationTemplate) return;

        const clone = this.workstationTemplate.clone(true);

        clone.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => m.clone());
                } else {
                    child.material = child.material.clone();
                }
            }
        });

        // Grid alignment (no jitter)
        clone.position.set(
            gx * this.workstationSpacing,
            0.01, // Slightly above floor to avoid z-fighting
            gz * this.workstationSpacing
        );
        clone.scale.setScalar(this.workstationScale);

        clone.userData = { gx, gz, resolvedText: null };

        this.scene.add(clone);
        this.workstations.set(`${gx},${gz}`, clone);
    }

    hash(x, z) {
        return Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123) % 1;
    }

    getWorkstationList() {
        return Array.from(this.workstations.values());
    }
}
