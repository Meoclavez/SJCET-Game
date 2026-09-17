import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { GameMode } from '../types';

export class UIScene extends Phaser.Scene {
  private topBar!: Phaser.GameObjects.Rectangle;
  private resText!: Phaser.GameObjects.Text;
  private modeBtnText!: Phaser.GameObjects.Text;
  private modeBtnBg!: Phaser.GameObjects.Rectangle;
  private restBtnBg!: Phaser.GameObjects.Rectangle;
  private restBtnText!: Phaser.GameObjects.Text;

  // Consequence gauges
  private gaugePanel!: Phaser.GameObjects.Rectangle;
  private weightLabel!: Phaser.GameObjects.Text;
  private weightBg!: Phaser.GameObjects.Rectangle;
  private weightBar!: Phaser.GameObjects.Rectangle;
  private weightText!: Phaser.GameObjects.Text;

  private rootLabel!: Phaser.GameObjects.Text;
  private rootBg!: Phaser.GameObjects.Rectangle;
  private rootBar!: Phaser.GameObjects.Rectangle;
  private rootText!: Phaser.GameObjects.Text;

  private toxLabel!: Phaser.GameObjects.Text;
  private toxBg!: Phaser.GameObjects.Rectangle;
  private toxBar!: Phaser.GameObjects.Rectangle;
  private toxText!: Phaser.GameObjects.Text;

  // Event Ticker
  private bottomBg!: Phaser.GameObjects.Rectangle;
  private tickerPrefix!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;

  private endOverlayContainer!: Phaser.GameObjects.Container;
  private unsubscribe!: () => void;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 1. Top HUD Bar Background (Spans full width)
    this.topBar = this.add.rectangle(width / 2, 22, width, 44, 0x0d1117, 0.92)
      .setStrokeStyle(1.5, 0x30363d);

