import * as THREE from 'three';

export class PathIlluminator {
    constructor(scene) {
        this.scene = scene;
        this.line = null;
    }

    updatePath(workstations) {
        if (workstations.length < 2) return;

        if (this.line) {
            this.scene.remove(this.line);
            this.line.geometry.dispose();
            this.line.material.dispose();
        }

        const points = workstations.map(w => {
            const pos = w.position.clone();
            pos.y = 0.05; // Slightly above ground
            return pos;
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.5
        });

        this.line = new THREE.Line(geometry, material);
        this.scene.add(this.line);

        // Add some "glow" with a wider line or particles?
        // For now, let's stick to a simple clean line but maybe add points at connections
    }
}
