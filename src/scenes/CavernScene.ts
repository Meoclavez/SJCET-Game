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
  private isWallSliding: boolean = false;

  private unsubscribe!: () => void;

  constructor() {
    super({ key: 'CavernScene' });
  }

  create() {
    gameState.currentMode = GameMode.CAVERN;
    this.playerHp = 100;
    this.haulCount = 0;

    // 1. Setup World Boundaries
    this.physics.world.setBounds(0, 0, 1024, 640);
    this.physics.world.gravity.y = 900;

    // 2. Draw Cavern Rocky Backing
    this.drawCavernBackdrop();

    // 3. Dynamic Platforms (affected by Root Integrity)
    this.platforms = this.physics.add.staticGroup();
    this.buildDynamicCavernLevel();

    // 4. Dynamic Ceiling & Stalactites (affected by Tectonic Weight)
    this.ceilingGroup = this.add.group();
    this.buildDynamicCeiling();

    // 5. Bottom Pit Fluid (affected by Toxicity Level)
    this.buildDynamicFluidPool();

    // 6. Mining Elevator (Return to surface)
    this.createElevator();

    // 7. Spawn Player
    this.createPlayer();

    // 8. Spawn Mining Nodes (Coal, Iron, Quartz, Aether Core)
    this.spawnMiningNodes();

    // 9. Controls
    this.setupInput();

    // 10. Subscribe to GameState
    this.unsubscribe = gameState.subscribe(() => {
      this.syncConsequences();
    });

    // Camera fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Initial consequence announcement
    this.announceActiveMutations();
  }

  private drawCavernBackdrop() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x020617, 0x020617, 1);
    bg.fillRect(0, 0, 1024, 640);

    // Deep rock crags pattern
    bg.fillStyle(0x1e293b, 0.4);
    for (let i = 0; i < 30; i++) {
      const rx = Phaser.Math.Between(40, 980);
      const ry = Phaser.Math.Between(60, 560);
      const rw = Phaser.Math.Between(60, 180);
      const rh = Phaser.Math.Between(30, 90);
      bg.fillRoundedRect(rx, ry, rw, rh, 8);
    }
  }

  private buildDynamicCavernLevel() {
    this.platforms.clear(true, true);
    this.crumblingPlatforms.forEach(p => p.destroy());
    this.crumblingPlatforms = [];

    const roots = gameState.metrics.rootIntegrity;
    const isMud = roots < 40;
    const tileKey = isMud ? 'tile_mud' : 'tile_stone';

    // Helper to build ledge
    const makeLedge = (x: number, y: number, widthInTiles: number, isCrumble = false) => {
      for (let i = 0; i < widthInTiles; i++) {
        const px = x + i * 32;
        if (isCrumble && isMud) {
          // Crumbly loose platform
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

    // --- LEVEL PLATFORM LAYOUT ---
    // Top Elevator entry ledge
    makeLedge(860, 130, 5);

    // Tier 1 High Ledges
    makeLedge(580, 180, 7);
    makeLedge(160, 210, 8);

    // Tier 2 Mid Ledges
    makeLedge(380, 310, 6, true);
    makeLedge(40, 350, 6);
    makeLedge(720, 370, 7, true);

    // Tier 3 Deep Cavern Ledges
    makeLedge(220, 460, 8);
    makeLedge(520, 480, 7);

    // Bottom solid ground flanking the acid/healing pool
    makeLedge(0, 580, 7);
    makeLedge(780, 580, 8);
  }

  private buildDynamicCeiling() {
    this.ceilingGroup.clear(true, true);
    this.stalactites.forEach(s => s.sprite.destroy());
    this.stalactites = [];

    const weight = gameState.metrics.tectonicWeight;
    // Sagging ceiling height: 0 weight = y: 20, 100 weight = y: 75!
    const sagY = 20 + (weight / 100) * 55;

    // Draw crushing ceiling blocks
    for (let x = 0; x < 1024; x += 32) {
      const tile = this.add.image(x + 16, sagY - 10, weight > 50 ? 'tile_cracked_ceiling' : 'tile_stone');
      this.ceilingGroup.add(tile);
    }

    // Spawn falling stalactites if weight is above 25%
    if (weight > 25) {
      const spikeCount = Math.floor(weight / 15);
      const positions = [260, 440, 620, 790, 330, 510];

      for (let i = 0; i < Math.min(spikeCount, positions.length); i++) {
        const sx = positions[i];
        const spike = this.physics.add.sprite(sx, sagY + 8, 'stalactite');
        spike.setImmovable(true);
        (spike.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        this.stalactites.push({
          sprite: spike,
          triggerX: sx,
          hasFallen: false
        });
      }
    }
  }

  private buildDynamicFluidPool() {
    if (this.fluidHazard) this.fluidHazard.destroy();
    if (this.fluidTopLine) this.fluidTopLine.destroy();

    const tox = gameState.metrics.toxicityLevel;
    this.isAcid = tox >= 45;

    // Fluid pool occupies bottom center (x: 224 to 780, y: 560 to 640)
    const fluidColor = this.isAcid ? 0x16a34a : 0x0284c7;
    const fluidAlpha = this.isAcid ? 0.85 : 0.75;

    this.fluidHazard = this.add.rectangle(502, 600, 556, 80, fluidColor, fluidAlpha);
    this.physics.add.existing(this.fluidHazard, true);

    this.fluidTopLine = this.add.graphics();
    this.fluidTopLine.lineStyle(3, this.isAcid ? 0x4ade80 : 0x38bdf8, 1);
    this.fluidTopLine.beginPath();
    this.fluidTopLine.moveTo(224, 560);
    this.fluidTopLine.lineTo(780, 560);
    this.fluidTopLine.stroke();

    // Floating particles (bubbles)
    const bubbleColor = this.isAcid ? 'particle_acid' : 'particle_heal';
    for (let i = 0; i < 8; i++) {
      const bx = Phaser.Math.Between(240, 760);
      const bubble = this.add.image(bx, 590, bubbleColor).setScale(0.8);
      this.tweens.add({
        targets: bubble,
        y: 560,
        alpha: 0,
        duration: Phaser.Math.Between(1500, 2500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
  }

  private createElevator() {
    this.elevator = this.physics.add.sprite(930, 95, 'elevator');
    this.elevator.setImmovable(true);
    (this.elevator.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Cable to ceiling
    const cable = this.add.line(0, 0, 930, 0, 930, 95, 0xf59e0b, 0.8).setLineWidth(2);
    cable.setOrigin(0, 0);

    const prompt = this.add.text(930, 45, 'SURFACE LIFT\n[W / TAB]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#f59e0b',
      align: 'center',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      y: 40,
      yoyo: true,
      repeat: -1,
      duration: 1000
    });
  }

  private createPlayer() {
    // Spawn near elevator
    this.player = this.physics.add.sprite(910, 80, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.05);

    // Adjust friction based on root integrity
    const roots = gameState.metrics.rootIntegrity;
    if (roots < 40) {
      // Slippery mud physics!
      this.player.setDragX(250);
    } else {
      this.player.setDragX(1200);
    }

    // Pickaxe attached to player
    this.pickaxeSprite = this.add.image(this.player.x + 12, this.player.y, 'pickaxe')
      .setOrigin(0.2, 0.8)
      .setScale(0.85);

    // Collisions with static platforms
    this.physics.add.collider(this.player, this.platforms, () => {
      this.coyoteTimer = 100; // Reset coyote time on ground
    });

    // Collisions with crumbling platforms
    this.physics.add.collider(this.player, this.crumblingPlatforms, (_p, platform) => {
      this.coyoteTimer = 100;
      this.handleCrumbleTouch(platform as Phaser.Physics.Arcade.Sprite);
    });
  }

  private spawnMiningNodes() {
    this.nodeSprites.forEach(c => c.destroy());
    this.nodeSprites.clear();
    this.miningNodes = [];

    // Define Node Spawns
    const nodeDefs: Omit<MiningNode, 'hp'>[] = [
      // Stone & Coal Nodes
      { x: 180, y: 178, type: 'coal', maxHp: 3, yieldAmount: 20, resourceKey: 'gold' },
      { x: 640, y: 148, type: 'stone', maxHp: 3, yieldAmount: 35, resourceKey: 'stone' },
      // Iron Ore Veins
      { x: 80, y: 318, type: 'iron', maxHp: 4, yieldAmount: 18, resourceKey: 'iron' },
      { x: 760, y: 338, type: 'iron', maxHp: 4, yieldAmount: 22, resourceKey: 'iron' },
      // Luminescent Crystals
      { x: 440, y: 278, type: 'lumens', maxHp: 3, yieldAmount: 12, resourceKey: 'lumens' },
      { x: 260, y: 428, type: 'lumens', maxHp: 3, yieldAmount: 15, resourceKey: 'lumens' },
      // The Legendary Aether Core (Deepest Center Alcove)
      { x: 550, y: 448, type: 'aether', maxHp: 6, yieldAmount: 1, resourceKey: 'aetherCore' }
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
          duration: 800
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
      // Execute Jump
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
      }
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
      // Ore Vein Shattered!
      sounds.playOreBreak();
      this.spawnRockDebris(node.x, node.y);
      gameState.depositMinedOre(node.resourceKey, node.yieldAmount);
      this.haulCount += node.yieldAmount;

      // Floating loot text
      const lootText = this.add.text(node.x, node.y - 20, `+${node.yieldAmount} ${node.type.toUpperCase()}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: node.type === 'aether' ? '#c084fc' : '#38bdf8'
      }).setOrigin(0.5);

      this.tweens.add({
        targets: lootText,
        y: node.y - 50,
        alpha: 0,
        duration: 900,
        onComplete: () => lootText.destroy()
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

    // Shake before dropping
    this.tweens.add({
      targets: hazard.sprite,
      x: '+=3',
      yoyo: true,
      repeat: 4,
      duration: 40,
      onComplete: () => {
        (hazard.sprite.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        (hazard.sprite.body as Phaser.Physics.Arcade.Body).setVelocityY(320);

        // Check player hit
        const col = this.physics.add.overlap(this.player, hazard.sprite, () => {
          col.destroy();
          this.damagePlayer(25, 'Crushed by falling stalactite!');
        });
      }
    });
  }

  private handleCrumbleTouch(platform: Phaser.Physics.Arcade.Sprite) {
    if ((platform as unknown as { isCrumbling?: boolean }).isCrumbling) return;
    (platform as unknown as { isCrumbling?: boolean }).isCrumbling = true;

    // Shake and crumble
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
      }
    });
  }

  private handleFluidContact(delta: number) {
    if (this.isAcid) {
      // Continuous Acid Sizzle Damage
      if (!this.isInvulnerable) {
        sounds.playAcidDamage();
        this.damagePlayer(15, 'Boiled in industrial chemical acid!');
      }
    } else {
      // Healing Mineral Bath
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

    // Knockback
    this.player.setVelocityY(-250);
    this.player.setTint(0xef4444);

    if (this.playerHp <= 0) {
      // Subterranean evacuation
      gameState.addLog(`EXPEDITION FAILED: ${reason} Evacuated to surface.`, 'crisis');
      this.returnToSurface();
      return;
    }

    // Flash invulnerability
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
      }
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
        // End the cycle upon returning with your haul!
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
    // Rebuild ceiling and fluids if state mutated
    this.buildDynamicCeiling();
    this.buildDynamicFluidPool();
  }

  private spawnDustParticles(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(x + Phaser.Math.Between(-8, 8), y, 'particle_rock').setScale(0.6);
      this.tweens.add({
        targets: p,
        y: y + Phaser.Math.Between(-4, 4),
        alpha: 0,
        duration: 300,
        onComplete: () => p.destroy()
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
        onComplete: () => p.destroy()
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
        onComplete: () => p.destroy()
      });
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}
