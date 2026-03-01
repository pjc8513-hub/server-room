import * as THREE from 'three';

export class PlayerController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.moveSpeed = 0.2;
        this.lookSpeed = 0.002;

        // Pick camera up from the ground
        this.camera.position.y = 0.4;

        this.keys = {};
        this.pitch = 0;
        this.yaw = 0;
        this.enabled = true;

        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);

        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.domElement) {
                this.yaw -= e.movementX * this.lookSpeed;
                this.pitch -= e.movementY * this.lookSpeed;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
            }
        });
    }

    update() {
        if (!this.enabled) return;

        // Rotation
        this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

        // Movement
        const direction = new THREE.Vector3();
        if (this.keys['w']) direction.z -= 1;
        if (this.keys['s']) direction.z += 1;
        if (this.keys['a']) direction.x -= 1;
        if (this.keys['d']) direction.x += 1;

        direction.applyQuaternion(this.camera.quaternion);
        direction.y = 0;
        direction.normalize();

        this.camera.position.addScaledVector(direction, this.moveSpeed);
    }

    getPosition() {
        return this.camera.position;
    }
}
