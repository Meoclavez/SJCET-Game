import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { OpeningDemoScene } from './scenes/OpeningDemoScene';
import { SurfaceScene } from './scenes/SurfaceScene';
import { CavernScene } from './scenes/CavernScene';
import { UIScene } from './scenes/UIScene';
import { SaoHoloUI } from './ui/SaoHoloUI';
import { playtimeEngine } from './events/PlaytimeEventEngine';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  backgroundColor: '#0d1117',
  render: {
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, OpeningDemoScene, SurfaceScene, CavernScene, UIScene],
};

declare global {
  interface Window {
    phaserGameInstance?: Phaser.Game;
    saoHoloUIInstance?: SaoHoloUI;
    playtimeEngineInstance?: typeof playtimeEngine;
  }
}

function initGame() {
  if (window.phaserGameInstance) return;
  const game = new Phaser.Game(config);
  window.phaserGameInstance = game;
  window.saoHoloUIInstance = new SaoHoloUI();
  window.playtimeEngineInstance = playtimeEngine;
  playtimeEngine.start();
}

if (document.readyState !== 'loading') {
  initGame();
} else {
  document.addEventListener('DOMContentLoaded', initGame);
}
