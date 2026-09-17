import Phaser from 'phaser';
import { sounds } from '../audio/SoundEffects';

interface SlideData {
  frameworkBadge: string;
  badgeColor: number;
  badgeColorStr: string;
  title: string;
  tagline: string;
  telemetryHeader: string;
  metrics: { icon: string; label: string; value: string; color?: string }[];
  consequenceTitle: string;
  consequenceDesc: string;
  consequenceAlert: string;
  alertColor: string;
  slideType: 'surface' | 'cavern' | 'consequences';
}

export class OpeningDemoScene extends Phaser.Scene {
  private currentSlideIndex: number = 0;
  private isTransitioning: boolean = false;

  // Background and effects
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private scannerLine!: Phaser.GameObjects.Graphics;
  private scannerY: number = 0;
  private particles: { x: number; y: number; speed: number; size: number; alpha: number; sway: number; swaySpeed: number }[] = [];
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private crestContainer!: Phaser.GameObjects.Container;
  private crestGraphics!: Phaser.GameObjects.Graphics;

  // Slide UI containers
  private slideContainer!: Phaser.GameObjects.Container;
  private dioramaContainer!: Phaser.GameObjects.Container;
  private tabsContainer!: Phaser.GameObjects.Container;
  private tabButtons: { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; index: number }[] = [];

  // Timer & auto-advance
  private autoAdvanceTimer: number = 0;
  private readonly slideDuration: number = 7000; // 7 seconds per slide
  private progressBar!: Phaser.GameObjects.Rectangle;

  // Slides data
  private slides: SlideData[] = [
    {
      frameworkBadge: 'FRAMEWORK 1: THE RESOURCE BALANCING ACT',
      badgeColor: 0xf59e0b,
      badgeColorStr: '#f59e0b',
      title: 'THE SURFACE CITADEL',
      tagline: 'RULE YOUR REALM: Construct cottages, alchemist shops, forge keeps, and command armies.',
      telemetryHeader: '[SURFACE LOAD & SETTLEMENT TELEMETRY]',
      metrics: [
        { icon: '👑', label: 'KINGDOM STATUS', value: 'Expanding Medieval Realm' },
        { icon: '👥', label: 'POPULATION', value: 'Housed in Cottages & Manors' },
        { icon: '⚔️', label: 'MILITARY LEVY', value: 'Ramparts & Keeps Training Troops' },
        { icon: '⚖️', label: 'SYSTEMIC LAW', value: 'Every building adds deadweight load to bedrock' }
      ],
      consequenceTitle: '⚡ UNINTENDED RIPPLE: FOUNDATION CRACKING',
      consequenceDesc: 'Heavier castles and grand citadels exert crushing tonnage onto subterranean vaults.',
      consequenceAlert: '⚠️ SURFACE TECTONIC LOAD: INCREASING WITH EACH EXPANSION',
      alertColor: '#f59e0b',
      slideType: 'surface'
    },
    {
      frameworkBadge: 'FRAMEWORK 2: THE DELAYED RIPPLE EFFECT',
      badgeColor: 0x00f5ff,
      badgeColorStr: '#00f5ff',
      title: 'THE SUBTERRANEAN ABYSS',
      tagline: 'EXCAVATE THE DEPTHS: Mine coal, iron, lumens, and aether cores to fund your kingdom.',
      telemetryHeader: '[SUBTERRANEAN DRILL TELEMETRY]',
      metrics: [
        { icon: '⛏️', label: 'MINING EXPEDITION', value: '580m Beneath Capital Foundations' },
        { icon: '💎', label: 'ORE STRATA', value: 'Coal, Iron, Lumens & Aether' },
        { icon: '🧪', label: 'ALCHEMICAL FUEL', value: 'Lumens illuminate; Aether powers magic' },
        { icon: '⏳', label: 'DELAYED RIPPLE', value: 'Mining hollows support pillars beneath town' }
      ],
      consequenceTitle: '⚡ UNINTENDED RIPPLE: CAVE-IN RISK ACCUMULATING',
      consequenceDesc: 'Over-excavating creates empty voids. Early greed leads to sudden, delayed cavern collapses.',
      consequenceAlert: '⚠️ BEDROCK STRENGTH: COMPROMISED BY RAPID STRIP-MINING',
      alertColor: '#00f5ff',
      slideType: 'cavern'
    },
    {
      frameworkBadge: 'FRAMEWORK 3: THE PERVERSE INCENTIVE',
      badgeColor: 0xef4444,
      badgeColorStr: '#ef4444',
      title: 'UNEXPECTED CONSEQUENCES',
      tagline: 'BALANCE OR PERISH: Every rock mined cracks the ceiling. Smelters poison tree roots. Greed awakens Malgok!',
      telemetryHeader: '[SYSTEMIC CRISIS & DREAD TRIAD]',
      metrics: [
        { icon: '⚖️', label: 'THE BALANCING ACT', value: 'Surface Weight vs Excavated Void' },
        { icon: '☣️', label: 'ECO-DEGRADATION', value: 'Heavy Smelters leach acid into tree roots' },
        { icon: '😈', label: 'PERVERSE INCENTIVE', value: 'Greed accelerates Demon King Malgok awakening' },
        { icon: '🧪', label: 'SCIENTIFIC SOLUTION', value: 'Deploy Reagents, Hydraulic Jacks & Bio-Nutrients' }
      ],
      consequenceTitle: '🚨 CRITICAL SYSTEMIC THREAT: DREAD MALGOK',
      consequenceDesc: 'Greed creates catastrophic cascades. The player must engineer harmony or witness total ruin!',
      consequenceAlert: '🚨 COLLAPSE HAZARD: HARMONIZE CITADEL & CAVERN OR PERISH',
      alertColor: '#ef4444',
      slideType: 'consequences'
    }
  ];

