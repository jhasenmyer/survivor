import { Game } from './core/Game';

// Initialize the game
const game = new Game();

// Start the game loop
game.start();

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
