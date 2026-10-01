import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { BUILDINGS_CATALOG } from '../data/buildings';
import { BuildingId, GameMode } from '../types';
import { sounds } from '../audio/SoundEffects';

interface WalkingCitizen {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  minX: number;
  maxX: number;
  direction: number;
  bobTimer: number;
}

export class SurfaceScene extends Phaser.Scene {
  private selectedPlotId: number | null = null;
  private buildMenuContainer!: Phaser.GameObjects.Container;
  private plotSprites: Map<number, Phaser.GameObjects.Container> = new Map();
  private treesGroup!: Phaser.GameObjects.Group;
  private skyGraphics!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;
  private cloudsGroup!: Phaser.GameObjects.Group;
  private streetDecorationsGroup!: Phaser.GameObjects.Group;
  private mineShaftContainer!: Phaser.GameObjects.Container;
  private citizens: WalkingCitizen[] = [];
  private unsubscribe!: () => void;
  private lastKnownDay: number = 1;

  constructor() {
    super({ key: 'SurfaceScene' });
  }

  create() {
    gameState.currentMode = GameMode.SURFACE;
    this.lastKnownDay = gameState.day;

    const { width, height } = this.scale;

    // Reset camera effects and ensure visibility
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.centerOn(width / 2, height / 2);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 1. Draw Sky & Mountain Background
    this.skyGraphics = this.add.graphics();
    this.drawSky();

    // 2. Draw 2.5D Ground with Length and Breadth (Depth)
    this.groundGraphics = this.add.graphics();
    this.drawGround();

    // 3. Decorative Clouds
    this.cloudsGroup = this.add.group();
    this.createClouds();

    // 4. Street Decorations (Lamps, Fountains, Flowerbeds)
    this.streetDecorationsGroup = this.add.group();

    // 5. Surface Trees (responsive to root integrity with depth sorting)
    this.treesGroup = this.add.group();

    // 6. Plots & Buildings across Length and Breadth
    this.renderPlots();

    // 7. Update trees and village street decorations
    this.updateTrees();
    this.createStreetDecorations();

    // 8. Living Village Citizens strolling across length & breadth
    this.createLivingCitizens();

    // 9. 2.5D Headframe Mine Shaft Entrance
    this.createMineShaftEntrance();

    // 10. Modal Build Menu (hidden by default)
    this.createBuildMenu();

    // 11. Handle Window Resize
    this.scale.on('resize', this.handleResize, this);

    // 12. Subscribe to GameState changes
    this.unsubscribe = gameState.subscribe(() => {
      this.refreshSurfaceVisuals();
    });

    // Scene lifecycle listeners
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      const { width: currentW, height: currentH } = this.scale;
      this.cameras.main.resetFX();
      this.cameras.main.setAlpha(1);
      this.cameras.main.centerOn(currentW / 2, currentH / 2);
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.refreshSurfaceVisuals();
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (this.unsubscribe) this.unsubscribe();
    });

    // Handle TAB key to toggle modes
    this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.transitionToCavern();
    });
  }

  update(_time: number, delta: number) {
    // Animate walking citizens along the village avenues
    for (const c of this.citizens) {
      c.sprite.x += c.direction * c.speed * (delta / 16);
      c.bobTimer += delta * 0.008;
      c.sprite.y = c.sprite.depth + Math.sin(c.bobTimer * 8) * 1.5;

      if (c.sprite.x > c.maxX) {
        c.sprite.x = c.maxX;
        c.direction = -1;
        c.sprite.setFlipX(true);
      } else if (c.sprite.x < c.minX) {
        c.sprite.x = c.minX;
        c.direction = 1;
        c.sprite.setFlipX(false);
      }
    }
  }

  private getGroundY(): number {
    const { height } = this.scale;
    // Base horizon line where the 2.5D floor begins receding towards the horizon
    return Math.min(height - 240, Math.max(300, Math.round(height * 0.44)));
  }

  private drawSky() {
    this.skyGraphics.clear();
    const { width } = this.scale;
    const groundY = this.getGroundY();
    const tox = gameState.metrics.toxicityLevel;

    // Sky gradient
    const topColor = tox > 50 ? 0x78716c : 0x0284c7;
    const bottomColor = tox > 50 ? 0xa8a29e : 0xbae6fd;

    this.skyGraphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    this.skyGraphics.fillRect(0, 0, width, groundY);

    // Sun / Smog orb
    const sunColor = tox > 50 ? 0xf97316 : 0xfef08a;
    this.skyGraphics.fillStyle(sunColor, 0.9);
    this.skyGraphics.fillCircle(Math.min(130, width * 0.12), Math.min(90, groundY * 0.28), 34);

    // Distant mountain silhouettes dynamically generated across width
    this.skyGraphics.fillStyle(tox > 50 ? 0x44403c : 0x0369a1, 0.4);
    this.skyGraphics.beginPath();
    this.skyGraphics.moveTo(0, groundY);

    const mountainStep = Math.max(110, width / 8);
    let isHigh = false;
    for (let x = 0; x <= width + mountainStep; x += mountainStep) {
      const peakY = isHigh ? groundY - 120 : groundY - 45;
      this.skyGraphics.lineTo(Math.min(x, width), peakY);
      isHigh = !isHigh;
    }

    this.skyGraphics.lineTo(width, groundY);
    this.skyGraphics.closePath();
    this.skyGraphics.fill();
  }

  /**
   * Constructs an authentic 2.5D village floor with true Length and Breadth (Depth):
   * - Upper Royal Terrace (depth Y ~ groundY to groundY + 70)
   * - Middle Artisan Boulevard (depth Y ~ groundY + 70 to groundY + 160)
   * - Lower Commons & Market Promenade (depth Y ~ groundY + 160 to groundY + 250)
   * - Subterranean rock strata cutaway below the surface floor
   */
  private drawGround() {
    this.groundGraphics.clear();
    const { width, height } = this.scale;
    const groundY = this.getGroundY();

    // ----------------------------------------------------
    // 1. UPPER ROYAL TERRACE (Back Row - Depth Plane 1)
    // ----------------------------------------------------
    // Terrace lawn background
    this.groundGraphics.fillStyle(0x166534, 1);
    this.groundGraphics.fillRect(0, groundY, width, 75);

    // Paved stone plaza strip
    this.groundGraphics.fillStyle(0x475569, 1);
    this.groundGraphics.fillRect(40, groundY + 12, width - 180, 52);

    // Upper Terrace stone retaining wall (creates 3D elevation step down to middle tier)
    this.groundGraphics.fillStyle(0x1e293b, 1);
    this.groundGraphics.fillRect(0, groundY + 70, width, 14);
    this.groundGraphics.fillStyle(0x334155, 1);
    this.groundGraphics.fillRect(0, groundY + 70, width, 4); // Wall capping

    // Balustrade piers along upper terrace edge
    this.groundGraphics.fillStyle(0x64748b, 1);
    for (let bx = 30; bx < width - 160; bx += 85) {
      this.groundGraphics.fillRect(bx, groundY + 62, 10, 12);
    }

    // ----------------------------------------------------
    // 2. MIDDLE ARTISAN BOULEVARD (Middle Row - Depth Plane 2)
    // ----------------------------------------------------
    // Cobblestone avenue spanning length and breadth
    this.groundGraphics.fillStyle(0x15803d, 1);
    this.groundGraphics.fillRect(0, groundY + 84, width, 85);

    // Main paved road with perspective sidewalk borders
    this.groundGraphics.fillStyle(0x334155, 0.95);
    this.groundGraphics.fillRect(20, groundY + 98, width - 160, 60);

    // Diagonal cobblestone ramps connecting Upper Terrace to Middle Boulevard
    this.groundGraphics.fillStyle(0x475569, 1);
    this.groundGraphics.beginPath();
    this.groundGraphics.moveTo(width * 0.28, groundY + 70);
    this.groundGraphics.lineTo(width * 0.36, groundY + 70);
    this.groundGraphics.lineTo(width * 0.38, groundY + 102);
    this.groundGraphics.lineTo(width * 0.26, groundY + 102);
    this.groundGraphics.closePath();
    this.groundGraphics.fill();

    this.groundGraphics.beginPath();
    this.groundGraphics.moveTo(width * 0.62, groundY + 70);
    this.groundGraphics.lineTo(width * 0.70, groundY + 70);
    this.groundGraphics.lineTo(width * 0.72, groundY + 102);
    this.groundGraphics.lineTo(width * 0.60, groundY + 102);
    this.groundGraphics.closePath();
    this.groundGraphics.fill();

    // Middle tier retaining curb
    this.groundGraphics.fillStyle(0x1e293b, 1);
    this.groundGraphics.fillRect(0, groundY + 165, width, 12);
    this.groundGraphics.fillStyle(0x475569, 1);
    this.groundGraphics.fillRect(0, groundY + 165, width, 3);

    // ----------------------------------------------------
    // 3. LOWER COMMONS & MARKET PROMENADE (Front Row - Depth Plane 3)
    // ----------------------------------------------------
    // Broad foreground floor plane extending forward
    this.groundGraphics.fillStyle(0x166534, 1);
    this.groundGraphics.fillRect(0, groundY + 177, width, 90);

    // Wide cobblestone market square
    this.groundGraphics.fillStyle(0x374151, 1);
    this.groundGraphics.fillRect(15, groundY + 185, width - 150, 72);

    // Isometric perspective paving grid lines on lower plaza (shows true floor breadth)
    this.groundGraphics.lineStyle(1, 0x4b5563, 0.45);
    for (let x = 15; x < width - 150; x += 55) {
      this.groundGraphics.lineBetween(x, groundY + 185, x + 35, groundY + 257);
    }
    for (let y = groundY + 185; y <= groundY + 257; y += 24) {
      this.groundGraphics.lineBetween(15, y, width - 150, y);
    }

    // ----------------------------------------------------
    // 4. SUBTERRANEAN SOIL CUTAWAY & TECTONIC STRATA
    // ----------------------------------------------------
    const cutawayY = groundY + 267;
    // Soil layer
    this.groundGraphics.fillStyle(0x78350f, 1);
    this.groundGraphics.fillRect(0, cutawayY, width, 65);

    // Deep bedrock
    this.groundGraphics.fillStyle(0x1e293b, 1);
    this.groundGraphics.fillRect(0, cutawayY + 65, width, Math.max(0, height - (cutawayY + 65)));

    // Tectonic Stress Cracks radiating if weight is elevated
    const weight = gameState.metrics.tectonicWeight;
    if (weight > 25) {
      this.groundGraphics.lineStyle(2, 0xef4444, Math.min(1, weight / 75));
      for (let i = 60; i < width - 60; i += 160) {
        this.groundGraphics.beginPath();
        this.groundGraphics.moveTo(i, cutawayY - 4);
        this.groundGraphics.lineTo(i + 18, cutawayY + 25);
        this.groundGraphics.lineTo(i + 6, cutawayY + 58);
        this.groundGraphics.stroke();
      }
    }
  }

  private createClouds() {
    this.cloudsGroup.clear(true, true);
    const { width } = this.scale;
    const groundY = this.getGroundY();
    const cloudCount = Math.max(3, Math.min(6, Math.floor(width / 280)));

    for (let i = 0; i < cloudCount; i++) {
      const x = Phaser.Math.Between(40, width - 40);
      const y = Phaser.Math.Between(40, Math.max(60, groundY * 0.42));
      const cloud = this.add.ellipse(x, y, Phaser.Math.Between(75, 135), 26, 0xffffff, 0.65);
      this.cloudsGroup.add(cloud);

      this.tweens.add({
        targets: cloud,
        x: `+=${Phaser.Math.Between(70, 130)}`,
        duration: Phaser.Math.Between(18000, 32000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Distributes plots across the 3 depth tiers of the village (Length and Breadth):
   * Row 0: Upper Royal Terrace (Back)
   * Row 1: Middle Artisan Boulevard (Mid)
   * Row 2: Lower Commons & Market (Front)
   */
  private syncPlotsLayout() {
    const { width } = this.scale;
    const groundY = this.getGroundY();

    // Define 3 depth rows with distinct Y coordinates (breadth)
    const rowY = [
      groundY + 38,   // Row 0 (Upper Terrace - Back)
      groundY + 128,  // Row 1 (Middle Boulevard - Mid)
      groundY + 218   // Row 2 (Lower Commons - Front)
    ];

    // Determine plots per row based on screen width
    const plotsPerRow = width < 1100 ? 3 : width < 1500 ? 4 : 5;
    const targetTotal = plotsPerRow * 3;

    // Ensure state has enough plot records
    while (gameState.plots.length < targetTotal) {
      const newId = gameState.plots.length;
      gameState.plots.push({ id: newId, x: 0, y: 0, building: null });
    }

    const availableWidth = width - 210; // Reserve right side for quarry headframe elevator
    const startX = Math.max(60, Math.round(width * 0.05));
    const stepX = (availableWidth - startX) / (plotsPerRow - 0.5);

    let idx = 0;
    for (let r = 0; r < 3; r++) {
      const rowOffset = (r % 2 === 1) ? stepX * 0.25 : 0; // Stagger rows for better visibility & depth
      for (let c = 0; c < plotsPerRow; c++) {
        if (idx < gameState.plots.length) {
          gameState.plots[idx].x = Math.round(startX + rowOffset + c * stepX);
          gameState.plots[idx].y = rowY[r];
          idx++;
        }
      }
    }
  }

  private updateTrees() {
    this.treesGroup.clear(true, true);
    const roots = gameState.metrics.rootIntegrity;
    const treeKey = roots > 40 ? 'tree_green' : 'tree_withered';
    const groundY = this.getGroundY();
    const { width } = this.scale;

    // Place trees at distinct depth planes along the village borders
    const treeSpots: { x: number; y: number }[] = [
      // Upper Terrace tree line
      { x: 30, y: groundY + 45 },
      { x: width * 0.24, y: groundY + 40 },
      { x: width * 0.50, y: groundY + 40 },
      { x: width * 0.74, y: groundY + 45 },

      // Middle Boulevard greenery
      { x: 25, y: groundY + 130 },
      { x: width * 0.44, y: groundY + 125 },

      // Foreground garden trees
      { x: 20, y: groundY + 225 },
      { x: width - 170, y: groundY + 220 }
    ];

    const maxTrees = Math.ceil((roots / 100) * treeSpots.length);
    for (let i = 0; i < maxTrees && i < treeSpots.length; i++) {
      const spot = treeSpots[i];
      const tree = this.add.image(spot.x, spot.y, treeKey);
      tree.setOrigin(0.5, 0.95);
      tree.setDepth(spot.y);
      this.treesGroup.add(tree);
    }
  }

  private createStreetDecorations() {
    this.streetDecorationsGroup.clear(true, true);
    const groundY = this.getGroundY();
    const { width } = this.scale;

    // Lampposts placed along middle avenue and lower plaza
    const lampSpots: { x: number; y: number }[] = [
      { x: width * 0.18, y: groundY + 135 },
      { x: width * 0.42, y: groundY + 135 },
      { x: width * 0.68, y: groundY + 135 },
      { x: width * 0.30, y: groundY + 228 },
      { x: width * 0.58, y: groundY + 228 }
    ];

    lampSpots.forEach(spot => {
      // Warm circular light halo on the ground
      const halo = this.add.ellipse(spot.x, spot.y + 12, 42, 16, 0xfef08a, 0.22);
      halo.setDepth(spot.y - 1);

      const lamp = this.add.image(spot.x, spot.y, 'street_lamp_post');
      lamp.setOrigin(0.5, 0.92);
      lamp.setDepth(spot.y);

      this.streetDecorationsGroup.add(halo);
      this.streetDecorationsGroup.add(lamp);
    });
  }

  private createLivingCitizens() {
    this.citizens.forEach(c => c.sprite.destroy());
    this.citizens = [];

    const groundY = this.getGroundY();
    const { width } = this.scale;

    // Citizens walking on different depth tiers (demonstrates length and breadth)
    const citizenConfigs = [
      { startX: width * 0.2, y: groundY + 52, minX: 50, maxX: width * 0.45, speed: 28 },
      { startX: width * 0.5, y: groundY + 142, minX: width * 0.25, maxX: width * 0.72, speed: 35 },
      { startX: width * 0.15, y: groundY + 235, minX: 40, maxX: width * 0.55, speed: 32 },
      { startX: width * 0.65, y: groundY + 235, minX: width * 0.4, maxX: width - 180, speed: 30 }
    ];

    citizenConfigs.forEach((cfg, idx) => {
      const sprite = this.add.image(cfg.startX, cfg.y, 'citizen_walk');
      sprite.setOrigin(0.5, 0.95);
      sprite.setDepth(cfg.y);
      if (idx % 2 === 1) sprite.setFlipX(true);

      this.citizens.push({
        sprite,
        speed: cfg.speed,
        minX: cfg.minX,
        maxX: cfg.maxX,
        direction: idx % 2 === 1 ? -1 : 1,
        bobTimer: idx * 1.5
      });
    });
  }

  /**
   * Renders building plots onto isometric foundation pads with 3D depth,
   * chimney smoke puffs, and strict depth-sorting (back to front).
   */
  private renderPlots() {
    this.syncPlotsLayout();

    this.plotSprites.forEach(c => c.destroy());
    this.plotSprites.clear();

    gameState.plots.forEach(plot => {
      const container = this.add.container(plot.x, plot.y);
      // Depth sorting based on Y coordinate ensures true breadth occlusions!
      container.setDepth(plot.y);

      // 1. Isometric Plot Foundation Pad (Shows length and breadth on the floor)
      const isoPad = this.add.image(0, 16, 'iso_plot_pad');
      container.add(isoPad);

      if (plot.building) {
        const def = BUILDINGS_CATALOG[plot.building];
        const textureKey = this.getTextureForBuilding(plot.building);

        // 2. 2.5D Building Sprite sitting on foundation pad
        const bldgImg = this.add.image(0, -6, textureKey).setOrigin(0.5, 0.85);
        container.add(bldgImg);

        // 3. Gentle animated chimney smoke puffs
        this.createChimneySmoke(container);

        // 4. Glassmorphism Building Name Badge
        const label = this.add.text(0, -56, def.name, {
          fontFamily: '"Rajdhani", sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#0f172acc',
          padding: { x: 5, y: 2 }
        }).setOrigin(0.5);
        container.add(label);

        // Click building to demolish / inspect
        bldgImg.setInteractive({ useHandCursor: true });
        bldgImg.on('pointerdown', () => {
          this.showBuildingInspect(plot.id, def.name, def.consequenceSummary);
        });

      } else {
        // Empty Plot Construction Marker with length & breadth footprint
        const hoverOutline = this.add.ellipse(0, 15, 64, 26, 0x00f5ff, 0.15)
          .setStrokeStyle(1.5, 0x38bdf8, 0.7);

        const plusBtn = this.add.rectangle(0, -6, 56, 32, 0x0f172a, 0.9)
          .setStrokeStyle(1.5, 0x38bdf8, 0.8);
        const plusText = this.add.text(0, -6, '+ BUILD', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7.5px',
          color: '#38bdf8'
        }).setOrigin(0.5);

        container.add([hoverOutline, plusBtn, plusText]);

        plusBtn.setInteractive({ useHandCursor: true });
        plusBtn.on('pointerdown', () => {
          this.openBuildMenu(plot.id);
        });

        plusBtn.on('pointerover', () => {
          plusBtn.setFillStyle(0x0284c7, 0.95);
          hoverOutline.setFillStyle(0x00f5ff, 0.3);
        });
        plusBtn.on('pointerout', () => {
          plusBtn.setFillStyle(0x0f172a, 0.9);
          hoverOutline.setFillStyle(0x00f5ff, 0.15);
        });
      }

      this.plotSprites.set(plot.id, container);
    });
  }

  private createChimneySmoke(container: Phaser.GameObjects.Container) {
    const smokeTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1400, 2200),
      loop: true,
      callback: () => {
        if (!container.active) {
          smokeTimer.remove();
          return;
        }
        const puff = this.add.circle(10, -48, Phaser.Math.Between(3, 5), 0xe2e8f0, 0.6);
        container.add(puff);

        this.tweens.add({
          targets: puff,
          y: -75,
          x: '+=12',
          alpha: 0,
          scale: 1.8,
          duration: 1600,
          ease: 'Sine.easeOut',
          onComplete: () => puff.destroy()
        });
      }
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

  /**
   * Re-engineered 2.5D timber mine headframe with spinning hoist wheel,
   * descending ramp, ore carts, and glowing descent beacon.
   */
  private createMineShaftEntrance() {
    if (this.mineShaftContainer) this.mineShaftContainer.destroy();

    const { width } = this.scale;
    const groundY = this.getGroundY();
    const shaftX = width - 85;
    const shaftY = groundY + 115;

    this.mineShaftContainer = this.add.container(shaftX, shaftY);
    this.mineShaftContainer.setDepth(shaftY + 20);

    // Stone quarry foundation pit
    const pitPad = this.add.rectangle(0, 32, 90, 42, 0x1e293b, 1)
      .setStrokeStyle(2, 0xf59e0b);

    // Timber Headframe A-Frame Gantry
    const gantry = this.add.rectangle(0, -18, 64, 88, 0x0f172a, 0.95)
      .setStrokeStyle(3, 0x78350f);

    // Elevator Cage
    const cage = this.add.image(0, 10, 'elevator').setScale(0.9);

    // Spinning Hoist Wheel at the apex
    const wheel = this.add.circle(0, -56, 12, 0xf59e0b, 0.3)
      .setStrokeStyle(2, 0xf59e0b);
    this.tweens.add({
      targets: wheel,
      angle: 360,
      duration: 3500,
      repeat: -1,
      ease: 'Linear'
    });

    const sign = this.add.text(0, -82, '⛏️ DEEP CAVERN\n[CLICK / TAB]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: '#f59e0b',
      align: 'center',
      backgroundColor: '#000000dd',
      padding: { x: 5, y: 3 }
    }).setOrigin(0.5);

    gantry.setInteractive({ useHandCursor: true });
    gantry.on('pointerdown', () => this.transitionToCavern());
    cage.setInteractive({ useHandCursor: true });
    cage.on('pointerdown', () => this.transitionToCavern());

    this.mineShaftContainer.add([pitPad, gantry, cage, wheel, sign]);

    // Pulsing glow animation on elevator entrance
    this.tweens.add({
      targets: [sign, cage],
      alpha: 0.8,
      yoyo: true,
      repeat: -1,
      duration: 1200
    });
  }

  private createBuildMenu() {
    const { width, height } = this.scale;
    this.buildMenuContainer = this.add.container(width / 2, height / 2);
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
    const { width, height } = this.scale;
    this.buildMenuContainer.setPosition(width / 2, height / 2);
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
    const { width, height } = this.scale;
    this.buildMenuContainer.setPosition(width / 2, height / 2);
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
    const { width } = this.scale;
    const groundY = this.getGroundY();
    const shaftX = width - 85;

    this.cameras.main.pan(shaftX, groundY + 120, 500, 'Power2');
    this.cameras.main.fade(500, 0, 0, 0, false, (_cam: unknown, progress: number) => {
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

  public handleResize(gameSize?: Phaser.Structs.Size) {
    const width = gameSize ? gameSize.width : this.scale.width;
    const height = gameSize ? gameSize.height : this.scale.height;

    this.cameras.main.centerOn(width / 2, height / 2);
    this.refreshSurfaceVisuals();

    if (this.buildMenuContainer) {
      this.buildMenuContainer.setPosition(width / 2, height / 2);
    }
  }

  public refreshSurfaceVisuals() {
    this.drawSky();
    this.drawGround();
    this.renderPlots();
    this.updateTrees();
    this.createStreetDecorations();
    this.createLivingCitizens();
    this.createMineShaftEntrance();
  }

  destroy() {
    this.scale.off('resize', this.handleResize, this);
    if (this.unsubscribe) this.unsubscribe();
  }
}
