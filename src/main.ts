import { Game } from './core/Game';

let game: Game;

try {
  // Initialize the game
  console.log('Initializing game...');
  game = new Game();
  console.log('Game initialized successfully');

  // Check for save and show menu (or auto-start if no save)
  game.checkSaveAndShowMenu();

  // Handle window resize
  window.addEventListener('resize', () => {
    game.onWindowResize();
  });

  // Handle visibility change (pause when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.pause();
    } else {
      game.resume();
    }
  });
} catch (error: any) {
  console.error('Failed to initialize game:', error);
  document.body.innerHTML = `<div style="color: white; padding: 20px; font-family: monospace;">
    <h1>Error initializing game:</h1>
    <pre>${error.message}\n${error.stack}</pre>
  </div>`;
}
