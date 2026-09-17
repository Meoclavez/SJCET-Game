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
    // Launch main scenes
    this.scene.start('SurfaceScene');
    this.scene.launch('UIScene');
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

  private createBuildingTexture(key: string, wallColor: string, roofColor: string, emoji: string) {
    const c = this.textures.createCanvas(key, 64, 64);
    if (!c) return;
    const ctx = c.context;

    // Foundation & Walls
    ctx.fillStyle = wallColor;
    ctx.fillRect(8, 24, 48, 36);

    // Roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(4, 24);
    ctx.lineTo(32, 6);
    ctx.lineTo(60, 24);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(26, 42, 12, 18);

    // Windows
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(14, 32, 8, 8);
    ctx.fillRect(42, 32, 8, 8);

    // Emblem
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, 32, 22);

    c.refresh();
  }

  private createTreeTexture(key: string, foliage1: string, foliage2: string) {
    const c = this.textures.createCanvas(key, 40, 64);
    if (!c) return;
    const ctx = c.context;

    // Trunk
    ctx.fillStyle = '#78350f';
    ctx.fillRect(16, 36, 8, 28);

    // Leaves
    ctx.fillStyle = foliage2;
    ctx.beginPath();
    ctx.arc(20, 26, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = foliage1;
    ctx.beginPath();
    ctx.arc(17, 22, 14, 0, Math.PI * 2);
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
}
