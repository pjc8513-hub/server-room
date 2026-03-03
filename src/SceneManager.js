import * as THREE from 'three';
import { WorkstationGenerator } from './WorkstationGenerator.js';
import { NPCManager } from './NPCManager.js';
import { PathIlluminator } from './PathIlluminator.js';
import { TextGenerator } from './TextGenerator.js';
import { AudioManager } from './AudioManager.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        this.canvas = this.renderer.domElement;

        this.scene.background = new THREE.Color(0xe0f0ff);
        this.scene.fog = new THREE.FogExp2(0xe0f0ff, 0.05);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);
        const dirLight = new THREE.DirectionalLight(0x88ccff, 1);
        dirLight.position.set(1, 10, 1);
        this.scene.add(dirLight);

        this.pointLight = new THREE.PointLight(0x88ccff, 2, 50);
        this.scene.add(this.pointLight);

        this.workstationGenerator = new WorkstationGenerator(this.scene);
        this.npcManager = new NPCManager(this.scene);
        this.pathIlluminator = new PathIlluminator(this.scene);
        this.textGenerator = new TextGenerator();
        this.audioManager = new AudioManager();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.reading = false;
        this.playerController = null;
        this.gameLogic = null;
        this.overlay = document.getElementById('reading-overlay');
        this.contentDiv = document.getElementById('reading-content');
        this.closeBtn = document.getElementById('close-reading');
        this.coordsDiv = document.getElementById('coords');

        // --- Psychological Fog State ---
        this.fogStep = 0;
        this.maxFogSteps = 8;
        this.isFogReceding = false;

        this.baseFogColor = new THREE.Color(0xe0f0ff);
        this.targetFogColor = new THREE.Color(0xe0f0ff);
        this.menacingFogColor = new THREE.Color(0x220505);

        this.baseFogDensity = 0.05;
        this.targetFogDensity = 0.05;
        this.maxFogDensity = 0.35;

        this.baseAmbientIntensity = 0.5;
        this.targetAmbientIntensity = 0.5;
        this.minAmbientIntensity = 0.1;

        this._setupEnvironment();

        this.closeBtn.onclick = () => this.stopReading();

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('keydown', (e) => {
            if (this.reading && e.code === 'Space') {
                e.preventDefault();
                this.stopReading();
            }
        });
    }

    setPlayerController(pc) {
        this.playerController = pc;
    }

    setupWorkstations(gameLogic) {
        this.gameLogic = gameLogic;
    }

    onMouseDown(e) {
        if (this.reading) return;

        // Only fire when pointer is locked (player is exploring the scene)
        if (document.pointerLockElement !== this.canvas) return;

        // Raycast from the centre of the screen (crosshair)
        this.mouse.set(0, 0);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const workstations = this.workstationGenerator.getWorkstationList();
        const activeWorker = this.npcManager.getActiveWorker();
        const interactables = activeWorker ? [...workstations, activeWorker] : workstations;

        // intersectObjects with recursive:true catches meshes inside OBJ groups
        const intersects = this.raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
            // Walk up to the root group
            let obj = intersects[0].object;
            while (obj.parent && !interactables.includes(obj)) {
                obj = obj.parent;
            }
            this.lastInteracted = obj;
            this.startReading(obj);
        }
    }

    /**
     * Determine and show text for a workstation.
     * Text is resolved once per workstation (stable on re-click).
     * 50/50 chance: novel text from pages.json OR noise text.
     */
    startReading(workstation) {
        this.reading = true;
        if (this.playerController) this.playerController.enabled = false;
        this.overlay.classList.remove('hidden');
        document.exitPointerLock();

        // Resolve text on first click; reuse on subsequent clicks
        if (workstation.userData.resolvedText === null) {
            if (workstation.userData.isNPC) {
                const dialogue = this.gameLogic.getRandomDialogue();
                workstation.userData.resolvedText = dialogue.content;
            } else {
                const useNovel = Math.random() < 0.5 && this.gameLogic && this.gameLogic.pages.length > 0;
                if (useNovel) {
                    const page = this.gameLogic.getRandomPage();
                    workstation.userData.resolvedText = page.content;
                } else {
                    workstation.userData.resolvedText = this.textGenerator.generateNoise(40);
                }
            }
        }

        this.contentDiv.innerText = workstation.userData.resolvedText;

        // Play atmospheric audio occasionally
        if (!workstation.userData.isNPC) {
            this.audioManager.playAtmosphericAudio();
        }
    }

    stopReading() {
        const currentInteracted = this.lastInteracted;
        this.reading = false;
        if (this.playerController) this.playerController.enabled = true;
        this.overlay.classList.add('hidden');
        this.canvas.requestPointerLock();

        if (currentInteracted && currentInteracted.userData.isNPC) {
            this.npcManager.despawnWorker();
        } else if (currentInteracted && !this.npcManager.getActiveWorker()) {
            // Update psychological state ONLY when reading a workstation (non-NPC)
            this._updatePsychologicalState();

            const playerPos = this.playerController.getPosition();
            const angle = Math.random() * Math.PI * 2;
            const dist = 6 + Math.random() * 4;
            const spawnPos = new THREE.Vector3(
                playerPos.x + Math.cos(angle) * dist,
                0,
                playerPos.z + Math.sin(angle) * dist
            );
            this.npcManager.spawnWorker(spawnPos);
        }
        this.lastInteracted = null;
    }

    _updatePsychologicalState() {
        if (this.isFogReceding) {
            this.fogStep--;
            if (this.fogStep <= 0) {
                this.fogStep = 0;
                this.isFogReceding = false;
            }
        } else {
            this.fogStep++;
            if (this.fogStep >= this.maxFogSteps) {
                this.isFogReceding = true;
            }
        }

        const t = this.fogStep / this.maxFogSteps;

        // Calculate targets
        this.targetFogDensity = this.baseFogDensity + (this.maxFogDensity - this.baseFogDensity) * t;
        this.targetAmbientIntensity = this.baseAmbientIntensity + (this.minAmbientIntensity - this.baseAmbientIntensity) * t;
        this.targetFogColor.copy(this.baseFogColor).lerp(this.menacingFogColor, t);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(playerPosition) {
        if (this.reading) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        this.coordsDiv.innerText = `X: ${Math.round(playerPosition.x)} Z: ${Math.round(playerPosition.z)}`;
        this.pointLight.position.copy(playerPosition);
        this.pointLight.position.y += 2;

        this.workstationGenerator.update(playerPosition, 40);

        // Check active NPC distance
        const worker = this.npcManager.getActiveWorker();
        if (worker) {
            const dist = worker.position.distanceTo(playerPosition);
            if (dist > 15) {
                this.npcManager.despawnWorker();
            }
        }

        // Smoothly interpolate fog and lighting
        this.scene.fog.density += (this.targetFogDensity - this.scene.fog.density) * 0.05;
        this.scene.fog.color.lerp(this.targetFogColor, 0.05);
        this.scene.background.lerp(this.targetFogColor, 0.05);

        if (this.ambientLight) {
            this.ambientLight.intensity += (this.targetAmbientIntensity - this.ambientLight.intensity) * 0.05;
        }

        this.renderer.render(this.scene, this.camera);
    }

    _setupEnvironment() {
        // --- Glossy Tiled Floor ---
        const tileSize = 2;
        const floorSize = 1000;

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Tile Background
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, 128, 128);

        // Tile Border (Grid)
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 128, 128);

        // Subtle detail
        ctx.fillStyle = '#151515';
        ctx.fillRect(5, 5, 118, 118);

        const floorTexture = new THREE.CanvasTexture(canvas);
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(floorSize / tileSize, floorSize / tileSize);

        const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMat = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.05,
            metalness: 0.5,
            color: 0x222222
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // --- Fluorescent Lights overhead ---
        // We'll create a few long strips to represent ceiling lights
        const stripCount = 10;
        const spacing = 40;
        for (let i = -stripCount; i <= stripCount; i++) {
            const stripGeo = new THREE.BoxGeometry(0.5, 0.1, 1000);
            const stripMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xffffff,
                emissiveIntensity: 5
            });
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.set(i * spacing, 10, 0);
            this.scene.add(strip);

            // Add a light source for each strip to create reflections
            const pLight = new THREE.PointLight(0xffffff, 0.5, 100);
            pLight.position.set(i * spacing, 9.5, 0);
            this.scene.add(pLight);
        }

        // RectAreaLight is better for strips but requires a special import/setup in Three.js
        // Let's use a focused directional light or multiple point lights for now.
        const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
        topLight.position.set(0, 20, 0);
        this.scene.add(topLight);
    }
}
