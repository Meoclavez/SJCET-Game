import Phaser from 'phaser';
import { gameState } from '../state/GameState';
import { GameMode, MiningNode } from '../types';
import { sounds } from '../audio/SoundEffects';

interface StalactiteHazard {
  sprite: Phaser.Physics.Arcade.Sprite;
  triggerX: number;
  hasFallen: boolean;
}

export class CavernScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyMine!: Phaser.Input.Keyboard.Key;
  private keyDash!: Phaser.Input.Keyboard.Key;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private crumblingPlatforms: Phaser.Physics.Arcade.Sprite[] = [];
  private ceilingGroup!: Phaser.GameObjects.Group;
  private stalactites: StalactiteHazard[] = [];
  private miningNodes: MiningNode[] = [];
  private nodeSprites: Map<MiningNode, Phaser.GameObjects.Container> = new Map();

  private fluidHazard!: Phaser.GameObjects.Rectangle;
  private fluidTopLine!: Phaser.GameObjects.Graphics;
  private isAcid: boolean = false;

  private elevator!: Phaser.Physics.Arcade.Sprite;
  private elevatorCable!: Phaser.GameObjects.Line;
  private elevatorPrompt!: Phaser.GameObjects.Text;
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

    // 1. Setup World Boundaries & Gravity
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.physics.world.gravity.y = 900;

    // 2. Camera bounds and fade in safety
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // 3. Draw Cavern Rocky Backing
    this.backdropGraphics = this.add.graphics();
    this.drawCavernBackdrop(worldWidth, worldHeight);

    // 4. Dynamic Platforms (affected by Root Integrity)
    this.platforms = this.physics.add.staticGroup();
    this.buildDynamicCavernLevel(worldWidth, worldHeight);

    // 5. Dynamic Ceiling & Stalactites (affected by Tectonic Weight)
    this.ceilingGroup = this.add.group();
    this.buildDynamicCeiling(worldWidth);

    // 6. Bottom Pit Fluid (affected by Toxicity Level)
    this.buildDynamicFluidPool(worldWidth, worldHeight);

    // 7. Mining Elevator (Return to surface)
    this.createElevator(worldWidth);

    // 8. Spawn Player
    this.createPlayer(worldWidth);

    // Camera follow player smoothly
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 9. Spawn Mining Nodes (Coal, Iron, Quartz, Aether Core)
    this.spawnMiningNodes(worldWidth, worldHeight);

    // 10. Controls
    this.setupInput();

    // 11. Handle Window Resize
    this.scale.on('resize', this.handleResize, this);

    // 12. Subscribe to GameState
    this.unsubscribe = gameState.subscribe(() => {
      this.syncConsequences();
    });

    // Scene lifecycle listeners
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.cameras.main.resetFX();
      this.cameras.main.setAlpha(1);
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.resetCavernRun();
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      if (this.unsubscribe) this.unsubscribe();
    });

    // Initial consequence announcement
    this.announceActiveMutations();
  }

  private drawCavernBackdrop(worldWidth: number, worldHeight: number) {
    this.backdropGraphics.clear();
    this.backdropGraphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x020617, 0x020617, 1);
    this.backdropGraphics.fillRect(0, 0, worldWidth, worldHeight);

    // Deep rock crags pattern across expansive world
    this.backdropGraphics.fillStyle(0x1e293b, 0.45);
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
    const isMud = roots < 40;
    const tileKey = isMud ? 'tile_mud' : 'tile_stone';

    // Helper to build ledge
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

    // --- RESPONSIVE LEVEL PLATFORM LAYOUT ---
    // Top Elevator entry ledge
    makeLedge(worldWidth - 220, 130, 7);

    // Tier 1 High Ledges
    makeLedge(Math.round(worldWidth * 0.55), 180, 8);
    makeLedge(Math.round(worldWidth * 0.14), 210, 8);

    // Tier 2 Mid Ledges
    makeLedge(Math.round(worldWidth * 0.35), 320, 7, true);
    makeLedge(40, 360, 6);
    makeLedge(Math.round(worldWidth * 0.72), 370, 8, true);

    // Tier 3 Deep Cavern Ledges
    makeLedge(Math.round(worldWidth * 0.22), 480, 8);
    makeLedge(Math.round(worldWidth * 0.52), 500, 8);

    // Bottom solid ground flanking the acid/healing pool
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
    // Sagging ceiling height: 0 weight = y: 20, 100 weight = y: 75
    const sagY = 20 + (weight / 100) * 55;

    // Draw crushing ceiling blocks spanning worldWidth
    for (let x = 0; x < worldWidth; x += 32) {
      const tile = this.add.image(x + 16, sagY - 10, weight > 50 ? 'tile_cracked_ceiling' : 'tile_stone');
      this.ceilingGroup.add(tile);
    }

    // Spawn falling stalactites if weight is above 25%
    if (weight > 25) {
      const spikeCount = Math.floor(weight / 12);
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
    this.isAcid = tox >= 45;

    const poolLeft = Math.round(worldWidth * 0.22);
    const poolRight = Math.round(worldWidth * 0.78);
    const poolWidth = poolRight - poolLeft;
    const poolCenterX = (poolLeft + poolRight) / 2;
    const floorY = worldHeight - 50;

    const fluidColor = this.isAcid ? 0x16a34a : 0x0284c7;
    const fluidAlpha = this.isAcid ? 0.85 : 0.75;

    this.fluidHazard = this.add.rectangle(poolCenterX, floorY + 40, poolWidth, 90, fluidColor, fluidAlpha);
    this.physics.add.existing(this.fluidHazard, true);

    this.fluidTopLine = this.add.graphics();
    this.fluidTopLine.lineStyle(3, this.isAcid ? 0x4ade80 : 0x38bdf8, 1);
    this.fluidTopLine.beginPath();
    this.fluidTopLine.moveTo(poolLeft, floorY);
    this.fluidTopLine.lineTo(poolRight, floorY);
    this.fluidTopLine.stroke();

    // Floating particles (bubbles)
    const bubbleColor = this.isAcid ? 'particle_acid' : 'particle_heal';
    for (let i = 0; i < 10; i++) {
      const bx = Phaser.Math.Between(poolLeft + 20, poolRight - 20);
      const bubble = this.add.image(bx, floorY + 30, bubbleColor).setScale(0.8);
      this.tweens.add({
        targets: bubble,
        y: floorY,
        alpha: 0,
        duration: Phaser.Math.Between(1500, 2500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private createElevator(worldWidth: number) {
    const elevX = worldWidth - 110;
    const elevY = 95;

    if (this.elevator) this.elevator.destroy();
    if (this.elevatorCable) this.elevatorCable.destroy();
    if (this.elevatorPrompt) this.elevatorPrompt.destroy();

    this.elevator = this.physics.add.sprite(elevX, elevY, 'elevator');
    this.elevator.setImmovable(true);
    (this.elevator.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Cable to ceiling
    this.elevatorCable = this.add.line(0, 0, elevX, 0, elevX, elevY, 0xf59e0b, 0.8).setLineWidth(2);
    this.elevatorCable.setOrigin(0, 0);

    this.elevatorPrompt = this.add.text(elevX, 45, 'SURFACE LIFT\n[W / TAB]', {
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

      // Collisions with static platforms
      this.physics.add.collider(this.player, this.platforms, () => {
        this.coyoteTimer = 100;
      });

      // Collisions with crumbling platforms
      this.physics.add.collider(this.player, this.crumblingPlatforms, (_p, platform) => {
        this.coyoteTimer = 100;
        this.handleCrumbleTouch(platform as Phaser.Physics.Arcade.Sprite);
      });
    } else {
      this.player.setPosition(spawnX, spawnY);
      this.player.setVelocity(0, 0);
    }

    // Adjust friction based on root integrity
    const roots = gameState.metrics.rootIntegrity;
    if (roots < 40) {
      this.player.setDragX(250);
    } else {
      this.player.setDragX(1200);
    }
  }

  private spawnMiningNodes(worldWidth: number, worldHeight: number) {
    this.nodeSprites.forEach(c => c.destroy());
    this.nodeSprites.clear();
    this.miningNodes = [];

    // Define Node Spawns mapped across vast dimensions
    const nodeDefs: Omit<MiningNode, 'hp'>[] = [
      // Stone & Coal Nodes
      { x: Math.round(worldWidth * 0.16), y: 178, type: 'coal', maxHp: 3, yieldAmount: 20, resourceKey: 'gold' },
      { x: Math.round(worldWidth * 0.60), y: 148, type: 'stone', maxHp: 3, yieldAmount: 35, resourceKey: 'stone' },
      // Iron Ore Veins
      { x: 80, y: 328, type: 'iron', maxHp: 4, yieldAmount: 18, resourceKey: 'iron' },
      { x: Math.round(worldWidth * 0.76), y: 338, type: 'iron', maxHp: 4, yieldAmount: 22, resourceKey: 'iron' },
      // Luminescent Crystals
      { x: Math.round(worldWidth * 0.40), y: 288, type: 'lumens', maxHp: 3, yieldAmount: 12, resourceKey: 'lumens' },
      { x: Math.round(worldWidth * 0.26), y: 448, type: 'lumens', maxHp: 3, yieldAmount: 15, resourceKey: 'lumens' },
      // The Legendary Aether Core (Deepest Center Alcove)
      { x: Math.round(worldWidth * 0.54), y: 468, type: 'aether', maxHp: 6, yieldAmount: 1, resourceKey: 'aetherCore' },
    ];

    nodeDefs.forEach(def => {
      const node: MiningNode = { ...def, hp: def.maxHp };
      this.miningNodes.push(node);

      const container = this.add.container(node.x, node.y);
      const textureKey = `ore_${node.type}`;
      const sprite = this.add.image(0, 0, textureKey);

      // HP Bar
      const hpBg = this.add.rectangle(0, -20, 28, 4, 0x000000, 0.8);
      const hpBar = this.add.rectangle(-14, -20, 28, 4, 0x38bdf8, 1).setOrigin(0, 0.5);

      container.add([sprite, hpBg, hpBar]);
      this.nodeSprites.set(node, container);

      // Pulse animation on Aether core
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

  private setupInput() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyMine = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyDash = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);

    // Mouse click to mine
    this.input.on('pointerdown', () => {
      this.triggerMineSwing();
    });

    // Tab to return to surface
    this.input.keyboard.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.returnToSurface();
    });
  }

  update(_time: number, delta: number) {
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
    const moveSpeed = roots < 40 ? 170 : 220; // Slower traction in mud
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

    // Pickaxe follows player smoothly
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

    // Variable Jump Cut (release jump early to fall sooner)
    const jumpHeld = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
    if (!jumpHeld && body.velocity.y < -150) {
      body.setVelocityY(body.velocity.y * 0.6);
    }

    // 3. Mining Key
    if (Phaser.Input.Keyboard.JustDown(this.keyMine)) {
      this.triggerMineSwing();
    }

    // 4. Stalactite Trigger Check (Tectonic consequence)
    this.stalactites.forEach(hazard => {
      if (!hazard.hasFallen && Math.abs(this.player.x - hazard.triggerX) < 32 && this.player.y > hazard.sprite.y) {
        this.dropStalactite(hazard);
      }
    });

    // 5. Fluid Pool Check (Toxicity consequence)
    if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.fluidHazard.getBounds())) {
      this.handleFluidContact(delta);
    }

    // 6. Elevator Return Check
    if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.elevator.getBounds())) {
      if (Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.returnToSurface();
      }
    }
  }

  private triggerMineSwing() {
    const now = this.time.now;
    if (now - this.lastMineTime < 280) return;
    this.lastMineTime = now;

    this.isMining = true;
    sounds.playMineHit();

    // Pickaxe swing animation
    this.tweens.add({
      targets: this.pickaxeSprite,
      angle: this.player.flipX ? -60 : 60,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.isMining = false;
        this.pickaxeSprite.setAngle(0);
      },
    });

    // Check hit against nearby mining nodes
    const hitRange = 52;
    for (const node of this.miningNodes) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y);
      if (dist <= hitRange && node.hp > 0) {
        this.damageMiningNode(node);
        break;
      }
    }
  }

  private damageMiningNode(node: MiningNode) {
    node.hp -= 1;
    this.cameras.main.shake(80, 0.005);
    this.spawnSparks(node.x, node.y);

    const container = this.nodeSprites.get(node);
    if (container) {
      // Update HP bar
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
        gameState.addLog('💎 AETHER CORE RECOVERED! Return to the Surface to construct the Monument!', 'positive');
      }
    }
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
    if (this.isAcid) {
      if (!this.isInvulnerable) {
        sounds.playAcidDamage();
        this.damagePlayer(15, 'Boiled in industrial chemical acid!');
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
    this.createElevator(worldWidth);

    // Keep mining nodes properly positioned
    this.nodeSprites.forEach(c => c.destroy());
    this.nodeSprites.clear();
    this.spawnMiningNodes(worldWidth, worldHeight);
  }

  public resetCavernRun() {
    this.playerHp = 100;
    this.haulCount = 0;
    this.isInvulnerable = false;

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

    this.buildDynamicCavernLevel(worldWidth, worldHeight);
    this.buildDynamicCeiling(worldWidth);
    this.buildDynamicFluidPool(worldWidth, worldHeight);

    this.nodeSprites.forEach(c => c.destroy());
    this.nodeSprites.clear();
    this.spawnMiningNodes(worldWidth, worldHeight);

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

  destroy() {
    this.scale.off('resize', this.handleResize, this);
    if (this.unsubscribe) this.unsubscribe();
  }
}