  constructor() {
    super({ key: 'OpeningDemoScene' });
  }

  create() {
    this.isTransitioning = false;
    this.currentSlideIndex = 0;
    this.autoAdvanceTimer = 0;

    // Hide DOM floating nav and top HUD bars during cinematic
    if (typeof window !== 'undefined') {
      if (window.saoHoloUIInstance) {
        window.saoHoloUIInstance.hideNav();
      }
      const hud = document.getElementById('sao-playtime-hud');
      if (hud) hud.style.display = 'none';
      const header = document.querySelector('.header-bar') as HTMLElement;
      if (header) header.style.display = 'none';
    }

    const { width, height } = this.scale;

    // 1. Cyber space background & grid
    this.createBackgroundGrid();

    // 2. Holographic floating particles
    this.initHoloParticles();

    // 3. Top Cyber HUD Bar
    this.createTopTelemetryBar();

    // 4. Animated SAO Hexagonal Crest & Title
    this.createTitleAndCrest();

    // 5. Dynamic Slide & Diorama Showcase Container
    this.slideContainer = this.add.container(0, 0);
    this.dioramaContainer = this.add.container(0, 0);

    // 6. Slide Navigation Controls & Indicator Tabs
    this.createSlideNavigationTabs();

    // 7. Auto-advance Progress Bar
    this.createProgressBar();

    // 8. Bottom Action Controls ([▶ LINK START] & [⚡ SKIP PROLOGUE])
    this.createActionButtons();

    // 9. Render Initial Slide
    this.renderSlide(0);

    // 10. Register Keyboard Shortcuts
    this.registerInputListeners();

    // Camera fade-in
    this.cameras.main.fadeIn(400, 0, 8, 20);
  }

  private createBackgroundGrid() {
    const { width, height } = this.scale;

    // Solid dark blue-black base
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x070b18);
    bg.setDepth(-10);

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(-5);
    this.drawPerspectiveGrid();

    // Scanning laser line
    this.scannerLine = this.add.graphics();
    this.scannerLine.setDepth(-4);

