import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { BUILDINGS_CATALOG } from '../data/buildings';
import { BuildingId, GameMode } from '../types';
import { sounds } from '../audio/SoundEffects';

export class SurfaceScene extends Phaser.Scene {
  private selectedPlotId: number | null = null;
  private buildMenuContainer!: Phaser.GameObjects.Container;
  private plotSprites: Map<number, Phaser.GameObjects.Container> = new Map();
  private treesGroup!: Phaser.GameObjects.Group;
  private skyGraphics!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;
  private unsubscribe!: () => void;

  constructor() {
    super({ key: 'SurfaceScene' });
  }

  create() {
    gameState.currentMode = GameMode.SURFACE;

    // 1. Draw Sky & Mountain Background
    this.skyGraphics = this.add.graphics();
    this.drawSky();

    // 2. Draw Ground
    this.groundGraphics = this.add.graphics();
    this.drawGround();

    // 3. Decorative Clouds
    this.createClouds();

    // 4. Surface Trees (responsive to root integrity)
    this.treesGroup = this.add.group();
    this.updateTrees();

    // 5. Plots & Buildings
    this.renderPlots();

    // 6. Mine Shaft Entrance
    this.createMineShaftEntrance();

    // 7. Modal Build Menu (hidden by default)
    this.createBuildMenu();

    // 8. Subscribe to GameState changes
    this.unsubscribe = gameState.subscribe(() => {
      this.refreshSurfaceVisuals();
    });

    // Handle TAB key to toggle modes
    this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.transitionToCavern();
    });
  }

  private drawSky() {
    this.skyGraphics.clear();
    const { width, height } = this.scale;
    const tox = gameState.metrics.toxicityLevel;

    // If toxicity is high, sky becomes smoggy yellowish-brown
    const topColor = tox > 50 ? 0x78716c : 0x0284c7;
    const bottomColor = tox > 50 ? 0xa8a29e : 0xbae6fd;

    this.skyGraphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    this.skyGraphics.fillRect(0, 0, width, 400);

    // Sun / Smog orb
    const sunColor = tox > 50 ? 0xf97316 : 0xfef08a;
    this.skyGraphics.fillStyle(sunColor, 0.9);
    this.skyGraphics.fillCircle(120, 100, 36);

    // Distant mountain silhouettes
    this.skyGraphics.fillStyle(tox > 50 ? 0x44403c : 0x0369a1, 0.4);
    this.skyGraphics.beginPath();
    this.skyGraphics.moveTo(0, 400);
    this.skyGraphics.lineTo(150, 240);
    this.skyGraphics.lineTo(340, 380);
    this.skyGraphics.lineTo(520, 260);
    this.skyGraphics.lineTo(750, 390);
    this.skyGraphics.lineTo(950, 220);
    this.skyGraphics.lineTo(width, 400);
    this.skyGraphics.closePath();
    this.skyGraphics.fill();
  }

  private drawGround() {
    this.groundGraphics.clear();
    const { width, height } = this.scale;

    // Grass surface strip
    this.groundGraphics.fillStyle(0x15803d, 1);
    this.groundGraphics.fillRect(0, 390, width, 25);

    // Subterranean soil layers (visible underground cutaway)
    this.groundGraphics.fillStyle(0x78350f, 1);
    this.groundGraphics.fillRect(0, 415, width, 120);

    this.groundGraphics.fillStyle(0x334155, 1);
    this.groundGraphics.fillRect(0, 535, width, height - 535);

    // Cracks if Tectonic Weight is high
    const weight = gameState.metrics.tectonicWeight;
    if (weight > 30) {
      this.groundGraphics.lineStyle(2, 0xef4444, Math.min(1, weight / 80));
      for (let i = 80; i < width; i += 160) {
        this.groundGraphics.beginPath();
        this.groundGraphics.moveTo(i, 395);
        this.groundGraphics.lineTo(i + 15, 430);
        this.groundGraphics.lineTo(i + 5, 470);
        this.groundGraphics.stroke();
      }
    }
  }

  private createClouds() {
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(50, 950);
      const y = Phaser.Math.Between(40, 180);
      const cloud = this.add.ellipse(x, y, Phaser.Math.Between(70, 130), 30, 0xffffff, 0.6);
      this.tweens.add({
        targets: cloud,
        x: '+=120',
        duration: Phaser.Math.Between(18000, 30000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private updateTrees() {
    this.treesGroup.clear(true, true);
    const roots = gameState.metrics.rootIntegrity;
    const treeKey = roots > 40 ? 'tree_green' : 'tree_withered';

    // Spawn trees between plots
    const treePositions = [40, 185, 315, 445, 575, 705, 835];
    const treeCount = Math.ceil((roots / 100) * treePositions.length);

    for (let i = 0; i < treePositions.length; i++) {
      const posX = treePositions[i];
      if (i < treeCount) {
        const tree = this.add.image(posX, 365, treeKey);
        tree.setOrigin(0.5, 1);
        this.treesGroup.add(tree);
      }
    }
  }

  private renderPlots() {
    this.plotSprites.forEach(c => c.destroy());
    this.plotSprites.clear();

    gameState.plots.forEach(plot => {
      const container = this.add.container(plot.x, plot.y);

      // Plot base pad
      const pad = this.add.rectangle(0, 16, 68, 8, 0x475569, 0.8)
        .setStrokeStyle(1, 0x94a3b8);
      container.add(pad);

      if (plot.building) {
        const def = BUILDINGS_CATALOG[plot.building];
        const textureKey = this.getTextureForBuilding(plot.building);
        const bldgImg = this.add.image(0, -10, textureKey).setOrigin(0.5, 0.8);
        container.add(bldgImg);

        // Building Label
        const label = this.add.text(0, -56, def.name, {
          fontFamily: '"Rajdhani", sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#0f172acc',
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        container.add(label);

        // Click to demolish / inspect
        bldgImg.setInteractive({ useHandCursor: true });
        bldgImg.on('pointerdown', () => {
          this.showBuildingInspect(plot.id, def.name, def.consequenceSummary);
        });

      } else {
        // Empty Plot Button
        const plusBtn = this.add.rectangle(0, -14, 52, 44, 0x1e293b, 0.8)
          .setStrokeStyle(2, 0x38bdf8, 0.7);
        const plusText = this.add.text(0, -14, '+ BUILD', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#38bdf8'
        }).setOrigin(0.5);

        container.add([plusBtn, plusText]);

        plusBtn.setInteractive({ useHandCursor: true });
        plusBtn.on('pointerdown', () => {
          this.openBuildMenu(plot.id);
        });

        // Hover animation
        plusBtn.on('pointerover', () => plusBtn.setFillStyle(0x0369a1, 0.9));
        plusBtn.on('pointerout', () => plusBtn.setFillStyle(0x1e293b, 0.8));
      }

      this.plotSprites.set(plot.id, container);
    });
  }

  private getTextureForBuilding(id: BuildingId): string {
    switch (id) {
      case BuildingId.COTTAGE: return 'bldg_cottage';
      case BuildingId.TOWN_HALL: return 'bldg_town_hall';
      case BuildingId.LUMBER_MILL: return 'bldg_lumber_mill';
      case BuildingId.SMELTER: return 'bldg_smelter';
      case BuildingId.FESTIVAL_PLAZA: return 'bldg_festival';
      case BuildingId.ROOT_NURSERY: return 'bldg_nursery';
      case BuildingId.CANAL_FILTER: return 'bldg_canal';
      case BuildingId.ALCHEMIST_SHOP: return 'bldg_alchemist';
      case BuildingId.BLACKSMITH_FORGE: return 'bldg_blacksmith';
      case BuildingId.CASTLE_RAMPART: return 'bldg_rampart';
      case BuildingId.ROYAL_KEEP: return 'bldg_royal_keep';
      case BuildingId.GRAND_CITADEL: return 'bldg_grand_citadel';
      case BuildingId.SKY_MONUMENT: return 'bldg_monument';
    }
  }

  private createMineShaftEntrance() {
    const shaftX = 970;
    const shaftY = 360;

    const shaftGantry = this.add.rectangle(shaftX, shaftY - 20, 56, 90, 0x0f172a, 0.9)
      .setStrokeStyle(3, 0xf59e0b);
    const cage = this.add.image(shaftX, shaftY + 10, 'elevator').setScale(0.85);

    const sign = this.add.text(shaftX, shaftY - 60, '⛏️ DEEP MINE\n[CLICK / TAB]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#f59e0b',
      align: 'center',
      backgroundColor: '#000000bb',
      padding: { x: 4, y: 3 }
    }).setOrigin(0.5);

    shaftGantry.setInteractive({ useHandCursor: true });
    shaftGantry.on('pointerdown', () => this.transitionToCavern());
    cage.setInteractive({ useHandCursor: true });
    cage.on('pointerdown', () => this.transitionToCavern());

    // Pulsing glow animation on elevator entrance
    this.tweens.add({
      targets: [sign, cage],
      alpha: 0.75,
      yoyo: true,
      repeat: -1,
      duration: 1200
    });
  }

  private createBuildMenu() {
    this.buildMenuContainer = this.add.container(512, 320);
    this.buildMenuContainer.setVisible(false);
    this.buildMenuContainer.setDepth(100);

    // Modal Background overlay
    const modalBg = this.add.rectangle(0, 0, 780, 480, 0x0d1117, 0.96)
      .setStrokeStyle(2, 0x30363d);
    
    // Header
    const title = this.add.text(0, -210, 'CIVIC EXPANSION & UNEXPECTED CONSEQUENCES', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#f0883e'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(360, -215, '✕ CLOSE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ef4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeBuildMenu());

    this.buildMenuContainer.add([modalBg, title, closeBtn]);
  }

  private openBuildMenu(plotId: number) {
    this.selectedPlotId = plotId;
    this.buildMenuContainer.setVisible(true);

    // Remove old cards
    const children = this.buildMenuContainer.getAll();
    for (let i = children.length - 1; i >= 3; i--) {
      children[i].destroy();
    }

    // Build building option cards
    const bldgs = Object.values(BUILDINGS_CATALOG);
    bldgs.forEach((def, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const cardX = -280 + col * 186;
      const cardY = -120 + row * 180;

      const card = this.add.container(cardX, cardY);
      const canAfford = gameState.canAfford(def.cost);

      const cardBg = this.add.rectangle(0, 0, 175, 160, canAfford ? 0x161b22 : 0x0d1117, 0.9)
        .setStrokeStyle(1.5, canAfford ? 0x38bdf8 : 0x484f58);

      const name = this.add.text(0, -66, def.name, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: canAfford ? '#f0883e' : '#6e7681'
      }).setOrigin(0.5);

      // Cost text
      const costParts = [];
      if (def.cost.gold) costParts.push(`${def.cost.gold}G`);
      if (def.cost.wood) costParts.push(`${def.cost.wood}W`);
      if (def.cost.stone) costParts.push(`${def.cost.stone}S`);
      if (def.cost.iron) costParts.push(`${def.cost.iron}Fe`);
      if (def.cost.aetherCore) costParts.push(`${def.cost.aetherCore} Core`);

      const costText = this.add.text(0, -48, `Cost: ${costParts.join(' ')}`, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '11px',
        color: canAfford ? '#7ee787' : '#f85149'
      }).setOrigin(0.5);

      const benefitText = this.add.text(0, -28, def.benefits, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '10px',
        color: '#58a6ff',
        align: 'center',
        wordWrap: { width: 165 }
      }).setOrigin(0.5);

      // Consequence warning box
      const consBox = this.add.rectangle(0, 24, 165, 54, 0x21262d, 0.95)
        .setStrokeStyle(1, 0xf59e0b);
      const consTitle = this.add.text(0, 4, '⚡ UNINTENDED RIPPLE:', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#f59e0b'
      }).setOrigin(0.5);
      const consDesc = this.add.text(0, 32, def.consequenceSummary, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '9px',
        color: '#e6edf3',
        align: 'center',
        wordWrap: { width: 160 }
      }).setOrigin(0.5);

      // Construct button
      const constructBtn = this.add.rectangle(0, 64, 140, 22, canAfford ? 0x238636 : 0x21262d, 1)
        .setStrokeStyle(1, canAfford ? 0x2ea043 : 0x30363d);
      const btnText = this.add.text(0, 64, canAfford ? 'CONSTRUCT' : 'LACK RESOURCES', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: canAfford ? '#ffffff' : '#6e7681'
      }).setOrigin(0.5);

      if (canAfford) {
        constructBtn.setInteractive({ useHandCursor: true });
        constructBtn.on('pointerdown', () => {
          if (this.selectedPlotId !== null) {
            gameState.build(this.selectedPlotId, def.id);
            this.closeBuildMenu();
          }
        });
        constructBtn.on('pointerover', () => constructBtn.setFillStyle(0x2ea043));
        constructBtn.on('pointerout', () => constructBtn.setFillStyle(0x238636));
      }

      card.add([cardBg, name, costText, benefitText, consBox, consTitle, consDesc, constructBtn, btnText]);
      this.buildMenuContainer.add(card);
    });
  }

  private closeBuildMenu() {
    this.selectedPlotId = null;
    this.buildMenuContainer.setVisible(false);
  }

  private showBuildingInspect(plotId: number, name: string, consequence: string) {
    this.selectedPlotId = plotId;
    this.buildMenuContainer.setVisible(true);

    const children = this.buildMenuContainer.getAll();
    for (let i = children.length - 1; i >= 3; i--) {
      children[i].destroy();
    }

    const panel = this.add.container(0, 0);
    const box = this.add.rectangle(0, 0, 480, 260, 0x161b22, 1)
      .setStrokeStyle(2, 0xf0883e);

    const title = this.add.text(0, -90, `STRUCTURE: ${name.toUpperCase()}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#f0883e'
    }).setOrigin(0.5);

    const desc = this.add.text(0, -30, `Active Subterranean Consequence:\n${consequence}`, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '14px',
      color: '#e6edf3',
      align: 'center',
      wordWrap: { width: 440 }
    }).setOrigin(0.5);

    const demoBtn = this.add.rectangle(0, 50, 180, 36, 0xda3633, 1)
      .setStrokeStyle(1, 0xf85149)
      .setInteractive({ useHandCursor: true });

    const demoText = this.add.text(0, 50, 'DEMOLISH BUILDING', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#ffffff'
    }).setOrigin(0.5);

    demoBtn.on('pointerdown', () => {
      gameState.demolish(plotId);
      this.closeBuildMenu();
    });

    panel.add([box, title, desc, demoBtn, demoText]);
    this.buildMenuContainer.add(panel);
  }

  public transitionToCavern() {
    sounds.playElevator();
    this.cameras.main.pan(970, 700, 600, 'Power2');
    this.cameras.main.fade(600, 0, 0, 0, false, (_cam: unknown, progress: number) => {
      if (progress === 1) {
        this.scene.sleep('SurfaceScene');
        if (this.scene.isSleeping('CavernScene')) {
          this.scene.wake('CavernScene');
        } else {
          this.scene.launch('CavernScene');
        }
      }
    });
  }

  public refreshSurfaceVisuals() {
    this.drawSky();
    this.drawGround();
    this.updateTrees();
    this.renderPlots();
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}
