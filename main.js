import { SceneManager } from './src/SceneManager.js';
import { GameLogic } from './src/GameLogic.js';
import { PlayerController } from './src/PlayerController.js';

async function init() {
    const container = document.getElementById('container');
    const sceneManager = new SceneManager(container);
    const gameLogic = new GameLogic();

    await gameLogic.loadPages();

    const playerController = new PlayerController(sceneManager.camera, sceneManager.renderer.domElement);
    playerController.enabled = false; // Disable initially for welcome screen
    sceneManager.setPlayerController(playerController);

    sceneManager.setupWorkstations(gameLogic);

    // --- Welcome Screen Logic ---
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const startButton = document.getElementById('start-game');

    startButton.addEventListener('click', () => {
        welcomeOverlay.classList.add('hidden');
        playerController.enabled = true;
        sceneManager.canvas.requestPointerLock();
    });

    // Wait for models to be ready before rendering
    await Promise.all([
        sceneManager.workstationGenerator.loadPromise,
        sceneManager.npcManager.loadPromise
    ]);
    console.log('[main] Model ready, starting render loop.');

    function animate() {
        requestAnimationFrame(animate);
        playerController.update();
        sceneManager.render(playerController.getPosition());
    }

    animate();
}

init().catch(console.error);