    const onResize = () => {
      bg.setSize(this.scale.width, this.scale.height).setPosition(this.scale.width / 2, this.scale.height / 2);
      this.drawPerspectiveGrid();
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });
  }

  private initHoloParticles() {
    this.particleGraphics = this.add.graphics();
    this.particleGraphics.setDepth(-3);

    const { width, height } = this.scale;
    this.particles = [];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: Phaser.Math.Between(20, width - 20),
        y: Phaser.Math.Between(30, height - 30),
        speed: Phaser.Math.FloatBetween(0.3, 0.9),
        size: Phaser.Math.Between(2, 5),
        alpha: Phaser.Math.FloatBetween(0.2, 0.75),
        sway: Phaser.Math.FloatBetween(0, Math.PI * 2),
        swaySpeed: Phaser.Math.FloatBetween(0.015, 0.035)
      });
    }
  }

  private createTopTelemetryBar() {
    const { width } = this.scale;

    // Dark glass bar
    const bar = this.add.rectangle(width / 2, 14, width, 28, 0x091024, 0.9)
      .setStrokeStyle(1, 0x00f5ff, 0.35);

    // Blinking live indicator
    const blinkDot = this.add.circle(20, 14, 4, 0x00f5ff, 1);
    this.tweens.add({
      targets: blinkDot,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    const leftText = this.add.text(32, 14, 'SYSTEM INITIALIZING... STRATA NEURAL NETWORK ONLINE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: '#00f5ff'
    }).setOrigin(0, 0.5);

    const rightText = this.add.text(width - 24, 14, 'SAO KERNEL v2.4 // 60 FPS // ENCRYPTED', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#f59e0b'
    }).setOrigin(1, 0.5);
  }

  private createTitleAndCrest() {
    const { width } = this.scale;
    const centerX = width / 2;

    this.crestContainer = this.add.container(centerX, 72);

    this.crestGraphics = this.add.graphics();
    this.drawHexCrest(this.crestGraphics);
    this.crestContainer.add(this.crestGraphics);

    // Continuous rotation for outer crest
    this.tweens.add({
      targets: this.crestGraphics,
      angle: 360,
      duration: 18000,
      repeat: -1,
      ease: 'Linear'
    });

    // Central Title: OVERBURDEN
    const mainTitle = this.add.text(centerX, 62, 'OVERBURDEN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#00f5ff',
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#00f5ff', blur: 12, stroke: true, fill: true }
    }).setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(centerX, 90, 'T A L E S   F R O M   T H E   U N D E R - T O W N', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5);

    // Glowing Neon Theme Banner
    const themeBg = this.add.rectangle(centerX, 116, 440, 22, 0x0e172a, 0.95)
      .setStrokeStyle(1.5, 0x00f5ff, 0.7);

    const themeText = this.add.text(centerX, 116, '✦ THEME: UNEXPECTED CONSEQUENCES ✦', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#7ee787'
    }).setOrigin(0.5);

    // Pulsing glow on theme banner
    this.tweens.add({
      targets: themeBg,
      strokeAlpha: 0.3,
      duration: 1200,
      yoyo: true,
      repeat: -1
    });
  }

  private drawHexCrest(g: Phaser.GameObjects.Graphics) {
    g.clear();
    const radius = 38;

    // Outer hexagon
    g.lineStyle(2, 0x00f5ff, 0.6);
    this.drawHexagon(g, 0, 0, radius);

    // Dashed inner circle
    g.lineStyle(1.5, 0xf59e0b, 0.5);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x1 = Math.cos(a) * (radius - 8);
      const y1 = Math.sin(a) * (radius - 8);
      const x2 = Math.cos(a + 0.3) * (radius - 8);
      const y2 = Math.sin(a + 0.3) * (radius - 8);
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    }

    // Corner decorative ticks
    g.fillStyle(0x00f5ff, 0.8);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      g.fillCircle(tx, ty, 2.5);
    }
  }

  private drawHexagon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.stroke();
  }

  private createSlideNavigationTabs() {
    const { width } = this.scale;
    const centerY = 512;
    this.tabsContainer = this.add.container(0, 0);

    // Prev Button
    const prevBtn = this.add.rectangle(width / 2 - 270, centerY, 88, 28, 0x162036, 0.9)
      .setStrokeStyle(1.5, 0x00f5ff, 0.6)
      .setInteractive({ useHandCursor: true });

    const prevText = this.add.text(width / 2 - 270, centerY, '◀ PREV', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#00f5ff'
    }).setOrigin(0.5);

    prevBtn.on('pointerdown', () => {
      sounds.playSaoSelect();
      this.prevSlide();
    });
    prevBtn.on('pointerover', () => prevBtn.setFillStyle(0x1e2e4e));
    prevBtn.on('pointerout', () => prevBtn.setFillStyle(0x162036));

    // Next Button
    const nextBtn = this.add.rectangle(width / 2 + 270, centerY, 88, 28, 0x162036, 0.9)
      .setStrokeStyle(1.5, 0x00f5ff, 0.6)
      .setInteractive({ useHandCursor: true });

    const nextText = this.add.text(width / 2 + 270, centerY, 'NEXT ▶', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#00f5ff'
    }).setOrigin(0.5);

    nextBtn.on('pointerdown', () => {
      sounds.playSaoSelect();
      this.nextSlide();
    });
    nextBtn.on('pointerover', () => nextBtn.setFillStyle(0x1e2e4e));
    nextBtn.on('pointerout', () => nextBtn.setFillStyle(0x162036));

    // 3 Step Tabs
    const tabLabels = ['01 🏛️ CITADEL', '02 ⛏️ CAVERN', '03 ⚖️ CONSEQUENCES'];
    const tabWidth = 145;
    const startX = width / 2 - tabWidth;

    this.tabButtons = [];
    tabLabels.forEach((label, idx) => {
      const tx = startX + idx * (tabWidth + 8);
      const tabBg = this.add.rectangle(tx, centerY, tabWidth, 28, 0x111a2e, 0.95)
        .setStrokeStyle(1.5, 0x304260)
        .setInteractive({ useHandCursor: true });

      const tabText = this.add.text(tx, centerY, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7.5px',
        color: '#8b949e'
      }).setOrigin(0.5);

      tabBg.on('pointerdown', () => {
        sounds.playSaoSelect();
        this.renderSlide(idx);
      });

      this.tabButtons.push({ bg: tabBg, text: tabText, index: idx });
      this.tabsContainer.add([tabBg, tabText]);
    });

    this.tabsContainer.add([prevBtn, prevText, nextBtn, nextText]);
  }

  private createProgressBar() {
    const { width } = this.scale;
    // Base tracking line
    this.add.rectangle(width / 2, 534, 600, 3, 0x1e293b, 0.8);

    // Glowing cyan fill bar
    this.progressBar = this.add.rectangle(width / 2 - 300, 534, 0, 3, 0x00f5ff, 1)
      .setOrigin(0, 0.5);
  }

  private createActionButtons() {
    const { width, height } = this.scale;
    const btnY = 576;

    // 1. Prominent Glowing Gold Button: [▶ LINK START: ENTER STRATA]
    const linkBtnX = width / 2 - 130;
    const linkBtnW = 280;
    const linkBtnH = 44;

    const linkBtnBg = this.add.rectangle(linkBtnX, btnY, linkBtnW, linkBtnH, 0x1a1505, 0.95)
      .setStrokeStyle(2, 0xf59e0b, 1)
      .setInteractive({ useHandCursor: true });

    // Inner gold gradient line
    const linkAccent = this.add.rectangle(linkBtnX, btnY - (linkBtnH / 2) + 2, linkBtnW - 8, 2, 0xfbbf24, 0.8);

    const linkBtnText = this.add.text(linkBtnX, btnY, '▶ LINK START: ENTER STRATA', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#fbbf24'
    }).setOrigin(0.5);

    // Pulsing scale tween on LINK START
    this.tweens.add({
      targets: [linkBtnBg, linkAccent, linkBtnText],
      scaleX: 1.025,
      scaleY: 1.025,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    linkBtnBg.on('pointerover', () => {
      linkBtnBg.setFillStyle(0x382806);
      linkBtnBg.setStrokeStyle(2.5, 0xffe066);
    });
    linkBtnBg.on('pointerout', () => {
      linkBtnBg.setFillStyle(0x1a1505);
      linkBtnBg.setStrokeStyle(2, 0xf59e0b);
    });
    linkBtnBg.on('pointerdown', () => {
      this.triggerLinkStart();
    });

    // 2. Fast Skip Button: [⚡ SKIP PROLOGUE (ESC)]
    const skipBtnX = width / 2 + 155;
    const skipBtnW = 230;
    const skipBtnH = 42;

    const skipBtnBg = this.add.rectangle(skipBtnX, btnY, skipBtnW, skipBtnH, 0x0b1326, 0.9)
      .setStrokeStyle(1.5, 0x00f5ff, 0.6)
      .setInteractive({ useHandCursor: true });

    const skipBtnText = this.add.text(skipBtnX, btnY, '⚡ SKIP PROLOGUE (ESC)', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8.5px',
      color: '#e2e8f0'
    }).setOrigin(0.5);

    skipBtnBg.on('pointerover', () => {
      skipBtnBg.setFillStyle(0x162544);
      skipBtnBg.setStrokeStyle(2, 0x00f5ff);
      skipBtnText.setColor('#00f5ff');
    });
    skipBtnBg.on('pointerout', () => {
      skipBtnBg.setFillStyle(0x0b1326);
      skipBtnBg.setStrokeStyle(1.5, 0x00f5ff, 0.6);
      skipBtnText.setColor('#e2e8f0');
    });
    skipBtnBg.on('pointerdown', () => {
      this.triggerSkip();
    });

    // 3. Controls hint
    this.add.text(width / 2, 616, 'PRESS [SPACE] OR [ENTER] TO DIVE  •  [ESC] TO SKIP  •  [← / →] TO NAVIGATE', {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#64748b'
    }).setOrigin(0.5);
  }

  private registerInputListeners() {
    this.input.keyboard?.on('keydown-SPACE', () => this.triggerLinkStart());
    this.input.keyboard?.on('keydown-ENTER', () => this.triggerLinkStart());
    this.input.keyboard?.on('keydown-ESC', () => this.triggerSkip());
    this.input.keyboard?.on('keydown-LEFT', () => {
      sounds.playSaoSelect();
      this.prevSlide();
    });
    this.input.keyboard?.on('keydown-A', () => {
      sounds.playSaoSelect();
      this.prevSlide();
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      sounds.playSaoSelect();
      this.nextSlide();
    });
    this.input.keyboard?.on('keydown-D', () => {
      sounds.playSaoSelect();
      this.nextSlide();
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners();
    });
  }

  private prevSlide() {
    const nextIdx = (this.currentSlideIndex - 1 + this.slides.length) % this.slides.length;
    this.renderSlide(nextIdx);
  }

  private nextSlide() {
    const nextIdx = (this.currentSlideIndex + 1) % this.slides.length;
    this.renderSlide(nextIdx);
  }

  private renderSlide(index: number) {
    this.currentSlideIndex = index;
    this.autoAdvanceTimer = 0;
    if (this.progressBar) this.progressBar.width = 0;

    const data = this.slides[index];
    const { width } = this.scale;

    // Update tab styles
    this.tabButtons.forEach((tab, i) => {
      if (i === index) {
        tab.bg.setFillStyle(0x162c50, 1);
        tab.bg.setStrokeStyle(2, 0x00f5ff, 1);
        tab.text.setColor('#00f5ff');
      } else {
        tab.bg.setFillStyle(0x111a2e, 0.9);
        tab.bg.setStrokeStyle(1.5, 0x304260, 0.8);
        tab.text.setColor('#8b949e');
      }
    });

    // Clear old slide content
    this.slideContainer.removeAll(true);
    this.dioramaContainer.removeAll(true);

    // --- Slide Header Area (y = 145 to 190) ---
    const badgeBg = this.add.rectangle(width / 2, 150, 480, 20, 0x0e172a, 0.9)
      .setStrokeStyle(1, data.badgeColor, 0.8);

    const badgeText = this.add.text(width / 2, 150, data.frameworkBadge, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: data.badgeColorStr
    }).setOrigin(0.5);

    const titleText = this.add.text(width / 2, 178, data.title, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const taglineText = this.add.text(width / 2, 200, data.tagline, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#94a3b8'
    }).setOrigin(0.5);

    this.slideContainer.add([badgeBg, badgeText, titleText, taglineText]);

    // --- Split Showcase Layout (y = 220 to 480) ---
    // Left Stage: Visual Diorama (x = 60 to 490)
    // Right Stage: SAO Holographic Telemetry (x = 510 to 964)
    this.renderDiorama(data.slideType);
    this.renderTelemetryPanel(data);

    // Slide transition entrance animation
    this.slideContainer.setAlpha(0);
    this.dioramaContainer.setAlpha(0);
    this.tweens.add({
      targets: [this.slideContainer, this.dioramaContainer],
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
  }

  private renderDiorama(type: 'surface' | 'cavern' | 'consequences') {
    const stageX = 275;
    const stageY = 345;

    // Diorama stage backdrop frame
    const stageBox = this.add.rectangle(stageX, stageY, 430, 255, 0x091224, 0.85)
      .setStrokeStyle(1.5, 0x00f5ff, 0.4);

    // Subtle corner markers
    const corners = this.add.graphics();
    corners.lineStyle(2, 0x00f5ff, 0.8);
    // top-left
    corners.moveTo(stageX - 215, stageY - 110); corners.lineTo(stageX - 215, stageY - 127); corners.lineTo(stageX - 198, stageY - 127);
    // top-right
    corners.moveTo(stageX + 198, stageY - 127); corners.lineTo(stageX + 215, stageY - 127); corners.lineTo(stageX + 215, stageY - 110);
    // bottom-left
    corners.moveTo(stageX - 215, stageY + 110); corners.lineTo(stageX - 215, stageY + 127); corners.lineTo(stageX - 198, stageY + 127);
    // bottom-right
    corners.moveTo(stageX + 198, stageY + 127); corners.lineTo(stageX + 215, stageY + 127); corners.lineTo(stageX + 215, stageY + 110);
    corners.stroke();

    this.dioramaContainer.add([stageBox, corners]);

    if (type === 'surface') {
      // 1. Surface Platform & Buildings
      const groundY = stageY + 50;

      // Floating island grass pads
      for (let i = -3; i <= 3; i++) {
        const tile = this.add.image(stageX + i * 32, groundY, 'tile_grass');
        this.dioramaContainer.add(tile);
        const dirt = this.add.image(stageX + i * 32, groundY + 32, 'tile_dirt');
        this.dioramaContainer.add(dirt);
      }

      // Buildings & Trees
      const citadel = this.add.image(stageX - 10, groundY - 32, 'bldg_grand_citadel');
      const keep = this.add.image(stageX + 75, groundY - 32, 'bldg_royal_keep');
      const cottage = this.add.image(stageX - 90, groundY - 32, 'bldg_cottage');
      const alchemist = this.add.image(stageX + 140, groundY - 32, 'bldg_alchemist');
      const tree1 = this.add.image(stageX - 145, groundY - 32, 'tree_green');
      const tree2 = this.add.image(stageX - 55, groundY - 32, 'tree_green');

      // Floating island gentle float tween
      const surfaceObjects = [citadel, keep, cottage, alchemist, tree1, tree2];
      this.dioramaContainer.add(surfaceObjects);

      // Sun / Aether glow in the diorama sky
      const sun = this.add.circle(stageX + 130, stageY - 70, 24, 0xf59e0b, 0.4);
      this.dioramaContainer.add(sun);

      // Floating spark particles
      for (let p = 0; p < 6; p++) {
        const spark = this.add.image(stageX + Phaser.Math.Between(-120, 120), groundY - Phaser.Math.Between(20, 90), 'particle_spark');
        this.dioramaContainer.add(spark);
        this.tweens.add({
          targets: spark,
          y: spark.y - 25,
          alpha: 0.1,
          duration: Phaser.Math.Between(1000, 1800),
          yoyo: true,
          repeat: -1
        });
      }

      // Stage label
      const stageLabel = this.add.text(stageX, stageY - 105, 'SURFACE REALM // POPULATION & EXPANSION', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#f59e0b'
      }).setOrigin(0.5);
      this.dioramaContainer.add(stageLabel);

    } else if (type === 'cavern') {
      // 2. Subterranean Abyss Diorama
      const groundY = stageY + 50;

      // Stone floor and ore veins
      const oreKeys = ['tile_stone', 'ore_iron', 'tile_stone', 'ore_coal', 'ore_lumens', 'ore_aether', 'tile_stone'];
      oreKeys.forEach((key, idx) => {
        const tx = stageX - 96 + idx * 32;
        const tile = this.add.image(tx, groundY, key);
        const subTile = this.add.image(tx, groundY + 32, 'tile_stone');
        this.dioramaContainer.add([tile, subTile]);
      });

      // Ceiling and Stalactites
      for (let c = -3; c <= 3; c++) {
        const ceil = this.add.image(stageX + c * 32, stageY - 60, 'tile_stone');
        this.dioramaContainer.add(ceil);
      }
      const stal1 = this.add.image(stageX - 60, stageY - 40, 'stalactite');
      const stal2 = this.add.image(stageX + 40, stageY - 40, 'stalactite');
      this.dioramaContainer.add([stal1, stal2]);

      // Miner player sprite & pickaxe
      const player = this.add.image(stageX - 10, groundY - 16, 'player');
      const pickaxe = this.add.image(stageX + 16, groundY - 20, 'pickaxe');
      this.dioramaContainer.add([player, pickaxe]);

      // Pickaxe swinging animation
      this.tweens.add({
        targets: pickaxe,
        angle: 45,
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Mining sparks bursting
      for (let s = 0; s < 5; s++) {
        const spark = this.add.image(stageX + 24, groundY - 10, 'particle_spark');
        this.dioramaContainer.add(spark);
        this.tweens.add({
          targets: spark,
          x: stageX + Phaser.Math.Between(25, 60),
          y: groundY - Phaser.Math.Between(15, 45),
          alpha: 0,
          duration: 600,
          repeat: -1,
          delay: s * 120
        });
      }

      // Stage label
      const stageLabel = this.add.text(stageX, stageY - 105, 'SUBTERRANEAN DRILL // EXCAVATION & VOIDS', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#00f5ff'
      }).setOrigin(0.5);
      this.dioramaContainer.add(stageLabel);

    } else {
      // 3. Unexpected Consequences Diorama
      const groundY = stageY + 50;

      // Cracked ground / ceiling
      const crackedKeys = ['tile_cracked_ceiling', 'tile_stone', 'tile_cracked_ceiling', 'tile_mud', 'tile_cracked_ceiling', 'tile_stone', 'tile_cracked_ceiling'];
      crackedKeys.forEach((key, idx) => {
        const tx = stageX - 96 + idx * 32;
        const tile = this.add.image(tx, groundY, key);
        this.dioramaContainer.add(tile);
      });

      // Smelter belching smoke & withered tree
      const smelter = this.add.image(stageX - 70, groundY - 32, 'bldg_smelter');
      const deadTree = this.add.image(stageX + 70, groundY - 32, 'tree_withered');
      this.dioramaContainer.add([smelter, deadTree]);

      // Ominous Malgok demon shadow glow
      const demonGlow = this.add.circle(stageX + 5, stageY - 25, 45, 0xef4444, 0.25);
      this.tweens.add({
        targets: demonGlow,
        scaleX: 1.25,
        scaleY: 1.25,
        alpha: 0.45,
        duration: 800,
        yoyo: true,
        repeat: -1
      });
      const demonSymbol = this.add.text(stageX + 5, stageY - 25, '😈\nMALGOK', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#ff4d4d',
        align: 'center'
      }).setOrigin(0.5);
      this.dioramaContainer.add([demonGlow, demonSymbol]);

      // Acid dripping particles
      for (let a = 0; a < 6; a++) {
        const acid = this.add.image(stageX - 70 + Phaser.Math.Between(-15, 15), groundY - 40, 'particle_acid');
        this.dioramaContainer.add(acid);
        this.tweens.add({
          targets: acid,
          y: groundY + 10,
          alpha: 0.1,
          duration: Phaser.Math.Between(700, 1200),
          repeat: -1,
          delay: a * 150
        });
      }

      // Stage label
      const stageLabel = this.add.text(stageX, stageY - 105, 'THE SYSTEMIC COLLAPSE // OVERBURDEN CRISIS', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#ef4444'
      }).setOrigin(0.5);
      this.dioramaContainer.add(stageLabel);
    }
  }

  private renderTelemetryPanel(data: SlideData) {
    const panelX = 745;
    const panelY = 345;
    const panelW = 460;
    const panelH = 255;

    // Dark SAO glass panel
    const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x0a1226, 0.92)
      .setStrokeStyle(1.5, data.badgeColor, 0.6);

    // Corner decorative brackets
    const brackets = this.add.graphics();
    brackets.lineStyle(2, data.badgeColor, 0.9);
    const halfW = panelW / 2;
    const halfH = panelH / 2;
    // top-left
    brackets.moveTo(panelX - halfW, panelY - halfH + 16); brackets.lineTo(panelX - halfW, panelY - halfH); brackets.lineTo(panelX - halfW + 16, panelY - halfH);
    // top-right
    brackets.moveTo(panelX + halfW - 16, panelY - halfH); brackets.lineTo(panelX + halfW, panelY - halfH); brackets.lineTo(panelX + halfW, panelY - halfH + 16);
    // bottom-left
    brackets.moveTo(panelX - halfW, panelY + halfH - 16); brackets.lineTo(panelX - halfW, panelY + halfH); brackets.lineTo(panelX - halfW + 16, panelY + halfH);
    // bottom-right
    brackets.moveTo(panelX + halfW - 16, panelY + halfH); brackets.lineTo(panelX + halfW, panelY + halfH); brackets.lineTo(panelX + halfW, panelY + halfH - 16);
    brackets.stroke();

    // Telemetry Header
    const headerText = this.add.text(panelX - halfW + 18, panelY - halfH + 16, data.telemetryHeader, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: data.badgeColorStr
    });

    this.slideContainer.add([panelBg, brackets, headerText]);

    // Metrics List
    const startY = panelY - halfH + 42;
    data.metrics.forEach((m, idx) => {
      const my = startY + idx * 27;

      const rowBg = this.add.rectangle(panelX, my + 6, panelW - 32, 22, 0x111c34, 0.7)
        .setStrokeStyle(1, 0x1e2f52, 0.5);

      const icon = this.add.text(panelX - halfW + 24, my + 6, m.icon, {
        fontSize: '13px'
      }).setOrigin(0, 0.5);

      const label = this.add.text(panelX - halfW + 48, my + 6, m.label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: '#58a6ff'
      }).setOrigin(0, 0.5);

      const value = this.add.text(panelX + halfW - 24, my + 6, m.value, {
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(1, 0.5);

      this.slideContainer.add([rowBg, icon, label, value]);
    });

    // Consequence Deep-Dive Box
    const consBoxY = panelY + 54;
    const consBox = this.add.rectangle(panelX, consBoxY, panelW - 32, 54, 0x16121a, 0.95)
      .setStrokeStyle(1.5, data.badgeColor, 0.8);

    const consTitle = this.add.text(panelX, consBoxY - 14, data.consequenceTitle, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7.5px',
      color: data.badgeColorStr
    }).setOrigin(0.5);

    const consDesc = this.add.text(panelX, consBoxY + 10, data.consequenceDesc, {
      fontFamily: '"Rajdhani", sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#e2e8f0',
      align: 'center',
      wordWrap: { width: panelW - 50 }
    }).setOrigin(0.5);

    // Alert Callout Bar
    const alertY = panelY + 104;
    const alertBg = this.add.rectangle(panelX, alertY, panelW - 32, 22, 0x1a0f18, 0.9)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(data.alertColor).color, 0.9);

    const alertText = this.add.text(panelX, alertY, data.consequenceAlert, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6.5px',
      color: data.alertColor
    }).setOrigin(0.5);

    this.slideContainer.add([consBox, consTitle, consDesc, alertBg, alertText]);
  }

  private triggerLinkStart() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Play iconic SAO Link Start sound effect
    sounds.playLinkStart();

    // Camera flash with cyan neon tint
    this.cameras.main.flash(400, 0, 245, 255);

    // Zoom-in tween to simulate entering the virtual strata
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.5,
      duration: 550,
      ease: 'Cubic.easeIn'
    });

    // Camera fade out into game
    this.cameras.main.fade(550, 0, 8, 20, false, (_cam: unknown, progress: number) => {
      if (progress === 1) {
        this.launchGame();
      }
    });
  }

  private triggerSkip() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    sounds.playSaoConfirm();
    this.cameras.main.fade(250, 0, 0, 0, false, (_cam: unknown, progress: number) => {
      if (progress === 1) {
        this.launchGame();
      }
    });
  }

  private launchGame() {
    // Reveal DOM SAO Quick Navigation and top HUD bars
    if (typeof window !== 'undefined') {
      if (window.saoHoloUIInstance) {
        window.saoHoloUIInstance.showNav();
      }
      const hud = document.getElementById('sao-playtime-hud');
      if (hud) hud.style.display = 'flex';
      const header = document.querySelector('.header-bar') as HTMLElement;
      if (header) header.style.display = 'flex';
    }

    // Stop opening demo and start main gameplay scenes
    this.scene.stop('OpeningDemoScene');
    this.scene.start('SurfaceScene');
    this.scene.launch('UIScene');
  }

  update(_time: number, delta: number) {
    if (this.isTransitioning) return;

    // 1. Update scanning line
    this.scannerY = (this.scannerY + delta * 0.18) % this.scale.height;
    this.scannerLine.clear();
    this.scannerLine.lineStyle(1.5, 0x00f5ff, 0.4);
    this.scannerLine.lineBetween(0, this.scannerY, this.scale.width, this.scannerY);

    // 2. Update floating holo particles
    this.updateHoloParticles(delta);

    // 4. Auto-advance timer update
    this.autoAdvanceTimer += delta;
    const progress = Math.min(this.autoAdvanceTimer / this.slideDuration, 1);
    if (this.progressBar) {
      this.progressBar.width = progress * 600;
    }

    if (this.autoAdvanceTimer >= this.slideDuration) {
      this.nextSlide();
    }
  }

  private drawPerspectiveGrid() {
    this.gridGraphics.clear();
    const { width, height } = this.scale;
    const horizonY = 320;

    this.gridGraphics.lineStyle(1, 0x00f5ff, 0.12);

    // Radiating vertical lines from vanishing center
    const vanishX = width / 2;
    for (let x = -width * 0.5; x <= width * 1.5; x += 60) {
      this.gridGraphics.lineBetween(vanishX, horizonY, x, height);
    }

    // Horizontal perspective lines
    for (let y = horizonY + 20; y < height; y += (y - horizonY) * 0.35 + 8) {
      this.gridGraphics.lineBetween(0, y, width, y);
    }
  }

  private updateHoloParticles(delta: number) {
    this.particleGraphics.clear();
    const { width, height } = this.scale;

    for (const p of this.particles) {
      p.y -= p.speed * (delta / 16);
      p.sway += p.swaySpeed * (delta / 16);
      const curX = p.x + Math.sin(p.sway) * 8;

      if (p.y < 20) {
        p.y = height - 20;
        p.x = Phaser.Math.Between(20, width - 20);
      }

      // Draw particle as a glowing hexagon/circle
      this.particleGraphics.fillStyle(0x00f5ff, p.alpha);
      this.particleGraphics.fillCircle(curX, p.y, p.size);
      this.particleGraphics.lineStyle(1, 0xfbbf24, p.alpha * 0.5);
      this.particleGraphics.strokeCircle(curX, p.y, p.size + 1.5);
    }
  }
}
