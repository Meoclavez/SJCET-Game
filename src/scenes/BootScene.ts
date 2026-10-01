import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Show a clean loading text
    const { width, height } = this.scale;
    const loadText = this.add.text(width / 2, height / 2, 'FORGING OVERBURDEN ASSETS...', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#f0883e'
    }).setOrigin(0.5);

    this.generateProceduralTextures();
  }

  create() {
    // Launch opening demo prologue scene
    this.scene.start('OpeningDemoScene');
  }

  private generateProceduralTextures() {
    // 1. Miner Player (32x32)
    const pCanvas = this.textures.createCanvas('player', 32, 32);
    if (pCanvas) {
      const ctx = pCanvas.context;
      ctx.imageSmoothingEnabled = false;

      // Hardhat / Helmet
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 2, 16, 8);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(6, 8, 20, 3);
      // Headlamp glow
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(18, 5, 5, 4);

      // Face
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(10, 11, 12, 7);
      // Eye & visor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(18, 13, 3, 3);

      // Body / Jacket
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, 18, 16, 8);
      // Tool belt
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, 24, 16, 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(14, 24, 4, 2);

      // Legs / Boots
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, 26, 6, 6);
      ctx.fillRect(18, 26, 6, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(7, 30, 7, 2);
      ctx.fillRect(18, 30, 7, 2);

      pCanvas.refresh();
    }

    // 2. Pickaxe Icon/Sprite (24x24)
    const pickCanvas = this.textures.createCanvas('pickaxe', 24, 24);
    if (pickCanvas) {
      const ctx = pickCanvas.context;
      // Wooden Handle
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(5, 19);
      ctx.lineTo(16, 8);
      ctx.stroke();

      // Steel Pick Head
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(12, 3);
      ctx.quadraticCurveTo(20, 4, 21, 12);
      ctx.lineTo(17, 10);
      ctx.quadraticCurveTo(17, 7, 10, 7);
      ctx.closePath();
      ctx.fill();

      // Pick edge highlight
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(19, 11, 2, 2);
      ctx.fillRect(11, 3, 2, 2);

      pickCanvas.refresh();
    }

    // 3. Environment Tiles (32x32 each)
    this.createSolidTile('tile_grass', '#15803d', '#166534', '#4ade80');
    this.createSolidTile('tile_dirt', '#78350f', '#451a03', '#92400e');
    this.createSolidTile('tile_mud', '#451a03', '#271003', '#713f12', true);
    this.createSolidTile('tile_stone', '#475569', '#334155', '#64748b');
    this.createSolidTile('tile_cracked_ceiling', '#334155', '#1e293b', '#ef4444', false, true);

    // 4. Ore Nodes (32x32)
    this.createOreTile('ore_coal', '#1e293b', '#0f172a', '#475569');
    this.createOreTile('ore_iron', '#b45309', '#f59e0b', '#78350f');
    this.createOreTile('ore_lumens', '#06b6d4', '#22d3ee', '#67e8f9');
    this.createOreTile('ore_aether', '#8b5cf6', '#c084fc', '#f43f5e');

    // 5. Stalactite Spike (16x32)
    const spikeCanvas = this.textures.createCanvas('stalactite', 16, 32);
    if (spikeCanvas) {
      const ctx = spikeCanvas.context;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16, 0);
      ctx.lineTo(8, 30);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(3, 0);
      ctx.lineTo(8, 0);
      ctx.lineTo(8, 28);
      ctx.closePath();
      ctx.fill();
      spikeCanvas.refresh();
    }

    // 6. Mine Elevator Cage (48x64)
    const elevCanvas = this.textures.createCanvas('elevator', 48, 64);
    if (elevCanvas) {
      const ctx = elevCanvas.context;
      // Metal Grid Frame
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, 42, 58);

      // Crossbars
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(3, 3); ctx.lineTo(45, 61);
      ctx.moveTo(45, 3); ctx.lineTo(3, 61);
      ctx.stroke();

      // Top suspension ring
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(24, 4, 4, 0, Math.PI * 2);
      ctx.fill();

      elevCanvas.refresh();
    }

    // 7. Surface Building Textures (64x64)
    this.createBuildingTexture('bldg_cottage', '#b45309', '#fef08a', '🏠');
    this.createBuildingTexture('bldg_town_hall', '#475569', '#38bdf8', '🏛️');
    this.createBuildingTexture('bldg_lumber_mill', '#92400e', '#f97316', '🪓');
    this.createBuildingTexture('bldg_smelter', '#7f1d1d', '#ef4444', '🔥');
    this.createBuildingTexture('bldg_festival', '#9333ea', '#fbbf24', '🎪');
    this.createBuildingTexture('bldg_nursery', '#15803d', '#86efac', '🌱');
    this.createBuildingTexture('bldg_canal', '#0284c7', '#38bdf8', '🌊');
    this.createBuildingTexture('bldg_alchemist', '#7e22ce', '#00f5ff', '⚗️');
    this.createBuildingTexture('bldg_blacksmith', '#334155', '#f97316', '⚒️');
    this.createBuildingTexture('bldg_rampart', '#64748b', '#0284c7', '🏰');
    this.createBuildingTexture('bldg_royal_keep', '#475569', '#f59e0b', '👑');
    this.createBuildingTexture('bldg_grand_citadel', '#1e1b4b', '#38bdf8', '✨');
    this.createBuildingTexture('bldg_monument', '#f59e0b', '#c084fc', '🌟');

    // 8. Surface Trees and Backdrop
    this.createTreeTexture('tree_green', '#15803d', '#166534');
    this.createTreeTexture('tree_withered', '#78350f', '#451a03');

    // 9. Simple Particles
    this.createCircleTexture('particle_spark', 6, '#fbbf24');
    this.createCircleTexture('particle_rock', 8, '#64748b');
    this.createCircleTexture('particle_acid', 6, '#22c55e');
    this.createCircleTexture('particle_heal', 6, '#38bdf8');
    this.createCircleTexture('particle_bone', 5, '#e2e8f0');
    this.createCircleTexture('particle_fire', 7, '#f97316');

    // 10. Dungeon Challenges & Enemies (Skeleton Knight, Abyssal Predator, Abyssal Dragon)
    this.createMonsterTextures();

    // 11. Dungeon Interaction & Excavation Elements (Depleted sockets, rubble, portals)
    this.createDungeonExcavationTextures();

    // 12. 2.5D Surface World Decorations (Isometric plot pads, walking citizens, lanterns)
    this.createSurfaceWorldTextures();
  }

  private createSolidTile(key: string, base: string, shadow: string, highlight: string, isMud = false, hasCracks = false) {
    const c = this.textures.createCanvas(key, 32, 32);
    if (!c) return;
    const ctx = c.context;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 32, 32);

    // Grain and texture
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 26, 32, 6);
    ctx.fillRect(26, 0, 6, 32);

    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, 32, 4);
    ctx.fillRect(0, 0, 4, 32);

    if (isMud) {
      // Slippery mud streaks
      ctx.fillStyle = '#713f12';
      ctx.fillRect(6, 6, 12, 4);
      ctx.fillRect(14, 16, 14, 5);
      ctx.fillStyle = '#271003';
      ctx.fillRect(8, 22, 16, 4);
    }

    if (hasCracks) {
      // Jagged fissure cracks
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, 2); ctx.lineTo(12, 16); ctx.lineTo(8, 24); ctx.lineTo(28, 30);
      ctx.stroke();
    }

    c.refresh();
  }

  private createOreTile(key: string, base: string, gem1: string, gem2: string) {
    const c = this.textures.createCanvas(key, 32, 32);
    if (!c) return;
    const ctx = c.context;
    // Stone backing
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 26, 32, 6);

    // Gem cluster embedded
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = gem1;
    ctx.fillRect(10, 10, 6, 6);
    ctx.fillRect(18, 14, 7, 7);

    ctx.fillStyle = gem2;
    ctx.fillRect(13, 13, 3, 3);
    ctx.fillRect(21, 16, 3, 3);

    c.refresh();
  }

  /**
   * Rich 2.5D building sprite with isometric depth, stone plinth foundation,
   * side shadow projection, timber lintels, lit windows, and chimney.
   */
  private createBuildingTexture(key: string, wallColor: string, roofColor: string, emoji: string) {
    const c = this.textures.createCanvas(key, 76, 76);
    if (!c) return;
    const ctx = c.context;

    // 1. Isometric Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(38, 70, 32, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Beveled Stone Foundation Plinth (shows length and breadth / floor depth)
    ctx.fillStyle = '#334155';
    ctx.fillRect(6, 60, 64, 8);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(8, 58, 60, 3);

    // 3. Shaded 2.5D Side Wall (demonstrates breadth / depth receding backwards)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(56, 32);
    ctx.lineTo(68, 24);
    ctx.lineTo(68, 58);
    ctx.lineTo(56, 64);
    ctx.closePath();
    ctx.fill();

    // 4. Main Front Wall Facade
    ctx.fillStyle = wallColor;
    ctx.fillRect(10, 32, 48, 30);

    // Timber framing & masonry lines on front wall
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 32, 4, 30);
    ctx.fillRect(54, 32, 4, 30);
    ctx.fillRect(10, 46, 48, 3);

    // 5. Chimney with brick detailing
    ctx.fillStyle = '#475569';
    ctx.fillRect(44, 10, 10, 22);
    ctx.fillStyle = '#334155';
    ctx.fillRect(43, 8, 12, 3);

    // 6. 2.5D Slanted Roof with overhang and ridge
    // Side roof slope
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(34, 12);
    ctx.lineTo(48, 6);
    ctx.lineTo(72, 22);
    ctx.lineTo(58, 32);
    ctx.closePath();
    ctx.fill();

    // Front roof slope
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(6, 32);
    ctx.lineTo(34, 12);
    ctx.lineTo(58, 32);
    ctx.closePath();
    ctx.fill();

    // Roof eave highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 7. Warm glowing arched doorway
    ctx.fillStyle = '#451a03';
    ctx.fillRect(28, 44, 14, 18);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(30, 46, 10, 16);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(38, 54, 2, 2); // Brass door handle

    // 8. Illuminated multi-pane windows
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(16, 36, 9, 8);
    ctx.fillRect(43, 36, 9, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 36, 1, 8);
    ctx.fillRect(16, 40, 9, 1);
    ctx.fillRect(47, 36, 1, 8);
    ctx.fillRect(43, 40, 9, 1);

    // 9. Building Emblem
    ctx.font = '15px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, 34, 28);

    c.refresh();
  }

  private createTreeTexture(key: string, foliage1: string, foliage2: string) {
    const c = this.textures.createCanvas(key, 44, 68);
    if (!c) return;
    const ctx = c.context;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(22, 64, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(18, 36, 8, 28);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(23, 36, 3, 28);

    // Leaves with 3D spherical layering
    ctx.fillStyle = foliage2;
    ctx.beginPath();
    ctx.arc(22, 26, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = foliage1;
    ctx.beginPath();
    ctx.arc(19, 21, 14, 0, Math.PI * 2);
    ctx.fill();

    c.refresh();
  }

  private createCircleTexture(key: string, radius: number, color: string) {
    const size = radius * 2;
    const c = this.textures.createCanvas(key, size, size);
    if (!c) return;
    const ctx = c.context;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    ctx.fill();
    c.refresh();
  }

  /**
   * Generates procedural pixel sprites for dungeon enemies:
   * Skeleton Knight, Abyssal Predator, and Abyssal Dragon boss.
   */
  private createMonsterTextures() {
    // 1. Skeleton Knight (32x32)
    const skCanvas = this.textures.createCanvas('enemy_skeleton', 32, 32);
    if (skCanvas) {
      const ctx = skCanvas.context;
      // Horned Iron Helmet
      ctx.fillStyle = '#64748b';
      ctx.fillRect(10, 4, 12, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(8, 2, 4, 4); // Left horn
      ctx.fillRect(20, 2, 4, 4); // Right horn

      // Skull & Glowing Red Eye Sockets
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(11, 10, 10, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(13, 12, 2, 2);
      ctx.fillRect(17, 12, 2, 2);

      // Spine & Ribcage
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(14, 16, 4, 8);
      ctx.fillRect(10, 18, 12, 2);
      ctx.fillRect(11, 21, 10, 2);

      // Iron Shield in Left Hand
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(5, 14);
      ctx.lineTo(10, 14);
      ctx.lineTo(10, 24);
      ctx.lineTo(7, 27);
      ctx.lineTo(5, 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(7, 18, 2, 4); // Shield crest

      // Rusty Broadsword in Right Hand
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(23, 10, 2, 14);
      ctx.fillRect(21, 19, 6, 2); // Crossguard
      ctx.fillStyle = '#b45309';
      ctx.fillRect(23, 12, 2, 6); // Rust accents

      // Bone Legs
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(12, 24, 3, 7);
      ctx.fillRect(17, 24, 3, 7);

      skCanvas.refresh();
    }

    // 2. Abyssal Predator / Cave Stalker (36x24)
    const predCanvas = this.textures.createCanvas('enemy_predator', 36, 24);
    if (predCanvas) {
      const ctx = predCanvas.context;
      // Chitinous Dark Body
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(18, 12, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sharp Back Spikes
      ctx.fillStyle = '#00f5ff';
      ctx.beginPath();
      ctx.moveTo(12, 6); ctx.lineTo(14, 1); ctx.lineTo(16, 6);
      ctx.moveTo(18, 5); ctx.lineTo(20, 0); ctx.lineTo(22, 5);
      ctx.moveTo(24, 6); ctx.lineTo(26, 2); ctx.lineTo(28, 6);
      ctx.fill();

      // Head & Glowing Red Multi-Eyes
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(26, 8, 8, 7);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(30, 9, 2, 2);
      ctx.fillRect(33, 9, 2, 2);
      ctx.fillRect(31, 12, 2, 2);

      // Venomous Fangs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(32, 15, 2, 3);
      ctx.fillRect(34, 15, 2, 3);

      // Arachnid / Beast Legs
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 14); ctx.lineTo(8, 22); ctx.lineTo(4, 22);
      ctx.moveTo(16, 14); ctx.lineTo(14, 22); ctx.lineTo(11, 22);
      ctx.moveTo(22, 14); ctx.lineTo(24, 22); ctx.lineTo(27, 22);
      ctx.moveTo(26, 14); ctx.lineTo(30, 22); ctx.lineTo(34, 22);
      ctx.stroke();

      predCanvas.refresh();
    }

    // 3. The Abyssal Dragon Boss (88x56)
    const dragCanvas = this.textures.createCanvas('enemy_dragon', 88, 56);
    if (dragCanvas) {
      const ctx = dragCanvas.context;
      // Massive Draconic Wings
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      // Left Wing
      ctx.moveTo(34, 24);
      ctx.quadraticCurveTo(12, 2, 2, 14);
      ctx.lineTo(8, 28);
      ctx.lineTo(18, 30);
      ctx.lineTo(28, 28);
      // Right Wing
      ctx.moveTo(50, 24);
      ctx.quadraticCurveTo(72, 2, 84, 14);
      ctx.lineTo(78, 28);
      ctx.lineTo(68, 30);
      ctx.lineTo(58, 28);
      ctx.closePath();
      ctx.fill();

      // Wing Struts & Claws
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(34, 24); ctx.lineTo(12, 4); ctx.lineTo(2, 14);
      ctx.moveTo(50, 24); ctx.lineTo(72, 4); ctx.lineTo(84, 14);
      ctx.stroke();

      // Muscular Red Scaled Body
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(42, 32, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Underbelly Gold Plates
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(42, 36, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horned Draconic Head & Neck
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(48, 28);
      ctx.lineTo(60, 20);
      ctx.lineTo(74, 22);
      ctx.lineTo(72, 28);
      ctx.lineTo(54, 34);
      ctx.closePath();
      ctx.fill();

      // Golden Crown Horns
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(64, 18); ctx.lineTo(72, 10); ctx.lineTo(68, 18);
      ctx.moveTo(60, 19); ctx.lineTo(64, 12); ctx.lineTo(62, 19);
      ctx.fill();

      // Burning Eye & Maw Smoke
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(66, 21, 3, 3);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(72, 24, 4, 3); // Gaping fiery maw

      // Spiked Dragon Tail
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(28, 34);
      ctx.quadraticCurveTo(16, 40, 10, 48);
      ctx.stroke();

      // Tail Barb
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(10, 48); ctx.lineTo(4, 52); ctx.lineTo(12, 54);
      ctx.closePath();
      ctx.fill();

      dragCanvas.refresh();
    }

    // 4. Fireball Projectile (16x16)
    const fireCanvas = this.textures.createCanvas('projectile_fireball', 16, 16);
    if (fireCanvas) {
      const ctx = fireCanvas.context;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(8, 8, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      fireCanvas.refresh();
    }
  }

  /**
   * Textures for post-mining changes: excavated rock cavities, rubble mounds,
   * descent hatches, and ladder shafts.
   */
  private createDungeonExcavationTextures() {
    // 1. Excavated Depleted Socket (shows where ore was dug out)
    const sockCanvas = this.textures.createCanvas('ore_socket_depleted', 32, 32);
    if (sockCanvas) {
      const ctx = sockCanvas.context;
      // Dark hollowed stone cavity
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.fill();

      // Pickaxe chisel marks and cracks
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 8); ctx.lineTo(14, 14);
      ctx.moveTo(24, 8); ctx.lineTo(18, 14);
      ctx.moveTo(10, 22); ctx.lineTo(15, 18);
      ctx.stroke();

      // Timber brace supporting the cavity
      ctx.fillStyle = '#78350f';
      ctx.fillRect(4, 26, 24, 4);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(4, 2, 4, 26);
      ctx.fillRect(24, 2, 4, 26);

      sockCanvas.refresh();
    }

    // 2. Rubble Pile (mound of mined debris on the floor)
    const rubCanvas = this.textures.createCanvas('rubble_pile', 28, 14);
    if (rubCanvas) {
      const ctx = rubCanvas.context;
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(2, 13);
      ctx.lineTo(8, 4);
      ctx.lineTo(14, 2);
      ctx.lineTo(20, 5);
      ctx.lineTo(26, 13);
      ctx.closePath();
      ctx.fill();

      // Rubble highlights
      ctx.fillStyle = '#64748b';
      ctx.fillRect(7, 5, 4, 3);
      ctx.fillRect(15, 4, 4, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(10, 7, 3, 2);
      ctx.fillRect(19, 8, 3, 2);

      rubCanvas.refresh();
    }

    // 3. Deep Descent Portal Archway (48x48)
    const portalCanvas = this.textures.createCanvas('descent_portal', 48, 48);
    if (portalCanvas) {
      const ctx = portalCanvas.context;
      // Stone Arch Frame
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(24, 24, 20, Math.PI, 0);
      ctx.lineTo(44, 46);
      ctx.lineTo(4, 46);
      ctx.closePath();
      ctx.fill();

      // Glowing Portal Abyss
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(24, 26, 14, Math.PI, 0);
      ctx.lineTo(38, 46);
      ctx.lineTo(10, 46);
      ctx.closePath();
      ctx.fill();

      // Inner magical vortex glow
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(24, 30, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(24, 30, 4, 0, Math.PI * 2);
      ctx.fill();

      // Carved Runic Keystone
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(22, 2, 4, 5);

      portalCanvas.refresh();
    }
  }

  /**
   * Textures for 2.5D Surface World:
   * Isometric plot foundation slabs, walking citizens, street lamps, and fountain.
   */
  private createSurfaceWorldTextures() {
    // 1. Isometric Plot Foundation Pad (84x40) - Shows genuine length and breadth
    const padCanvas = this.textures.createCanvas('iso_plot_pad', 84, 40);
    if (padCanvas) {
      const ctx = padCanvas.context;
      // Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(42, 34, 38, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Isometric Top Surface (Length & Breadth)
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(42, 2);   // Back top
      ctx.lineTo(80, 18);  // Right corner
      ctx.lineTo(42, 32);  // Front corner
      ctx.lineTo(4, 18);   // Left corner
      ctx.closePath();
      ctx.fill();

      // Flagstone grid on pad
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(23, 10); ctx.lineTo(61, 25);
      ctx.moveTo(61, 10); ctx.lineTo(23, 25);
      ctx.stroke();

      // Isometric Left Bevel Face
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(4, 18);
      ctx.lineTo(42, 32);
      ctx.lineTo(42, 37);
      ctx.lineTo(4, 23);
      ctx.closePath();
      ctx.fill();

      // Isometric Right Bevel Face
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(42, 32);
      ctx.lineTo(80, 18);
      ctx.lineTo(80, 23);
      ctx.lineTo(42, 37);
      ctx.closePath();
      ctx.fill();

      padCanvas.refresh();
    }

    // 2. Walking Townsperson / Citizen (20x28)
    const citCanvas = this.textures.createCanvas('citizen_walk', 20, 28);
    if (citCanvas) {
      const ctx = citCanvas.context;
      // Head & Hair
      ctx.fillStyle = '#b45309';
      ctx.fillRect(6, 2, 8, 4);
      ctx.fillStyle = '#fcd34d';
      ctx.fillRect(7, 5, 6, 5);

      // Tunic / Dress
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(6, 10, 8, 10);
      ctx.fillStyle = '#f8fafc'; // Apron
      ctx.fillRect(7, 12, 6, 7);

      // Legs / Boots
      ctx.fillStyle = '#334155';
      ctx.fillRect(7, 20, 2, 6);
      ctx.fillRect(11, 20, 2, 6);

      citCanvas.refresh();
    }

    // 3. Street Lamp Post (18x44)
    const lampCanvas = this.textures.createCanvas('street_lamp_post', 18, 44);
    if (lampCanvas) {
      const ctx = lampCanvas.context;
      // Post
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 10, 2, 32);
      ctx.fillRect(5, 40, 8, 3); // Base

      // Lantern Cage
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(6, 6, 6, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(7, 7, 4, 6); // Warm glowing light core

      // Roof
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(4, 6); ctx.lineTo(9, 2); ctx.lineTo(14, 6);
      ctx.closePath();
      ctx.fill();

      lampCanvas.refresh();
    }
  }
}
