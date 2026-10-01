import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { GameMode, MiningNode } from '../types';
import { sounds } from '../audio/SoundEffects';

interface StalactiteHazard {
  sprite: Phaser.Physics.Arcade.Sprite;
  triggerX: number;
  hasFallen: boolean;
}

interface SkeletonKnight {
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  maxHp: number;
  patrolMinX: number;
  patrolMaxX: number;
  direction: number;
  lastAttackTime: number;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  isDead: boolean;
}

interface AbyssalPredator {
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  maxHp: number;
  patrolMinX: number;
  patrolMaxX: number;
  direction: number;
  lastLeapTime: number;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  isDead: boolean;
}

interface FireballProjectile {
  sprite: Phaser.Physics.Arcade.Sprite;
  vx: number;
  vy: number;
}

interface DragonBoss {
  sprite: Phaser.Physics.Arcade.Sprite;
  hp: number;
  maxHp: number;
  lastRoarTime: number;
  lastFireballTime: number;
  baseY: number;
  timeOffset: number;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  bossText: Phaser.GameObjects.Text;
  isDead: boolean;
}

export class CavernScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyMine!: Phaser.Input.Keyboard.Key;

  // Level Depths (1: Upper Caverns, 2: Sunken Crypts, 3: Abyssal Magma Lair)
  public currentDepthLevel: number = 1;
  private depthHudText!: Phaser.GameObjects.Text;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private crumblingPlatforms: Phaser.Physics.Arcade.Sprite[] = [];
  private ceilingGroup!: Phaser.GameObjects.Group;
  private stalactites: StalactiteHazard[] = [];
  private miningNodes: MiningNode[] = [];
  private nodeSprites: Map<MiningNode, Phaser.GameObjects.Container> = new Map();

  // Mining Excavation & Dynamic Terrain Changes
  private excavatedSockets: Phaser.GameObjects.Image[] = [];
  private rubblePiles: Phaser.Physics.Arcade.Sprite[] = [];
  private fissuresGraphics!: Phaser.GameObjects.Graphics;

  // Dungeon Portals & Navigation
  private elevator!: Phaser.Physics.Arcade.Sprite;
  private elevatorCable!: Phaser.GameObjects.Line;
  private elevatorPrompt!: Phaser.GameObjects.Text;
  private descentPortal: Phaser.Physics.Arcade.Sprite | null = null;
  private descentPrompt: Phaser.GameObjects.Text | null = null;
  private ascentPortal: Phaser.Physics.Arcade.Sprite | null = null;
  private ascentPrompt: Phaser.GameObjects.Text | null = null;

  // Fluid Hazard (Water / Acid / Magma)
  private fluidHazard!: Phaser.GameObjects.Rectangle;
  private fluidTopLine!: Phaser.GameObjects.Graphics;
  private fluidType: 'water' | 'acid' | 'magma' = 'water';

  // Dungeon Challenges & Enemies
  private skeletonKnights: SkeletonKnight[] = [];
  private abyssalPredators: AbyssalPredator[] = [];
  private dragonBoss: DragonBoss | null = null;
  private fireballs: FireballProjectile[] = [];

  private pickaxeSprite!: Phaser.GameObjects.Image;
  private isMining: boolean = false;
  private lastMineTime: number = 0;

  // Player Stats in Mine
  private playerHp: number = 100;
  private maxHp: number = 100;
  private isInvulnerable: boolean = false;
  private haulCount: number = 0;

  // Jump feel improvements
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;

  private backdropGraphics!: Phaser.GameObjects.Graphics;
  private unsubscribe!: () => void;

  constructor() {
    super({ key: 'CavernScene' });
  }

  private getWorldDimensions(): { width: number; height: number } {
    return {
      width: Math.max(this.scale.width, 1440),
      height: Math.max(this.scale.height, 900),
    };
  }

  create() {
    gameState.currentMode = GameMode.CAVERN;
    this.playerHp = 100;
    this.haulCount = 0;

    const { width: worldWidth, height: worldHeight } = this.getWorldDimensions();

    // 1. World Bounds & Gravity
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.physics.world.gravity.y = 900;

    // 2. Camera setup
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 3. Cavern Backdrop
    this.backdropGraphics = this.add.graphics();
    this.fissuresGraphics = this.add.graphics();
    this.drawCavernBackdrop(worldWidth, worldHeight);

    // 4. Platforms & Level Layout
    this.platforms = this.physics.add.staticGroup();
    this.buildDynamicCavernLevel(worldWidth, worldHeight);

    // 5. Ceiling & Stalactites
    this.ceilingGroup = this.add.group();
    this.buildDynamicCeiling(worldWidth);

    // 6. Bottom Pit Fluid (Water, Acid, or Magma based on Depth)
    this.buildDynamicFluidPool(worldWidth, worldHeight);

    // 7. Navigation Portals (Elevator, Descent, Ascent)
    this.setupLevelPortals(worldWidth, worldHeight);

    // 8. Player Setup
    this.createPlayer(worldWidth);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 9. Spawn Ores & Excavated Sockets
    this.spawnMiningNodes(worldWidth, worldHeight);

    // 10. Spawn Dungeon Challenges (Skeletons, Predators, Dragon)
    this.spawnDungeonEnemies(worldWidth, worldHeight);

    // 11. Depth HUD Banner
    this.createDepthHUD();

    // 12. Controls
    this.setupInput();

    // 13. Window Resize & Lifecycle
    this.scale.on('resize', this.handleResize, this);

    this.unsubscribe = gameState.subscribe(() => {
      this.syncConsequences();
    });

    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.cameras.main.resetFX();
      this.cameras.main.setAlpha(1);
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.resetCavernRun();
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (this.unsubscribe) this.unsubscribe();
      this.cleanUpEnemies();
    });

    this.announceActiveMutations();
  }

  private createDepthHUD() {
    if (this.depthHudText) this.depthHudText.destroy();

    const depthTitles = [
      '',
      'LEVEL 1: THE SHALLOW VEINS [100m]',
      'LEVEL 2: THE SUNKEN CRYPTS [300m]',
      'LEVEL 3: ABYSSAL DRAGON LAIR [600m]'
    ];
    const depthColors = ['', '#38bdf8', '#c084fc', '#f97316'];

    this.depthHudText = this.add.text(24, 60, depthTitles[this.currentDepthLevel], {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8.5px',
      color: depthColors[this.currentDepthLevel],
      backgroundColor: '#0a0f1dee',
      padding: { x: 8, y: 5 },
    }).setScrollFactor(0).setDepth(200);
  }

  private drawCavernBackdrop(worldWidth: number, worldHeight: number) {
    this.backdropGraphics.clear();

    if (this.currentDepthLevel === 1) {
      // Level 1: Dark Slate Cavern
      this.backdropGraphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x020617, 0x020617, 1);
    } else if (this.currentDepthLevel === 2) {
      // Level 2: Deep Purple Catacombs
      this.backdropGraphics.fillGradientStyle(0x1e1035, 0x1e1035, 0x070314, 0x070314, 1);
    } else {
      // Level 3: Infernal Volcanic Magma Chamber
      this.backdropGraphics.fillGradientStyle(0x450a0a, 0x450a0a, 0x180505, 0x180505, 1);
    }
    this.backdropGraphics.fillRect(0, 0, worldWidth, worldHeight);

    // Deep rock crags pattern
    const cragColor = this.currentDepthLevel === 3 ? 0x7f1d1d : 0x1e293b;
    this.backdropGraphics.fillStyle(cragColor, 0.45);
    const cragCount = Math.floor((worldWidth * worldHeight) / 22000);
    for (let i = 0; i < cragCount; i++) {
      const rx = Phaser.Math.Between(40, worldWidth - 120);
      const ry = Phaser.Math.Between(60, worldHeight - 80);
      const rw = Phaser.Math.Between(60, 220);
      const rh = Phaser.Math.Between(30, 90);
      this.backdropGraphics.fillRoundedRect(rx, ry, rw, rh, 8);
    }
  }

  private buildDynamicCavernLevel(worldWidth: number, worldHeight: number) {
    this.platforms.clear(true, true);
    this.crumblingPlatforms.forEach(p => p.destroy());
    this.crumblingPlatforms.length = 0;

    const roots = gameState.metrics.rootIntegrity;
    const isMud = roots < 40 && this.currentDepthLevel <= 2;
    const tileKey = this.currentDepthLevel === 3 ? 'tile_dirt' : isMud ? 'tile_mud' : 'tile_stone';

    const makeLedge = (x: number, y: number, widthInTiles: number, isCrumble = false) => {
      for (let i = 0; i < widthInTiles; i++) {
        const px = x + i * 32;
        if (isCrumble && isMud) {
          const p = this.physics.add.sprite(px + 16, y + 16, tileKey);
          p.setImmovable(true);
          (p.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
          this.crumblingPlatforms.push(p);
        } else {
          const p = this.platforms.create(px + 16, y + 16, tileKey);
          p.refreshBody();
        }
      }
    };

    const floorY = worldHeight - 50;

    if (this.currentDepthLevel === 1) {
      // Level 1: Upper Caverns (Entry Ledges & Wide Steps)
      makeLedge(worldWidth - 220, 130, 7);
      makeLedge(Math.round(worldWidth * 0.55), 180, 8);
      makeLedge(Math.round(worldWidth * 0.14), 210, 8);
      makeLedge(Math.round(worldWidth * 0.35), 320, 7, true);
      makeLedge(40, 360, 7);
      makeLedge(Math.round(worldWidth * 0.72), 370, 8, true);
      makeLedge(Math.round(worldWidth * 0.22), 480, 8);
      makeLedge(Math.round(worldWidth * 0.52), 500, 8);
    } else if (this.currentDepthLevel === 2) {
      // Level 2: Sunken Crypts (More fragmented, winding descents)
      makeLedge(worldWidth - 220, 130, 6);
      makeLedge(Math.round(worldWidth * 0.60), 200, 7);
      makeLedge(Math.round(worldWidth * 0.28), 240, 8, true);
      makeLedge(40, 330, 8);
      makeLedge(Math.round(worldWidth * 0.48), 360, 7);
      makeLedge(Math.round(worldWidth * 0.76), 390, 7, true);
      makeLedge(Math.round(worldWidth * 0.18), 490, 8);
      makeLedge(Math.round(worldWidth * 0.54), 510, 9);
    } else {
      // Level 3: Abyssal Magma Lair (Wide volcanic arena for Dragon combat)
      makeLedge(worldWidth - 220, 130, 7);
      makeLedge(Math.round(worldWidth * 0.45), 220, 12);
      makeLedge(Math.round(worldWidth * 0.10), 340, 9);
      makeLedge(Math.round(worldWidth * 0.65), 360, 9);
      makeLedge(Math.round(worldWidth * 0.32), 490, 14);
    }

    // Bottom solid ground flanking fluid pool
    const leftTiles = Math.ceil((worldWidth * 0.22) / 32);
    const rightStart = Math.round(worldWidth * 0.78);
    const rightTiles = Math.ceil((worldWidth - rightStart) / 32);

    makeLedge(0, floorY, leftTiles);
    makeLedge(rightStart, floorY, rightTiles);
  }

  private buildDynamicCeiling(worldWidth: number) {
    this.ceilingGroup.clear(true, true);
    this.stalactites.forEach(s => s.sprite.destroy());
    this.stalactites = [];

    const weight = gameState.metrics.tectonicWeight;
    const sagY = 20 + (weight / 100) * 55;

    for (let x = 0; x < worldWidth; x += 32) {
      const tile = this.add.image(x + 16, sagY - 10, weight > 50 ? 'tile_cracked_ceiling' : 'tile_stone');
      this.ceilingGroup.add(tile);
    }

    if (weight > 20 && this.currentDepthLevel <= 2) {
      const spikeCount = Math.floor(weight / 14);
      const positions: number[] = [];
      const step = worldWidth / (spikeCount + 2);
      for (let i = 1; i <= spikeCount; i++) {
        positions.push(Math.round(i * step));
      }

      for (const sx of positions) {
        const spike = this.physics.add.sprite(sx, sagY + 8, 'stalactite');
        spike.setImmovable(true);
        (spike.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        this.stalactites.push({
          sprite: spike,
          triggerX: sx,
          hasFallen: false,
        });
      }
    }
  }

  private buildDynamicFluidPool(worldWidth: number, worldHeight: number) {
    if (this.fluidHazard) this.fluidHazard.destroy();
    if (this.fluidTopLine) this.fluidTopLine.destroy();

    const tox = gameState.metrics.toxicityLevel;
    if (this.currentDepthLevel === 3) {
      this.fluidType = 'magma';
    } else {
      this.fluidType = tox >= 45 ? 'acid' : 'water';
    }

    const poolLeft = Math.round(worldWidth * 0.22);
    const poolRight = Math.round(worldWidth * 0.78);
    const poolWidth = poolRight - poolLeft;
    const poolCenterX = (poolLeft + poolRight) / 2;
    const floorY = worldHeight - 50;

    let fluidColor = 0x0284c7;
    let lineColor = 0x38bdf8;
    if (this.fluidType === 'acid') {
      fluidColor = 0x16a34a;
      lineColor = 0x4ade80;
    } else if (this.fluidType === 'magma') {
      fluidColor = 0xd97706;
      lineColor = 0xfbbf24;
    }

    this.fluidHazard = this.add.rectangle(poolCenterX, floorY + 40, poolWidth, 90, fluidColor, 0.85);
    this.physics.add.existing(this.fluidHazard, true);

    this.fluidTopLine = this.add.graphics();
    this.fluidTopLine.lineStyle(3, lineColor, 1);
    this.fluidTopLine.beginPath();
    this.fluidTopLine.moveTo(poolLeft, floorY);
    this.fluidTopLine.lineTo(poolRight, floorY);
    this.fluidTopLine.stroke();
  }

  /**
   * Sets up Elevator to Surface, Descent Portal to Deeper Levels,
   * and Ascent Portal to Return.
   */
  private setupLevelPortals(worldWidth: number, worldHeight: number) {
    // 1. Elevator to Surface (Level 1) or Ascent Ladder (Levels 2 and 3)
    const topX = worldWidth - 110;
    const topY = 95;

    if (this.elevator) this.elevator.destroy();
    if (this.elevatorCable) this.elevatorCable.destroy();
    if (this.elevatorPrompt) this.elevatorPrompt.destroy();
    if (this.ascentPortal) this.ascentPortal.destroy();
    if (this.ascentPrompt) this.ascentPrompt.destroy();

    if (this.currentDepthLevel === 1) {
      // Surface Elevator
      this.elevator = this.physics.add.sprite(topX, topY, 'elevator');
      this.elevator.setImmovable(true);
      (this.elevator.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

      this.elevatorCable = this.add.line(0, 0, topX, 0, topX, topY, 0xf59e0b, 0.8).setLineWidth(2);
      this.elevatorCable.setOrigin(0, 0);

      this.elevatorPrompt = this.add.text(topX, 45, 'SURFACE LIFT\n[W / TAB]', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#f59e0b',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      this.tweens.add({
        targets: this.elevatorPrompt,
        y: 40,
        yoyo: true,
        repeat: -1,
        duration: 1000,
      });
    } else {
      // Ascent Portal back to previous level
      this.ascentPortal = this.physics.add.sprite(topX, topY, 'descent_portal');
      this.ascentPortal.setImmovable(true);
      (this.ascentPortal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

      const targetLevel = this.currentDepthLevel - 1;
      this.ascentPrompt = this.add.text(topX, 45, `ASCEND TO LVL ${targetLevel}\n[W / UP]`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#38bdf8',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      this.tweens.add({
        targets: this.ascentPrompt,
        y: 40,
        yoyo: true,
        repeat: -1,
        duration: 1000,
      });
    }

    // 2. Descent Portal to Deeper Levels (Available in Level 1 & Level 2)
    if (this.descentPortal) this.descentPortal.destroy();
    if (this.descentPrompt) this.descentPrompt.destroy();

    if (this.currentDepthLevel < 3) {
      const bottomX = worldWidth - 110;
      const bottomY = worldHeight - 85;

      this.descentPortal = this.physics.add.sprite(bottomX, bottomY, 'descent_portal');
      this.descentPortal.setImmovable(true);
      (this.descentPortal.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

      const nextLevel = this.currentDepthLevel + 1;
      const nextTitle = nextLevel === 2 ? 'SUNKEN CRYPTS' : 'DRAGON LAIR';
      this.descentPrompt = this.add.text(bottomX, bottomY - 38, `DESCEND: ${nextTitle}\n[S / DOWN]`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#c084fc',
        align: 'center',
        backgroundColor: '#000000cc',
        padding: { x: 5, y: 3 },
      }).setOrigin(0.5);

      this.tweens.add({
        targets: this.descentPrompt,
        y: bottomY - 42,
        yoyo: true,
        repeat: -1,
        duration: 900,
      });
    }
  }

  private createPlayer(worldWidth: number) {
    const spawnX = worldWidth - 130;
    const spawnY = 80;

    if (!this.player) {
      this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
      this.player.setCollideWorldBounds(true);
      this.player.setBounce(0.05);

      this.pickaxeSprite = this.add.image(this.player.x + 12, this.player.y, 'pickaxe')
        .setOrigin(0.2, 0.8)
        .setScale(0.85);

      this.physics.add.collider(this.player, this.platforms, () => {
        this.coyoteTimer = 100;
      });

      this.physics.add.collider(this.player, this.crumblingPlatforms, (_p, platform) => {
        this.coyoteTimer = 100;
        this.handleCrumbleTouch(platform as Phaser.Physics.Arcade.Sprite);
      });
    } else {
      this.player.setPosition(spawnX, spawnY);
      this.player.setVelocity(0, 0);
    }

    const roots = gameState.metrics.rootIntegrity;
    this.player.setDragX(roots < 40 && this.currentDepthLevel <= 2 ? 250 : 1200);
  }

  /**
   * Spawns mining nodes customized by Depth Level.
   * Checks persistent mined node records to leave excavated sockets!
   */
  private spawnMiningNodes(worldWidth: number, _worldHeight: number) {
    this.nodeSprites.forEach(c => c.destroy());
    this.nodeSprites.clear();
    this.miningNodes = [];
    this.excavatedSockets.forEach(s => s.destroy());
    this.excavatedSockets = [];

    const minedKeys = new Set(gameState.minedNodeKeys[this.currentDepthLevel] || []);

    let nodeDefs: (Omit<MiningNode, 'hp'> & { id: string })[] = [];

    if (this.currentDepthLevel === 1) {
      // Level 1: Coal & Stone & Light Lumens
      nodeDefs = [
        { id: 'l1_n1', x: Math.round(worldWidth * 0.16), y: 178, type: 'coal', maxHp: 3, yieldAmount: 20, resourceKey: 'gold' },
        { id: 'l1_n2', x: Math.round(worldWidth * 0.60), y: 148, type: 'stone', maxHp: 3, yieldAmount: 35, resourceKey: 'stone' },
        { id: 'l1_n3', x: 80, y: 328, type: 'coal', maxHp: 3, yieldAmount: 25, resourceKey: 'gold' },
        { id: 'l1_n4', x: Math.round(worldWidth * 0.76), y: 338, type: 'stone', maxHp: 3, yieldAmount: 40, resourceKey: 'stone' },
        { id: 'l1_n5', x: Math.round(worldWidth * 0.40), y: 288, type: 'lumens', maxHp: 3, yieldAmount: 12, resourceKey: 'lumens' },
      ];
    } else if (this.currentDepthLevel === 2) {
      // Level 2: Rich Iron & Luminescent Crystals
      nodeDefs = [
        { id: 'l2_n1', x: Math.round(worldWidth * 0.20), y: 208, type: 'iron', maxHp: 4, yieldAmount: 25, resourceKey: 'iron' },
        { id: 'l2_n2', x: Math.round(worldWidth * 0.65), y: 168, type: 'iron', maxHp: 4, yieldAmount: 30, resourceKey: 'iron' },
        { id: 'l2_n3', x: Math.round(worldWidth * 0.32), y: 328, type: 'lumens', maxHp: 4, yieldAmount: 18, resourceKey: 'lumens' },
        { id: 'l2_n4', x: Math.round(worldWidth * 0.72), y: 358, type: 'iron', maxHp: 4, yieldAmount: 28, resourceKey: 'iron' },
        { id: 'l2_n5', x: Math.round(worldWidth * 0.26), y: 458, type: 'lumens', maxHp: 4, yieldAmount: 22, resourceKey: 'lumens' },
      ];
    } else {
      // Level 3: The Abyssal Core (Aether Cores & Demon Shards)
      nodeDefs = [
        { id: 'l3_n1', x: Math.round(worldWidth * 0.20), y: 308, type: 'aether', maxHp: 6, yieldAmount: 2, resourceKey: 'aetherCore' },
        { id: 'l3_n2', x: Math.round(worldWidth * 0.70), y: 328, type: 'aether', maxHp: 6, yieldAmount: 2, resourceKey: 'aetherCore' },
        { id: 'l3_n3', x: Math.round(worldWidth * 0.48), y: 458, type: 'aether', maxHp: 8, yieldAmount: 3, resourceKey: 'aetherCore' },
      ];
    }

    nodeDefs.forEach(def => {
      if (minedKeys.has(def.id)) {
        // Already excavated: place depleted rock socket showing the mining aftermath!
        const socket = this.add.image(def.x, def.y, 'ore_socket_depleted');
        this.excavatedSockets.push(socket);
        return;
      }

      const node: MiningNode & { id: string } = { ...def, hp: def.maxHp };
      this.miningNodes.push(node);

      const container = this.add.container(node.x, node.y);
      const textureKey = `ore_${node.type}`;
      const sprite = this.add.image(0, 0, textureKey);

      // HP Bar
      const hpBg = this.add.rectangle(0, -20, 28, 4, 0x000000, 0.8);
      const hpBar = this.add.rectangle(-14, -20, 28, 4, 0x38bdf8, 1).setOrigin(0, 0.5);

      container.add([sprite, hpBg, hpBar]);
      this.nodeSprites.set(node, container);

      if (node.type === 'aether') {
        this.tweens.add({
          targets: sprite,
          scale: 1.15,
          yoyo: true,
          repeat: -1,
          duration: 800,
        });
      }
    });
  }

  /**
   * Spawns challenges based on Dungeon Depth:
   * Level 1: 2 Skeleton Knights
   * Level 2: 2 Skeleton Knights + 2 Abyssal Predators
   * Level 3: 1 Abyssal Predator + THE ABYSSAL DRAGON BOSS!
   */
  private spawnDungeonEnemies(worldWidth: number, worldHeight: number) {
    this.cleanUpEnemies();

    if (this.currentDepthLevel === 1) {
      // 2 Skeleton Knights
      this.spawnSkeletonKnight(Math.round(worldWidth * 0.55), 150, Math.round(worldWidth * 0.45), Math.round(worldWidth * 0.68));
      this.spawnSkeletonKnight(Math.round(worldWidth * 0.22), 450, Math.round(worldWidth * 0.12), Math.round(worldWidth * 0.35));
    } else if (this.currentDepthLevel === 2) {
      // 2 Skeleton Knights + 2 Abyssal Predators
      this.spawnSkeletonKnight(Math.round(worldWidth * 0.28), 210, Math.round(worldWidth * 0.18), Math.round(worldWidth * 0.40));
      this.spawnSkeletonKnight(Math.round(worldWidth * 0.62), 170, Math.round(worldWidth * 0.52), Math.round(worldWidth * 0.74));
      this.spawnAbyssalPredator(80, 300, 40, Math.round(worldWidth * 0.25));
      this.spawnAbyssalPredator(Math.round(worldWidth * 0.54), 480, Math.round(worldWidth * 0.42), Math.round(worldWidth * 0.72));
    } else {
      // Level 3: 1 Predator guarding entry + THE ABYSSAL DRAGON BOSS
      this.spawnAbyssalPredator(Math.round(worldWidth * 0.65), 330, Math.round(worldWidth * 0.55), Math.round(worldWidth * 0.78));

      if (!gameState.isDragonDefeated) {
        this.spawnDragonBoss(worldWidth, worldHeight);
      }
    }
  }

  private spawnSkeletonKnight(x: number, y: number, minX: number, maxX: number) {
    const sprite = this.physics.add.sprite(x, y, 'enemy_skeleton');
    sprite.setCollideWorldBounds(true);
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    this.physics.add.collider(sprite, this.platforms);

    const hpBg = this.add.rectangle(x, y - 22, 28, 4, 0x000000, 0.85);
    const hpBar = this.add.rectangle(x - 14, y - 22, 28, 4, 0xef4444, 1).setOrigin(0, 0.5);

    this.skeletonKnights.push({
      sprite,
      hp: 3,
      maxHp: 3,
      patrolMinX: minX,
      patrolMaxX: maxX,
      direction: 1,
      lastAttackTime: 0,
      hpBarBg: hpBg,
      hpBar,
      isDead: false,
    });
  }

  private spawnAbyssalPredator(x: number, y: number, minX: number, maxX: number) {
    const sprite = this.physics.add.sprite(x, y, 'enemy_predator');
    sprite.setCollideWorldBounds(true);
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    this.physics.add.collider(sprite, this.platforms);

    const hpBg = this.add.rectangle(x, y - 18, 30, 4, 0x000000, 0.85);
    const hpBar = this.add.rectangle(x - 15, y - 18, 30, 4, 0x8b5cf6, 1).setOrigin(0, 0.5);

    this.abyssalPredators.push({
      sprite,
      hp: 4,
      maxHp: 4,
      patrolMinX: minX,
      patrolMaxX: maxX,
      direction: 1,
      lastLeapTime: 0,
      hpBarBg: hpBg,
      hpBar,
      isDead: false,
    });
  }

  private spawnDragonBoss(worldWidth: number, _worldHeight: number) {
    const centerX = worldWidth / 2;
    const centerY = 240;

    const sprite = this.physics.add.sprite(centerX, centerY, 'enemy_dragon');
    sprite.setImmovable(true);
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Boss Health Bar UI fixed to top screen
    const barWidth = 360;
    const hpBarBg = this.add.rectangle(this.scale.width / 2, 85, barWidth, 14, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0xf59e0b).setScrollFactor(0).setDepth(200);

    const hpBar = this.add.rectangle((this.scale.width - barWidth) / 2, 85, barWidth, 14, 0xef4444, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);

    const bossText = this.add.text(this.scale.width / 2, 68, '🐲 THE INFERNAL WYRM - MALGOK\'S ABYSSAL DRAGON', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#fbbf24',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    this.dragonBoss = {
      sprite,
      hp: 25,
      maxHp: 25,
      lastRoarTime: 0,
      lastFireballTime: 0,
      baseY: centerY,
      timeOffset: 0,
      hpBarBg,
      hpBar,
      bossText,
      isDead: false,
    };

    sounds.playDragonRoar();
    this.cameras.main.shake(400, 0.02);
    gameState.addLog('🐲 ABYSSAL DRAGON AWAKENED! Defeat the beast to claim the cavern core!', 'crisis');
  }

  private cleanUpEnemies() {
    this.skeletonKnights.forEach(sk => {
      sk.sprite.destroy();
      sk.hpBarBg.destroy();
      sk.hpBar.destroy();
    });
    this.skeletonKnights = [];

    this.abyssalPredators.forEach(p => {
      p.sprite.destroy();
      p.hpBarBg.destroy();
      p.hpBar.destroy();
    });
    this.abyssalPredators = [];

    if (this.dragonBoss) {
      this.dragonBoss.sprite.destroy();
      this.dragonBoss.hpBarBg.destroy();
      this.dragonBoss.hpBar.destroy();
      this.dragonBoss.bossText.destroy();
      this.dragonBoss = null;
    }

    this.fireballs.forEach(f => f.sprite.destroy());
    this.fireballs = [];
  }

  private setupInput() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyMine = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    this.input.on('pointerdown', () => {
      this.triggerMineSwing();
    });

    this.input.keyboard.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.returnToSurface();
    });
  }

  update(time: number, delta: number) {
    if (!this.player || !this.player.body) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onFloor = body.blocked.down || body.touching.down;

    // Coyote time & Jump buffer timers
    if (onFloor) {
      this.coyoteTimer = 120;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);

    // 1. Horizontal Movement
    const roots = gameState.metrics.rootIntegrity;
    const moveSpeed = roots < 40 && this.currentDepthLevel <= 2 ? 170 : 220;
    const isLeft = this.cursors.left.isDown || this.keyA.isDown;
    const isRight = this.cursors.right.isDown || this.keyD.isDown;

    if (isLeft) {
      this.player.setVelocityX(-moveSpeed);
      this.player.setFlipX(true);
      this.pickaxeSprite.setFlipX(true);
      this.pickaxeSprite.x = this.player.x - 12;
    } else if (isRight) {
      this.player.setVelocityX(moveSpeed);
      this.player.setFlipX(false);
      this.pickaxeSprite.setFlipX(false);
      this.pickaxeSprite.x = this.player.x + 12;
    }

    this.pickaxeSprite.y = this.player.y;

    // 2. Jump Handling
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                        Phaser.Input.Keyboard.JustDown(this.keyW) ||
                        Phaser.Input.Keyboard.JustDown(this.keySpace);

    if (jumpPressed) {
      this.jumpBufferTimer = 150;
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(-450);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      sounds.playJump();
      this.spawnDustParticles(this.player.x, this.player.y + 16);
    }

    const jumpHeld = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
    if (!jumpHeld && body.velocity.y < -150) {
      body.setVelocityY(body.velocity.y * 0.6);
    }

    // 3. Mining Key
    if (Phaser.Input.Keyboard.JustDown(this.keyMine)) {
      this.triggerMineSwing();
    }

    // 4. Update Enemy Behaviors (Skeletons, Predators, Dragon Boss)
    this.updateEnemies(time, delta);

    // 5. Fireball Projectiles Update
    this.updateFireballs(delta);

    // 6. Stalactite Trigger Check
    this.stalactites.forEach(hazard => {
      if (!hazard.hasFallen && Math.abs(this.player.x - hazard.triggerX) < 32 && this.player.y > hazard.sprite.y) {
        this.dropStalactite(hazard);
      }
    });

    // 7. Fluid Hazard Contact
    if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.fluidHazard.getBounds())) {
      this.handleFluidContact(delta);
    }

    // 8. Surface Elevator & Descent/Ascent Portal Navigation
    this.checkPortalNavigation();
  }

  private updateEnemies(time: number, delta: number) {
    // 1. Skeleton Knights AI
    for (const sk of this.skeletonKnights) {
      if (sk.isDead) continue;
      const skBody = sk.sprite.body as Phaser.Physics.Arcade.Body;
      const distToPlayer = Phaser.Math.Distance.Between(sk.sprite.x, sk.sprite.y, this.player.x, this.player.y);

      if (distToPlayer < 180) {
        // Move towards player
        sk.direction = this.player.x > sk.sprite.x ? 1 : -1;
        skBody.setVelocityX(sk.direction * 75);
        sk.sprite.setFlipX(sk.direction < 0);

        // Melee attack
        if (distToPlayer < 42 && time - sk.lastAttackTime > 1300) {
          sk.lastAttackTime = time;
          sounds.playSwordClash();
          this.damagePlayer(14, 'Slain by a Skeleton Knight\'s blade!');
        }
      } else {
        // Normal patrol
        skBody.setVelocityX(sk.direction * 45);
        sk.sprite.setFlipX(sk.direction < 0);
        if (sk.sprite.x > sk.patrolMaxX) {
          sk.direction = -1;
        } else if (sk.sprite.x < sk.patrolMinX) {
          sk.direction = 1;
        }
      }

      // Update HP bar
      sk.hpBarBg.setPosition(sk.sprite.x, sk.sprite.y - 20);
      sk.hpBar.setPosition(sk.sprite.x - 14, sk.sprite.y - 20);
      sk.hpBar.width = Math.max(0, (sk.hp / sk.maxHp) * 28);
    }

    // 2. Abyssal Predators AI
    for (const pred of this.abyssalPredators) {
      if (pred.isDead) continue;
      const pBody = pred.sprite.body as Phaser.Physics.Arcade.Body;
      const distToPlayer = Phaser.Math.Distance.Between(pred.sprite.x, pred.sprite.y, this.player.x, this.player.y);

      if (distToPlayer < 220) {
        pred.direction = this.player.x > pred.sprite.x ? 1 : -1;
        pred.sprite.setFlipX(pred.direction < 0);

        // Aggressive Leap Attack
        if (time - pred.lastLeapTime > 2200) {
          pred.lastLeapTime = time;
          sounds.playPredatorHiss();
          pBody.setVelocityX(pred.direction * 260);
          pBody.setVelocityY(-220);
        }

        if (distToPlayer < 36 && time - pred.lastLeapTime < 800) {
          this.damagePlayer(18, 'Mauled by an Abyssal Predator!');
        }
      } else {
        pBody.setVelocityX(pred.direction * 55);
        pred.sprite.setFlipX(pred.direction < 0);
        if (pred.sprite.x > pred.patrolMaxX) pred.direction = -1;
        else if (pred.sprite.x < pred.patrolMinX) pred.direction = 1;
      }

      pred.hpBarBg.setPosition(pred.sprite.x, pred.sprite.y - 18);
      pred.hpBar.setPosition(pred.sprite.x - 15, pred.sprite.y - 18);
      pred.hpBar.width = Math.max(0, (pred.hp / pred.maxHp) * 30);
    }

    // 3. The Abyssal Dragon Boss AI
    if (this.dragonBoss && !this.dragonBoss.isDead) {
      const boss = this.dragonBoss;
      boss.timeOffset += delta * 0.0015;

      // Sine wave hovering motion across the magma cavern
      const { width: worldWidth } = this.getWorldDimensions();
      boss.sprite.x = (worldWidth / 2) + Math.sin(boss.timeOffset * 0.8) * (worldWidth * 0.35);
      boss.sprite.y = boss.baseY + Math.cos(boss.timeOffset * 1.6) * 65;
      boss.sprite.setFlipX(Math.sin(boss.timeOffset * 0.8) < 0);

      // Periodic Roar & Tremor
      if (time - boss.lastRoarTime > 7000) {
        boss.lastRoarTime = time;
        sounds.playDragonRoar();
        this.cameras.main.shake(300, 0.018);
      }

      // Launch Fireball towards player
      if (time - boss.lastFireballTime > 3800) {
        boss.lastFireballTime = time;
        this.launchFireball(boss.sprite.x, boss.sprite.y);
      }

      // Dragon contact damage
      const distToPlayer = Phaser.Math.Distance.Between(boss.sprite.x, boss.sprite.y, this.player.x, this.player.y);
      if (distToPlayer < 65) {
        this.damagePlayer(25, 'Incinerated by the Abyssal Dragon!');
      }

      // Update Boss HP bar
      const barWidth = 360;
      boss.hpBar.width = Math.max(0, (boss.hp / boss.maxHp) * barWidth);
    }
  }

  private launchFireball(startX: number, startY: number) {
    sounds.playFireballLaunch();

    const sprite = this.physics.add.sprite(startX, startY, 'projectile_fireball');
    (sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Calculate angle towards player
    const angle = Phaser.Math.Angle.Between(startX, startY, this.player.x, this.player.y);
    const speed = 260;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    sprite.setVelocity(vx, vy);
    this.fireballs.push({ sprite, vx, vy });
  }

  private updateFireballs(delta: number) {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      if (!fb.sprite.active) {
        this.fireballs.splice(i, 1);
        continue;
      }

      // Trail particles
      if (Math.random() < 0.4) {
        const p = this.add.circle(fb.sprite.x, fb.sprite.y, 4, 0xf97316, 0.7);
        this.tweens.add({
          targets: p,
          alpha: 0,
          scale: 0.2,
          duration: 300,
          onComplete: () => p.destroy()
        });
      }

      // Check collision with player
      const dist = Phaser.Math.Distance.Between(fb.sprite.x, fb.sprite.y, this.player.x, this.player.y);
      if (dist < 24) {
        fb.sprite.destroy();
        this.fireballs.splice(i, 1);
        this.damagePlayer(22, 'Engulfed in Dragon Flame!');
        continue;
      }

      // Check collision with platforms or bounds
      if (fb.sprite.y > this.scale.height + 200 || fb.sprite.x < -100 || fb.sprite.x > 3000) {
        fb.sprite.destroy();
        this.fireballs.splice(i, 1);
      }
    }
  }

  /**
   * Pickaxe swing strikes ore nodes, rubble mounds, and enemies in melee range!
   */
  private triggerMineSwing() {
    const now = this.time.now;
    if (now - this.lastMineTime < 260) return;
    this.lastMineTime = now;

    this.isMining = true;
    sounds.playMineHit();

    this.tweens.add({
      targets: this.pickaxeSprite,
      angle: this.player.flipX ? -65 : 65,
      duration: 90,
      yoyo: true,
      onComplete: () => {
        this.isMining = false;
        this.pickaxeSprite.setAngle(0);
      },
    });

    const hitRange = 54;

    // 1. Check hit against nearby mining nodes
    for (const node of this.miningNodes) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
      if (dist <= hitRange && node.hp > 0) {
        this.damageMiningNode(node);
        return;
      }
    }

    // 2. Check hit against Skeleton Knights
    for (const sk of this.skeletonKnights) {
      if (sk.isDead) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sk.sprite.x, sk.sprite.y);
      if (dist <= hitRange) {
        this.damageSkeletonKnight(sk);
        return;
      }
    }

    // 3. Check hit against Abyssal Predators
    for (const pred of this.abyssalPredators) {
      if (pred.isDead) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pred.sprite.x, pred.sprite.y);
      if (dist <= hitRange) {
        this.damageAbyssalPredator(pred);
        return;
      }
    }

    // 4. Check hit against Dragon Boss
    if (this.dragonBoss && !this.dragonBoss.isDead) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.dragonBoss.sprite.x, this.dragonBoss.sprite.y);
      if (dist <= hitRange + 25) {
        this.damageDragonBoss();
        return;
      }
    }
  }

  /**
   * Mining a node creates an excavated rock cavity, rubble pile, and rock fissure cracks!
   */
  private damageMiningNode(node: MiningNode & { id?: string }) {
    node.hp -= 1;
    this.cameras.main.shake(90, 0.006);
    this.spawnSparks(node.x, node.y);

    const container = this.nodeSprites.get(node);
    if (container) {
      const hpBar = container.getAt(2) as Phaser.GameObjects.Rectangle;
      if (hpBar) {
        const pct = Math.max(0, node.hp / node.maxHp);
        hpBar.width = 28 * pct;
      }
    }

    if (node.hp <= 0) {
      sounds.playOreBreak();
      this.spawnRockDebris(node.x, node.y);
      gameState.depositMinedOre(node.resourceKey, node.yieldAmount);
      this.haulCount += node.yieldAmount;

      // 1. Permanent excavated socket showing where ore was dug out
      const socket = this.add.image(node.x, node.y, 'ore_socket_depleted');
      this.excavatedSockets.push(socket);

      // 2. Drop rubble pile onto the platform ledge below
      const rubble = this.physics.add.sprite(node.x, node.y + 18, 'rubble_pile');
      rubble.setImmovable(true);
      (rubble.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      this.rubblePiles.push(rubble);

      // 3. Draw tectonic rock fissure fracture cracks radiating across the wall
      this.drawRockFissure(node.x, node.y);

      // 4. Record in persistent mined state
      if (node.id) {
        if (!gameState.minedNodeKeys[this.currentDepthLevel]) {
          gameState.minedNodeKeys[this.currentDepthLevel] = [];
        }
        gameState.minedNodeKeys[this.currentDepthLevel].push(node.id);
      }

      // 5. Unexpected Consequence: Mining increases seismic weight strain
      gameState.metrics.tectonicWeight = Math.min(100, gameState.metrics.tectonicWeight + 1.5);

      // Floating loot text
      const lootText = this.add.text(node.x, node.y - 20, `+${node.yieldAmount} ${node.type.toUpperCase()}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: node.type === 'aether' ? '#c084fc' : '#38bdf8',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: lootText,
        y: node.y - 50,
        alpha: 0,
        duration: 900,
        onComplete: () => lootText.destroy(),
      });

      if (container) container.destroy();
      this.miningNodes = this.miningNodes.filter(n => n !== node);

      if (node.type === 'aether') {
        gameState.addLog('💎 AETHER CORE RECOVERED! Return to Surface to construct the Monument!', 'positive');
      }
    }
  }

  private drawRockFissure(cx: number, cy: number) {
    this.fissuresGraphics.lineStyle(1.5, 0xef4444, 0.7);
    this.fissuresGraphics.beginPath();
    this.fissuresGraphics.moveTo(cx, cy);
    this.fissuresGraphics.lineTo(cx + Phaser.Math.Between(-25, 25), cy + Phaser.Math.Between(15, 35));
    this.fissuresGraphics.lineTo(cx + Phaser.Math.Between(-35, 35), cy + Phaser.Math.Between(35, 60));
    this.fissuresGraphics.stroke();
  }

  private damageSkeletonKnight(sk: SkeletonKnight) {
    sk.hp -= 1;
    sounds.playSwordClash();
    this.cameras.main.shake(70, 0.005);
    sk.sprite.setTint(0xff0000);
    this.time.delayedCall(120, () => sk.sprite.clearTint());

    // Knockback
    const kbDir = this.player.x < sk.sprite.x ? 1 : -1;
    (sk.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(kbDir * 160);

    if (sk.hp <= 0) {
      sk.isDead = true;
      sounds.playSkeletonRattle();
      this.spawnBoneParticles(sk.sprite.x, sk.sprite.y);
      gameState.resources.gold += 15;
      gameState.resources.iron += 5;

      const dropText = this.add.text(sk.sprite.x, sk.sprite.y - 15, '+15G +5Fe', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#fbbf24'
      }).setOrigin(0.5);
      this.tweens.add({ targets: dropText, y: sk.sprite.y - 40, alpha: 0, duration: 800, onComplete: () => dropText.destroy() });

      sk.sprite.destroy();
      sk.hpBarBg.destroy();
      sk.hpBar.destroy();
    }
  }

  private damageAbyssalPredator(pred: AbyssalPredator) {
    pred.hp -= 1;
    sounds.playRockCrack();
    this.cameras.main.shake(80, 0.006);
    pred.sprite.setTint(0xff0000);
    this.time.delayedCall(120, () => pred.sprite.clearTint());

    const kbDir = this.player.x < pred.sprite.x ? 1 : -1;
    (pred.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(kbDir * 200);

    if (pred.hp <= 0) {
      pred.isDead = true;
      sounds.playPredatorHiss();
      this.spawnSparks(pred.sprite.x, pred.sprite.y);
      gameState.resources.gold += 25;
      gameState.resources.lumens += 8;
      gameState.resources.demonShards += 1;

      const dropText = this.add.text(pred.sprite.x, pred.sprite.y - 15, '+25G +8Lu +1Shard', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#c084fc'
      }).setOrigin(0.5);
      this.tweens.add({ targets: dropText, y: pred.sprite.y - 40, alpha: 0, duration: 800, onComplete: () => dropText.destroy() });

      pred.sprite.destroy();
      pred.hpBarBg.destroy();
      pred.hpBar.destroy();
    }
  }

  private damageDragonBoss() {
    if (!this.dragonBoss || this.dragonBoss.isDead) return;
    this.dragonBoss.hp -= 1;
    sounds.playRockCrack();
    this.cameras.main.shake(120, 0.012);
    this.dragonBoss.sprite.setTint(0xffffff);
    this.time.delayedCall(120, () => this.dragonBoss?.sprite.clearTint());

    if (this.dragonBoss.hp <= 0) {
      this.dragonBoss.isDead = true;
      gameState.isDragonDefeated = true;
      sounds.playVictory();
      this.cameras.main.flash(500, 255, 255, 255);
      this.cameras.main.shake(600, 0.03);

      // Massive loot reward
      gameState.resources.gold += 500;
      gameState.resources.aetherCore += 5;
      gameState.resources.demonShards += 10;
      gameState.addLog('👑 DRAGON SLAYER! The Abyssal Wyrm was vanquished! Claimed 500G, 5 Cores & 10 Shards!', 'positive');

      this.dragonBoss.sprite.destroy();
      this.dragonBoss.hpBarBg.destroy();
      this.dragonBoss.hpBar.destroy();
      this.dragonBoss.bossText.destroy();
      this.dragonBoss = null;
    }
  }

  private checkPortalNavigation() {
    // 1. Surface Elevator check (Level 1)
    if (this.currentDepthLevel === 1 && this.elevator) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.elevator.getBounds())) {
        if (Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
          this.returnToSurface();
        }
      }
    }

    // 2. Ascent Portal check (Levels 2 and 3)
    if (this.currentDepthLevel > 1 && this.ascentPortal) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.ascentPortal.getBounds())) {
        if (Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
          this.changeDungeonDepth(this.currentDepthLevel - 1);
        }
      }
    }

    // 3. Descent Portal check (Levels 1 and 2)
    if (this.currentDepthLevel < 3 && this.descentPortal) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.descentPortal.getBounds())) {
        if (Phaser.Input.Keyboard.JustDown(this.keyS) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
          this.changeDungeonDepth(this.currentDepthLevel + 1);
        }
      }
    }
  }

  /**
   * Smoothly transitions between dungeon depths (Levels 1, 2, and 3).
   */
  public changeDungeonDepth(targetLevel: number) {
    sounds.playLevelDescend();
    this.cameras.main.fade(400, 0, 0, 0, false, (_cam: unknown, progress: number) => {
      if (progress === 1) {
        this.currentDepthLevel = targetLevel;
        const { width: worldWidth, height: worldHeight } = this.getWorldDimensions();

        this.drawCavernBackdrop(worldWidth, worldHeight);
        this.buildDynamicCavernLevel(worldWidth, worldHeight);
        this.buildDynamicCeiling(worldWidth);
        this.buildDynamicFluidPool(worldWidth, worldHeight);
        this.setupLevelPortals(worldWidth, worldHeight);
        this.createPlayer(worldWidth);
        this.spawnMiningNodes(worldWidth, worldHeight);
        this.spawnDungeonEnemies(worldWidth, worldHeight);
        this.createDepthHUD();

        this.cameras.main.fadeIn(350, 0, 0, 0);
      }
    });
  }

  private dropStalactite(hazard: StalactiteHazard) {
    hazard.hasFallen = true;
    sounds.playTremor();

    this.tweens.add({
      targets: hazard.sprite,
      x: '+=3',
      yoyo: true,
      repeat: 4,
      duration: 40,
      onComplete: () => {
        (hazard.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        (hazard.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(320);

        const col = this.physics.add.overlap(this.player, hazard.sprite, () => {
          col.destroy();
          this.damagePlayer(25, 'Crushed by falling stalactite!');
        });
      },
    });
  }

  private handleCrumbleTouch(platform: Phaser.Physics.Arcade.Sprite) {
    if ((platform as unknown as { isCrumbling?: boolean }).isCrumbling) return;
    (platform as unknown as { isCrumbling?: boolean }).isCrumbling = true;

    this.tweens.add({
      targets: platform,
      x: '+=2',
      yoyo: true,
      repeat: 6,
      duration: 50,
      onComplete: () => {
        (platform.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        (platform.body as Phaser.Physics.Arcade.Body).setVelocityY(150);
        this.time.delayedCall(1200, () => platform.destroy());
      },
    });
  }

  private handleFluidContact(delta: number) {
    if (this.fluidType === 'acid' || this.fluidType === 'magma') {
      if (!this.isInvulnerable) {
        sounds.playAcidDamage();
        const reason = this.fluidType === 'magma' ? 'Boiled in molten lava!' : 'Dissolved in chemical acid!';
        this.damagePlayer(this.fluidType === 'magma' ? 25 : 15, reason);
      }
    } else {
      if (this.playerHp < this.maxHp) {
        this.playerHp = Math.min(this.maxHp, this.playerHp + (delta / 1000) * 12);
      }
    }
  }

  private damagePlayer(amount: number, reason: string) {
    if (this.isInvulnerable) return;

    this.playerHp = Math.max(0, this.playerHp - amount);
    this.isInvulnerable = true;
    this.cameras.main.shake(150, 0.015);

    this.player.setVelocityY(-250);
    this.player.setTint(0xef4444);

    if (this.playerHp <= 0) {
      gameState.addLog(`EXPEDITION FAILED: ${reason} Evacuated to surface.`, 'crisis');
      this.returnToSurface();
      return;
    }

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      yoyo: true,
      repeat: 4,
      duration: 120,
      onComplete: () => {
        this.player.clearTint();
        this.player.setAlpha(1);
        this.isInvulnerable = false;
      },
    });
  }

  private returnToSurface() {
    sounds.playElevator();
    this.cameras.main.fade(500, 0, 0, 0, false, (_cam: unknown, progress: number) => {
      if (progress === 1) {
        this.scene.sleep('CavernScene');
        if (this.scene.isSleeping('SurfaceScene')) {
          this.scene.wake('SurfaceScene');
        } else {
          this.scene.launch('SurfaceScene');
        }
        gameState.currentMode = GameMode.SURFACE;
        gameState.endDayCycle();
      }
    });
  }

  private announceActiveMutations() {
    const weight = gameState.metrics.tectonicWeight;
    const roots = gameState.metrics.rootIntegrity;
    const tox = gameState.metrics.toxicityLevel;

    if (weight > 50) {
      gameState.addLog(`CAVERN SAG: Heavy surface structures compressed the ceiling downwards!`, 'warning');
    }
    if (roots < 40) {
      gameState.addLog(`MUDSLIDE ALERT: Deforested roots caused loose cavern mud and crumbling platforms!`, 'warning');
    }
    if (tox > 45) {
      gameState.addLog(`ACID HAZARD: Surface industrial runoff transformed the cavern basin into acid!`, 'crisis');
    }
  }

  private syncConsequences() {
    const { width: worldWidth, height: worldHeight } = this.getWorldDimensions();
    this.buildDynamicCeiling(worldWidth);
    this.buildDynamicFluidPool(worldWidth, worldHeight);
  }

  public handleResize() {
    const { width: worldWidth, height: worldHeight } = this.getWorldDimensions();

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.drawCavernBackdrop(worldWidth, worldHeight);
    this.buildDynamicCavernLevel(worldWidth, worldHeight);
    this.buildDynamicCeiling(worldWidth);
    this.buildDynamicFluidPool(worldWidth, worldHeight);
    this.setupLevelPortals(worldWidth, worldHeight);

    this.spawnMiningNodes(worldWidth, worldHeight);
    this.spawnDungeonEnemies(worldWidth, worldHeight);
    this.createDepthHUD();
  }

  public resetCavernRun() {
    this.playerHp = 100;
    this.haulCount = 0;
    this.isInvulnerable = false;
    this.currentDepthLevel = 1;

    const { width: worldWidth, height: worldHeight } = this.getWorldDimensions();

    if (this.player) {
      this.player.setPosition(worldWidth - 130, 80);
      this.player.setVelocity(0, 0);
      this.player.clearTint();
      this.player.setAlpha(1);
    }
    if (this.pickaxeSprite) {
      this.pickaxeSprite.setPosition(worldWidth - 118, 80);
      this.pickaxeSprite.setAngle(0);
      this.pickaxeSprite.setFlipX(false);
    }

    this.drawCavernBackdrop(worldWidth, worldHeight);
    this.buildDynamicCavernLevel(worldWidth, worldHeight);
    this.buildDynamicCeiling(worldWidth);
    this.buildDynamicFluidPool(worldWidth, worldHeight);
    this.setupLevelPortals(worldWidth, worldHeight);

    this.spawnMiningNodes(worldWidth, worldHeight);
    this.spawnDungeonEnemies(worldWidth, worldHeight);
    this.createDepthHUD();

    this.announceActiveMutations();
  }

  private spawnDustParticles(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(x + Phaser.Math.Between(-8, 8), y, 'particle_rock').setScale(0.6);
      this.tweens.add({
        targets: p,
        y: y + Phaser.Math.Between(-4, 4),
        alpha: 0,
        duration: 300,
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnSparks(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.image(x, y, 'particle_spark').setScale(0.8);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-24, 24),
        y: y + Phaser.Math.Between(-24, 24),
        alpha: 0,
        duration: 250,
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnRockDebris(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.image(x, y, 'particle_rock').setScale(0.9);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-35, 35),
        y: y + Phaser.Math.Between(-35, 20),
        alpha: 0,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnBoneParticles(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(x, y, 'particle_bone').setScale(0.8);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 450,
        onComplete: () => p.destroy(),
      });
    }
  }

  destroy() {
    this.scale.off('resize', this.handleResize, this);
    if (this.unsubscribe) this.unsubscribe();
    this.cleanUpEnemies();
  }
}
