import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { SurfaceScene } from './scenes/SurfaceScene';
import { CavernScene } from './scenes/CavernScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1024,
  height: 640,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0d1117',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, SurfaceScene, CavernScene, UIScene]
};

import { SaoHoloUI } from './ui/SaoHoloUI';
import { playtimeEngine } from './events/PlaytimeEventEngine';

declare global {
  interface Window {
    phaserGameInstance?: Phaser.Game;
    saoHoloUIInstance?: SaoHoloUI;
    playtimeEngineInstance?: typeof playtimeEngine;
  }
}

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  window.phaserGameInstance = game;
  window.saoHoloUIInstance = new SaoHoloUI();
  window.playtimeEngineInstance = playtimeEngine;
  playtimeEngine.start();
});