    // Day counter & rank
    const dayX = 14;
    this.dayText = this.add.text(dayX, 22, 'DAY 1 [PEASANT]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#f59e0b'
    }).setOrigin(0, 0.5);

    // Resources Text Display
    const resX = 135;
    this.resText = this.add.text(resX, 22, '', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: width < 1200 ? '11.5px' : '13px',
      fontStyle: 'bold',
      color: '#e6edf3'
    }).setOrigin(0, 0.5);

    // Mode Toggle Button (Top Right)
    this.modeBtnBg = this.add.rectangle(width - 100, 22, 180, 28, 0x1f6feb, 1)
      .setStrokeStyle(1.5, 0x388bfd)
      .setInteractive({ useHandCursor: true });

    this.modeBtnText = this.add.text(width - 100, 22, '⛏️ DIVE TO CAVERN [TAB]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.modeBtnBg.on('pointerdown', () => {
      this.toggleGameMode();
    });

    // Rest / Next Day Button
    this.restBtnBg = this.add.rectangle(width - 235, 22, 75, 28, 0x238636, 1)
      .setStrokeStyle(1, 0x2ea043)
      .setInteractive({ useHandCursor: true });

    this.restBtnText = this.add.text(width - 235, 22, '💤 REST', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.restBtnBg.on('pointerdown', () => {
      gameState.endDayCycle();
    });

    // 2. Consequence Gauges Panel (Floating under top bar, centered and scaled)
    this.createConsequenceGauges(width);

    // 3. Live Consequence Event Ticker (Bottom of screen full width)
    this.createEventTicker(width, height);

    // 4. End-Game Overlay (Hidden initially)
    this.createEndGameOverlay();

    // 5. Window Resize Handler
    this.scale.on('resize', this.handleResize, this);

    // 6. Subscribe to GameState updates
    this.unsubscribe = gameState.subscribe(() => {
      this.refreshHUD();
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (this.unsubscribe) this.unsubscribe();
    });

    this.refreshHUD();
  }

  private createConsequenceGauges(width: number) {
    const barY = 56;
    const panelW = Math.min(width - 40, 560);

    // Background container
    this.gaugePanel = this.add.rectangle(width / 2, 58, panelW, 26, 0x161b22, 0.88)
      .setStrokeStyle(1, 0x30363d);

    // Gauge 1: Tectonic Weight
    this.weightLabel = this.add.text(0, barY, 'WEIGHT:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: '#f0883e'
    }).setOrigin(0, 0.5);

    this.weightBg = this.add.rectangle(0, barY, 130, 10, 0x21262d, 1).setOrigin(0, 0.5);
    this.weightBar = this.add.rectangle(0, barY, 20, 10, 0xf0883e, 1).setOrigin(0, 0.5);
    this.weightText = this.add.text(0, barY, '10%', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Gauge 2: Root Stability
    this.rootLabel = this.add.text(0, barY, 'ROOTS:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: '#7ee787'
    }).setOrigin(0, 0.5);

    this.rootBg = this.add.rectangle(0, barY, 130, 10, 0x21262d, 1).setOrigin(0, 0.5);
    this.rootBar = this.add.rectangle(0, barY, 100, 10, 0x22c55e, 1).setOrigin(0, 0.5);
    this.rootText = this.add.text(0, barY, '90%', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Gauge 3: Toxicity
    this.toxLabel = this.add.text(0, barY, 'TOXIC:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: '#a855f7'
    }).setOrigin(0, 0.5);

    this.toxBg = this.add.rectangle(0, barY, 115, 10, 0x21262d, 1).setOrigin(0, 0.5);
    this.toxBar = this.add.rectangle(0, barY, 15, 10, 0xa855f7, 1).setOrigin(0, 0.5);
    this.toxText = this.add.text(0, barY, '5%', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.layoutConsequenceGauges(width);
  }

  private layoutConsequenceGauges(width: number) {
    const barY = 58;
    const panelW = Math.min(width - 40, 560);
    this.gaugePanel.setSize(panelW, 26);
    this.gaugePanel.setPosition(width / 2, barY);

    const colW = panelW / 3;
    const labelW = 44;
    const barW = Math.min(95, colW - labelW - 14);
    const barH = 10;
    const groupW = labelW + 6 + barW;
    const halfGroup = groupW / 2;

    // Weight (left slot)
    const wCenter = (width / 2) - colW;
    const wStart = wCenter - halfGroup;
    this.weightLabel.setPosition(wStart, barY);
    this.weightBg.setSize(barW, barH).setPosition(wStart + labelW + 6, barY);
    this.weightBar.setPosition(wStart + labelW + 6, barY);
    this.weightText.setPosition(wStart + labelW + 6 + barW / 2, barY);

    // Roots (center slot)
    const rCenter = width / 2;
    const rStart = rCenter - halfGroup;
    this.rootLabel.setPosition(rStart, barY);
    this.rootBg.setSize(barW, barH).setPosition(rStart + labelW + 6, barY);
    this.rootBar.setPosition(rStart + labelW + 6, barY);
    this.rootText.setPosition(rStart + labelW + 6 + barW / 2, barY);

    // Toxic (right slot)
    const tCenter = (width / 2) + colW;
    const tStart = tCenter - halfGroup;
    this.toxLabel.setPosition(tStart, barY);
    this.toxBg.setSize(barW, barH).setPosition(tStart + labelW + 6, barY);
    this.toxBar.setPosition(tStart + labelW + 6, barY);
    this.toxText.setPosition(tStart + labelW + 6 + barW / 2, barY);
  }

  private createEventTicker(width: number, height: number) {
    this.bottomBg = this.add.rectangle(width / 2, height - 15, width, 30, 0x0d1117, 0.95)
      .setStrokeStyle(1.5, 0x30363d);

    this.tickerPrefix = this.add.text(14, height - 15, '⚡ LATEST RIPPLE:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: '#f59e0b'
    }).setOrigin(0, 0.5);

    this.logText = this.add.text(175, height - 15, 'Observing tectonic equilibrium...', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '12.5px',
      color: '#e6edf3',
      wordWrap: { width: Math.max(200, width - 195) }
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

  public handleResize(gameSize?: Phaser.Structs.Size) {
    const width = gameSize ? gameSize.width : this.scale.width;
    const height = gameSize ? gameSize.height : this.scale.height;

    // Top Bar
    this.topBar.setSize(width, 44).setPosition(width / 2, 22);

    const dayX = 14;
    this.dayText.setPosition(dayX, 22);

    const resX = 135;
    this.resText.setPosition(resX, 22);
    this.resText.setFontSize(width < 1200 ? '11.5px' : '13px');

    this.modeBtnBg.setPosition(width - 100, 22);
    this.modeBtnText.setPosition(width - 100, 22);

    this.restBtnBg.setPosition(width - 235, 22);
    this.restBtnText.setPosition(width - 235, 22);

    // Consequence Gauges
    this.layoutConsequenceGauges(width);

    // Event Ticker
    this.bottomBg.setSize(width, 30).setPosition(width / 2, height - 15);
    this.tickerPrefix.setPosition(14, height - 15);
    this.logText.setPosition(175, height - 15);
    this.logText.setWordWrapWidth(Math.max(200, width - 195));

    // End-Game Modal
    if (this.endOverlayContainer) {
      this.endOverlayContainer.setPosition(width / 2, height / 2);
    }

    this.refreshHUD();
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

  private getFormattedResources(width: number): string {
    const r = gameState.resources;
    if (width >= 1400) {
      return `💰 ${r.gold}   🌲 ${r.wood}   🪨 ${r.stone}   ⚙️ ${r.iron}   ✨ ${r.lumens}   💎 ${r.aetherCore}/1   🌾 ${r.food}   🔮 ${r.mana}   ⚔️ ${r.troops}   💜 ${r.demonShards}   👥 ${r.population}/${r.maxPopulation}`;
    } else if (width >= 1100) {
      return `💰 ${r.gold}  🌲 ${r.wood}  🪨 ${r.stone}  ⚙️ ${r.iron}  ✨ ${r.lumens}  💎 ${r.aetherCore}/1  🌾 ${r.food}  🔮 ${r.mana}  ⚔️ ${r.troops}  💜 ${r.demonShards}  👥 ${r.population}/${r.maxPopulation}`;
    } else if (width >= 860) {
      return `💰${r.gold} 🌲${r.wood} 🪨${r.stone} ⚙️${r.iron} ✨${r.lumens} 💎${r.aetherCore}/1 🌾${r.food} 🔮${r.mana} ⚔️${r.troops} 👥${r.population}/${r.maxPopulation}`;
    } else {
      return `💰${r.gold} 🌲${r.wood} 🪨${r.stone} ⚙️${r.iron} 👥${r.population}/${r.maxPopulation}`;
    }
  }

  private refreshHUD() {
    const { width } = this.scale;

    this.dayText.setText(`DAY ${gameState.day} [${gameState.militaryRank.toUpperCase()}]`);
    if (gameState.militaryRank === 'king') {
      this.dayText.setColor('#fbbf24');
    } else if (gameState.militaryRank === 'captain') {
      this.dayText.setColor('#38bdf8');
    } else {
      this.dayText.setColor('#e2e8f0');
    }

    // Update resources string with spacious responsive spacing
    this.resText.setText(this.getFormattedResources(width));

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
    const barW = this.weightBg ? this.weightBg.width : 130;

    // Weight
    if (this.weightBar) {
      this.weightBar.width = Math.max(4, (m.tectonicWeight / 100) * barW);
      this.weightText.setText(`${Math.round(m.tectonicWeight)}%`);
      this.weightBar.setFillStyle(m.tectonicWeight > 65 ? 0xef4444 : m.tectonicWeight > 35 ? 0xf59e0b : 0x38bdf8);
    }

    // Roots
    if (this.rootBar) {
      this.rootBar.width = Math.max(4, (m.rootIntegrity / 100) * barW);
      this.rootText.setText(`${Math.round(m.rootIntegrity)}%`);
      this.rootBar.setFillStyle(m.rootIntegrity < 40 ? 0xef4444 : m.rootIntegrity < 70 ? 0xf59e0b : 0x22c55e);
    }

    // Toxicity
    if (this.toxBar && this.toxBg) {
      const toxW = this.toxBg.width;
      this.toxBar.width = Math.max(4, (m.toxicityLevel / 100) * toxW);
      this.toxText.setText(`${Math.round(m.toxicityLevel)}%`);
      this.toxBar.setFillStyle(m.toxicityLevel > 50 ? 0xef4444 : m.toxicityLevel > 25 ? 0xf59e0b : 0x38bdf8);
    }

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
    this.scale.off('resize', this.handleResize, this);
    if (this.unsubscribe) this.unsubscribe();
  }
}
