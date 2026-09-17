import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { GameMode } from '../types';

export class UIScene extends Phaser.Scene {
  private resText!: Phaser.GameObjects.Text;
  private modeBtnText!: Phaser.GameObjects.Text;
  private modeBtnBg!: Phaser.GameObjects.Rectangle;

  // Consequence gauges
  private weightBar!: Phaser.GameObjects.Rectangle;
  private weightText!: Phaser.GameObjects.Text;

  private rootBar!: Phaser.GameObjects.Rectangle;
  private rootText!: Phaser.GameObjects.Text;

  private toxBar!: Phaser.GameObjects.Rectangle;
  private toxText!: Phaser.GameObjects.Text;

  private logText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;

  private endOverlayContainer!: Phaser.GameObjects.Container;
  private unsubscribe!: () => void;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const { width } = this.scale;

    // 1. Top HUD Bar Background
    const topBar = this.add.rectangle(width / 2, 22, width, 44, 0x0d1117, 0.92)
      .setStrokeStyle(1.5, 0x30363d);

    // Day counter & rank
    this.dayText = this.add.text(14, 13, 'DAY 1 [PEASANT]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8.5px',
      color: '#f59e0b'
    });

    // Resources Text Display
    this.resText = this.add.text(155, 12, '', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '12.5px',
      fontStyle: 'bold',
      color: '#e6edf3'
    });

    // Mode Toggle Button (Top Right)
    this.modeBtnBg = this.add.rectangle(width - 110, 22, 180, 28, 0x1f6feb, 1)
      .setStrokeStyle(1.5, 0x388bfd)
      .setInteractive({ useHandCursor: true });

    this.modeBtnText = this.add.text(width - 110, 22, '⛏️ DIVE TO CAVERN [TAB]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.modeBtnBg.on('pointerdown', () => {
      this.toggleGameMode();
    });

    // Rest / Next Day Button
    const restBtn = this.add.rectangle(width - 245, 22, 75, 28, 0x238636, 1)
      .setStrokeStyle(1, 0x2ea043)
      .setInteractive({ useHandCursor: true });

    const restText = this.add.text(width - 245, 22, '💤 REST', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: '#ffffff'
    }).setOrigin(0.5);

    restBtn.on('pointerdown', () => {
      gameState.endDayCycle();
    });

    // 2. Consequence Gauges Panel (Floating under top bar)
    this.createConsequenceGauges(width);

    // 3. Live Consequence Event Ticker (Bottom of screen)
    this.createEventTicker(width);

    // 4. End-Game Overlay (Hidden initially)
    this.createEndGameOverlay();

    // 5. Subscribe to GameState updates
    this.unsubscribe = gameState.subscribe(() => {
      this.refreshHUD();
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubscribe) this.unsubscribe();
    });

    this.refreshHUD();
  }

  private createConsequenceGauges(width: number) {
    const startX = width / 2 - 250;
    const barY = 56;
    const barW = 140;
    const barH = 10;

    // Background container
    const gaugePanel = this.add.rectangle(width / 2, 58, 540, 26, 0x161b22, 0.85)
      .setStrokeStyle(1, 0x30363d);

    // Gauge 1: Tectonic Weight
    this.add.text(startX - 50, barY, 'WEIGHT:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: '#f0883e'
    }).setOrigin(0, 0.5);

    this.add.rectangle(startX + 30, barY, barW, barH, 0x21262d, 1).setOrigin(0, 0.5);
    this.weightBar = this.add.rectangle(startX + 30, barY, 20, barH, 0xf0883e, 1).setOrigin(0, 0.5);
    this.weightText = this.add.text(startX + 30 + barW / 2, barY, '10%', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Gauge 2: Root Stability
    const rootX = startX + 195;
    this.add.text(rootX - 45, barY, 'ROOTS:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: '#7ee787'
    }).setOrigin(0, 0.5);

    this.add.rectangle(rootX + 25, barY, barW, barH, 0x21262d, 1).setOrigin(0, 0.5);
    this.rootBar = this.add.rectangle(rootX + 25, barY, 100, barH, 0x22c55e, 1).setOrigin(0, 0.5);
    this.rootText = this.add.text(rootX + 25 + barW / 2, barY, '90%', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Gauge 3: Toxicity
    const toxX = rootX + 185;
    this.add.text(toxX - 45, barY, 'TOXIC:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: '#a855f7'
    }).setOrigin(0, 0.5);

    this.add.rectangle(toxX + 20, barY, barW - 20, barH, 0x21262d, 1).setOrigin(0, 0.5);
    this.toxBar = this.add.rectangle(toxX + 20, barY, 15, barH, 0xa855f7, 1).setOrigin(0, 0.5);
    this.toxText = this.add.text(toxX + 20 + (barW - 20) / 2, barY, '5%', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  private createEventTicker(width: number) {
    const bottomBg = this.add.rectangle(width / 2, 624, width, 30, 0x0d1117, 0.95)
      .setStrokeStyle(1.5, 0x30363d);

    const prefix = this.add.text(12, 624, '⚡ LATEST RIPPLE:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: '#f59e0b'
    }).setOrigin(0, 0.5);

    this.logText = this.add.text(175, 624, 'Observing tectonic equilibrium...', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '12.5px',
      color: '#e6edf3',
      wordWrap: { width: width - 200 }
    }).setOrigin(0, 0.5);
  }

  private createEndGameOverlay() {
    const { width, height } = this.scale;
    this.endOverlayContainer = this.add.container(width / 2, height / 2);
    this.endOverlayContainer.setVisible(false);
    this.endOverlayContainer.setDepth(200);

    const bg = this.add.rectangle(0, 0, 720, 380, 0x0d1117, 0.98)
      .setStrokeStyle(3, 0xf0883e);

    const title = this.add.text(0, -130, 'OUTCOME TITLE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#f0883e'
    }).setOrigin(0.5);

    const desc = this.add.text(0, -20, 'Outcome description', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '16px',
      color: '#e6edf3',
      align: 'center',
      wordWrap: { width: 620 }
    }).setOrigin(0.5);

    const restartBtn = this.add.rectangle(0, 110, 220, 42, 0x238636, 1)
      .setStrokeStyle(1, 0x2ea043)
      .setInteractive({ useHandCursor: true });

    const restartText = this.add.text(0, 110, 'PLAY AGAIN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5);

    restartBtn.on('pointerdown', () => {
      window.location.reload();
    });

    this.endOverlayContainer.add([bg, title, desc, restartBtn, restartText]);
  }

  private toggleGameMode() {
    if (gameState.currentMode === GameMode.SURFACE) {
      const surface = this.scene.get('SurfaceScene') as unknown as { transitionToCavern: () => void };
      if (surface) surface.transitionToCavern();
    } else if (gameState.currentMode === GameMode.CAVERN) {
      this.scene.sleep('CavernScene');
      this.scene.wake('SurfaceScene');
      gameState.currentMode = GameMode.SURFACE;
      gameState.endDayCycle();
    }
  }

  private refreshHUD() {
    this.dayText.setText(`DAY ${gameState.day} [${gameState.militaryRank.toUpperCase()}]`);
    if (gameState.militaryRank === 'king') {
      this.dayText.setColor('#fbbf24');
    } else if (gameState.militaryRank === 'captain') {
      this.dayText.setColor('#38bdf8');
    } else {
      this.dayText.setColor('#e2e8f0');
    }

    // Update resources string
    const r = gameState.resources;
    this.resText.setText(
      `💰${r.gold} 🌲${r.wood} 🪨${r.stone} ⚙️${r.iron} ✨${r.lumens} 💎${r.aetherCore}/1 🌾${r.food} 🔮${r.mana} ⚔️${r.troops} 💜${r.demonShards} 👥${r.population}/${r.maxPopulation}`
    );

    // Update Mode Button text
    if (gameState.currentMode === GameMode.SURFACE) {
      this.modeBtnText.setText('⛏️ DIVE TO CAVERN [TAB]');
      this.modeBtnBg.setFillStyle(0x1f6feb);
    } else {
      this.modeBtnText.setText('🏛️ ASCEND TO TOWN [TAB]');
      this.modeBtnBg.setFillStyle(0xb45309);
    }

    // Update Gauges
    const m = gameState.metrics;
    const barW = 140;

    // Weight
    this.weightBar.width = (m.tectonicWeight / 100) * barW;
    this.weightText.setText(`${Math.round(m.tectonicWeight)}%`);
    this.weightBar.setFillStyle(m.tectonicWeight > 65 ? 0xef4444 : m.tectonicWeight > 35 ? 0xf59e0b : 0x38bdf8);

    // Roots
    this.rootBar.width = (m.rootIntegrity / 100) * barW;
    this.rootText.setText(`${Math.round(m.rootIntegrity)}%`);
    this.rootBar.setFillStyle(m.rootIntegrity < 40 ? 0xef4444 : m.rootIntegrity < 70 ? 0xf59e0b : 0x22c55e);

    // Toxicity
    const toxW = barW - 20;
    this.toxBar.width = (m.toxicityLevel / 100) * toxW;
    this.toxText.setText(`${Math.round(m.toxicityLevel)}%`);
    this.toxBar.setFillStyle(m.toxicityLevel > 50 ? 0xef4444 : m.toxicityLevel > 25 ? 0xf59e0b : 0x38bdf8);

    // Update latest log
    if (gameState.logs.length > 0) {
      const topLog = gameState.logs[0];
      this.logText.setText(`[${topLog.timestamp}] ${topLog.text}`);
      if (topLog.type === 'crisis') this.logText.setColor('#ef4444');
      else if (topLog.type === 'warning') this.logText.setColor('#f59e0b');
      else if (topLog.type === 'positive') this.logText.setColor('#38bdf8');
      else this.logText.setColor('#e6edf3');
    }

    // Check End Game
    if (gameState.currentMode === GameMode.GAME_OVER || gameState.currentMode === GameMode.VICTORY) {
      this.showEndGameModal(gameState.currentMode);
    }
  }

  private showEndGameModal(mode: GameMode) {
    this.endOverlayContainer.setVisible(true);
    const title = this.endOverlayContainer.getAt(1) as Phaser.GameObjects.Text;
    const desc = this.endOverlayContainer.getAt(2) as Phaser.GameObjects.Text;

    if (mode === GameMode.GAME_OVER) {
      title.setText('⚠️ THE PERVERSE INCENTIVE CLAIMED YOU');
      title.setColor('#ef4444');
      desc.setText(
        'You rushed to build the Sky-Spire Monument through hyper-industrial expansion, clear-cutting the forests and weighing down the crust with heavy foundries.\n\n' +
        'The hollow caverns below could not sustain the tectonic strain. The foundation sheared away, collapsing the entire city into the abyss.\n\n' +
        'Lesson: Efficiency without ecological harmony leads to inevitable collapse.'
      );
    } else {
      title.setText('🏆 HARMONIC BIO-METROPOLIS ESTABLISHED!');
      title.setColor('#22c55e');
      desc.setText(
        'You balanced the surface expansion with ancient Ironwood deep-roots and bio-canal water filters.\n\n' +
        'The Sky-Spire Monument pierces the clouds, anchored firmly by subterranean equilibrium. The caverns below thrive with luminescent crystals and crystal mineral springs.\n\n' +
        'You have mastered the art of living with consequences!'
      );
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}
