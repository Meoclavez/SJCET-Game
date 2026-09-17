import * as THREE from 'three';
import { gameState } from '../state/GameState';
import { BuildingId } from '../types';
import { sounds } from '../audio/SoundEffects';
import { ProceduralTextures } from './ProceduralTextures';

interface AnimatedElement {
  update: (time: number, delta: number) => void;
}

interface SmokePuff {
  mesh: THREE.Mesh;
  initialY: number;
  maxHeight: number;
  speed: number;
  initialScale: number;
  driftX: number;
  driftZ: number;
}

export class CityShowcase3D {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock: THREE.Clock = new THREE.Clock();
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  private buildingMeshes: THREE.Group = new THREE.Group();
  private goldEmbersMesh!: THREE.Points;
  private cyanMotesMesh!: THREE.Points;
  private streetLanternLights: THREE.PointLight[] = [];

  private isAutoRotating: boolean = true;
  private cameraAngle: number = 0.5;
  private cameraRadius: number = 18;
  private cameraHeight: number = 10;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;

  private onWindowMouseUp: (() => void) | null = null;
  private onDomMouseDown: ((e: MouseEvent) => void) | null = null;
  private onDomMouseMove: ((e: MouseEvent) => void) | null = null;
  private onDomWheel: ((e: WheelEvent) => void) | null = null;

  private animatedElements: AnimatedElement[] = [];

  // Reusable Materials
  private stoneMat!: THREE.MeshStandardMaterial;
  private woodMat!: THREE.MeshStandardMaterial;
  private slateMat!: THREE.MeshStandardMaterial;
  private copperMat!: THREE.MeshStandardMaterial;
  private windowMat!: THREE.MeshStandardMaterial;
  private plasterMat!: THREE.MeshStandardMaterial;
  private goldMat!: THREE.MeshStandardMaterial;
  private ironMat!: THREE.MeshStandardMaterial;
  private cobblestoneMat!: THREE.MeshStandardMaterial;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init() {
    // 1. Scene setup with rich atmospheric fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.025);

    // 2. Camera setup
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 120);
    this.updateCameraPosition();

    // 3. WebGL Renderer with High-Fidelity Soft Shadows and Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // 4. Initialize Shared Architectural Materials with Procedural Textures
    this.initMaterials();

    // 5. High-Quality Lighting Setup
    this.setupLighting();

    // 6. Ground Island Diorama with Cobblestone Plaza and Strata
    this.buildGroundIsland();

    // 7. Buildings Group
    this.scene.add(this.buildingMeshes);
    this.rebuildCityMeshes();

    // 8. Enhanced Floating Atmospheric Motes (Gold & Cyan)
    this.createAtmosphericMotes();

    // 9. Interactive Orbit & Zoom Controls
    this.setupControls();

    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  private initMaterials() {
    this.stoneMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStoneMasonryTextureCloned(2, 2),
      bumpMap: ProceduralTextures.getStoneMasonryTextureCloned(2, 2),
      bumpScale: 0.04,
      roughness: 0.85,
      metalness: 0.05
    });

    this.woodMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getWoodPlankTextureCloned(1, 2),
      bumpMap: ProceduralTextures.getWoodPlankTextureCloned(1, 2),
      bumpScale: 0.03,
      roughness: 0.75,
      metalness: 0.02
    });

    this.slateMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getSlateRoofTextureCloned(false, 2, 2),
      bumpMap: ProceduralTextures.getSlateRoofTextureCloned(false, 2, 2),
      bumpScale: 0.05,
      roughness: 0.6,
      metalness: 0.12
    });

    this.copperMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getSlateRoofTextureCloned(true, 2, 2),
      bumpMap: ProceduralTextures.getSlateRoofTextureCloned(true, 2, 2),
      bumpScale: 0.04,
      roughness: 0.5,
      metalness: 0.35
    });

    this.windowMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStainedGlassTexture(),
      emissiveMap: ProceduralTextures.getStainedGlassTexture(),
      emissive: new THREE.Color(0xffe4a0),
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.1
    });

    this.plasterMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getTudorPlasterTexture(),
      roughness: 0.95,
      metalness: 0.0
    });

    this.goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85
    });

    this.ironMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.8
    });

    this.cobblestoneMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getCobblestoneTextureCloned(12, 2),
      bumpMap: ProceduralTextures.getCobblestoneTextureCloned(12, 2),
      bumpScale: 0.06,
      roughness: 0.9,
      metalness: 0.02
    });
  }

  private setupLighting() {
    // Cool ambient hemisphere fill light (azure sky / slate ground)
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.75);
    this.scene.add(hemiLight);

    // Warm golden-hour directional sun casting soft cinematic shadows
    const dirSun = new THREE.DirectionalLight(0xfff7ed, 1.8);
    dirSun.position.set(15, 24, 14);
    dirSun.castShadow = true;
    dirSun.shadow.mapSize.width = 2048;
    dirSun.shadow.mapSize.height = 2048;
    dirSun.shadow.camera.near = 0.5;
    dirSun.shadow.camera.far = 60;
    dirSun.shadow.camera.left = -16;
    dirSun.shadow.camera.right = 16;
    dirSun.shadow.camera.top = 16;
    dirSun.shadow.camera.bottom = -16;
    dirSun.shadow.bias = -0.0004;
    dirSun.shadow.normalBias = 0.02;
    this.scene.add(dirSun);

    // Subtle magical atmospheric rim lights
    const cyanRim = new THREE.PointLight(0x00f5ff, 1.2, 20);
    cyanRim.position.set(-10, 6, -8);
    this.scene.add(cyanRim);

    const amberRim = new THREE.PointLight(0xf59e0b, 1.2, 20);
    amberRim.position.set(10, 6, 8);
    this.scene.add(amberRim);
  }

  private buildGroundIsland() {
    const islandGroup = new THREE.Group();

    // 1. Upper grass diorama lawn
    const grassGeo = new THREE.CylinderGeometry(11.2, 11.8, 1.4, 48);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
      flatShading: true
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = -0.7;
    grass.receiveShadow = true;
    islandGroup.add(grass);

    // Stone retaining rim collar
    const rimGeo = new THREE.TorusGeometry(11.2, 0.25, 8, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStoneMasonryTextureCloned(16, 1),
      roughness: 0.85
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.02;
    islandGroup.add(rim);

    // 2. Cobblestone circular plaza path
    const ringGeo = new THREE.RingGeometry(4.2, 5.8, 48);
    const ring = new THREE.Mesh(ringGeo, this.cobblestoneMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    ring.receiveShadow = true;
    islandGroup.add(ring);

    // Cobblestone central plaza circle
    const centerCircleGeo = new THREE.CircleGeometry(2.4, 32);
    const centerCircle = new THREE.Mesh(centerCircleGeo, this.cobblestoneMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.024;
    centerCircle.receiveShadow = true;
    islandGroup.add(centerCircle);

    // Radiating cobblestone spokes connecting center to the ring
    for (let i = 0; i < 4; i++) {
      const spokeAngle = (i / 4) * Math.PI * 2;
      const spokeGeo = new THREE.PlaneGeometry(1.4, 2.0);
      const spoke = new THREE.Mesh(spokeGeo, this.cobblestoneMat);
      spoke.rotation.x = -Math.PI / 2;
      spoke.rotation.z = -spokeAngle;
      spoke.position.set(Math.cos(spokeAngle) * 3.3, 0.0245, Math.sin(spokeAngle) * 3.3);
      spoke.receiveShadow = true;
      islandGroup.add(spoke);
    }

    // 3. Ornate wrought-iron street lanterns along the plaza ring
    this.streetLanternLights = [];
    const lanternCount = 8;
    for (let i = 0; i < lanternCount; i++) {
      const angle = (i / lanternCount) * Math.PI * 2 + Math.PI / 8;
      const radius = 5.0;
      const lx = Math.cos(angle) * radius;
      const lz = Math.sin(angle) * radius;

      const lantern = this.createStreetLantern();
      lantern.position.set(lx, 0, lz);
      lantern.rotation.y = -angle;
      islandGroup.add(lantern);
    }

    // 4. Subterranean rock strata with glowing crystal veins underneath
    const strataGeo = new THREE.CylinderGeometry(11.8, 7.5, 4.2, 40);
    const strataMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getStoneMasonryTextureCloned(8, 4),
      color: 0x334155,
      roughness: 0.95,
      flatShading: true
    });
    const strata = new THREE.Mesh(strataGeo, strataMat);
    strata.position.y = -3.5;
    strata.receiveShadow = true;
    islandGroup.add(strata);

    // Glowing mineral crystal clusters jutting from the cliff faces
    for (let c = 0; c < 12; c++) {
      const ca = (c / 12) * Math.PI * 2 + 0.3;
      const cr = 8.8 - (c % 3) * 0.8;
      const cy = -2.2 - (c % 4) * 0.6;
      const isAether = c % 2 === 0;

      const crystalMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.35 + (c % 3) * 0.1, 0),
        new THREE.MeshStandardMaterial({
          color: isAether ? 0x00f5ff : 0xf59e0b,
          emissive: isAether ? 0x00f5ff : 0xf59e0b,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.6
        })
      );
      crystalMesh.position.set(Math.cos(ca) * cr, cy, Math.sin(ca) * cr);
      crystalMesh.rotation.set(Math.random(), Math.random(), Math.random());
      islandGroup.add(crystalMesh);
    }

    this.scene.add(islandGroup);
  }

  private createStreetLantern(): THREE.Group {
    const group = new THREE.Group();

    // Fluted cast-iron lamppost base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.3, 8), this.ironMat);
    base.position.y = 0.15;
    base.castShadow = true;

    // Slim post shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8), this.ironMat);
    shaft.position.y = 0.9;
    shaft.castShadow = true;

    // Curved bracket arm and lantern cage
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 6), this.ironMat);
    cage.position.y = 1.7;
    cage.castShadow = true;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.15, 6), this.goldMat);
    roof.position.y = 1.88;

    // Warm glowing amber glass core
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 0.22, 6),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.2,
        roughness: 0.2
      })
    );
    glass.position.y = 1.7;

    // Soft warm street point light
    const light = new THREE.PointLight(0xf59e0b, 1.2, 6.5);
    light.position.y = 1.7;
    group.add(base, shaft, cage, roof, glass, light);

    this.streetLanternLights.push(light);
    return group;
  }

  public rebuildCityMeshes() {
    // Clean old meshes and animations
    while (this.buildingMeshes.children.length > 0) {
      const child = this.buildingMeshes.children[0];
      child.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
      this.buildingMeshes.remove(child);
    }
    this.animatedElements = [];

    const plots = gameState.plots;
    plots.forEach((plot, idx) => {
      if (!plot.building) return;

      // Arrange plots in a circular kingdom plaza
      const angle = (idx / plots.length) * Math.PI * 2;
      const radius = 5.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const buildingMesh = this.createBuilding3D(plot.building);
      buildingMesh.position.set(x, 0, z);
      buildingMesh.rotation.y = -angle - Math.PI / 2;
      this.buildingMeshes.add(buildingMesh);
    });

    // Central Monument / Grand Citadel (if built)
    const keep = plots.find(
      p => p.building === BuildingId.GRAND_CITADEL || p.building === BuildingId.ROYAL_KEEP || p.building === BuildingId.SKY_MONUMENT
    );
    if (keep && keep.building) {
      const centerCastle = this.createBuilding3D(keep.building, true);
      centerCastle.position.set(0, 0, 0);
      this.buildingMeshes.add(centerCastle);
    } else {
      // Central Aether Fountain & Crystal
      const fountain = this.createCentralFountain();
      fountain.position.set(0, 0, 0);
      this.buildingMeshes.add(fountain);
    }

    // Dynamic Multi-Canopy Trees based on Root Stability
    const roots = gameState.metrics.rootIntegrity;
    const treeCount = Math.floor((roots / 100) * 14) + 6;
    for (let i = 0; i < treeCount; i++) {
      const a = (i / treeCount) * Math.PI * 2 + 0.15;
      const r = 8.8 + (i % 2) * 0.9 + ((i * 13) % 5) * 0.1;
      const tree = this.createTree3D(i);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      tree.rotation.y = (i * 1.7);
      this.buildingMeshes.add(tree);
    }
  }

  private createBuilding3D(type: BuildingId, isCenter = false): THREE.Group {
    switch (type) {
      case BuildingId.COTTAGE:
        return this.createCottage();

      case BuildingId.ALCHEMIST_SHOP:
        return this.createAlchemistShop();

      case BuildingId.BLACKSMITH_FORGE:
        return this.createBlacksmithForge();

      case BuildingId.CASTLE_RAMPART:
        return this.createCastleRampart();

      case BuildingId.ROYAL_KEEP:
        return this.createCastleCitadel(false, isCenter);

      case BuildingId.GRAND_CITADEL:
        return this.createCastleCitadel(true, isCenter);

      case BuildingId.TOWN_HALL:
        return this.createTownHall();

      case BuildingId.LUMBER_MILL:
        return this.createLumberMill();

      case BuildingId.SMELTER:
        return this.createSmelter();

      case BuildingId.FESTIVAL_PLAZA:
        return this.createFestivalPlaza();

      case BuildingId.ROOT_NURSERY:
        return this.createRootNursery();

      case BuildingId.CANAL_FILTER:
        return this.createCanalFilter();

      case BuildingId.SKY_MONUMENT:
        return this.createSkyMonument();

      default:
        return this.createGenericTownhouse();
    }
  }

  // ==========================================
  // HIGH-FIDELITY ARCHITECTURAL BUILDERS
  // ==========================================

  /**
   * Tudor-style Cottage: Pitched roof with eaves, timber framing, stone foundation, smoking chimney.
   */
  private createCottage(): THREE.Group {
    const group = new THREE.Group();

    // 1. Raised stone foundation plinth
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.4, 1.8), this.stoneMat);
    plinth.position.y = 0.2;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Front stone steps
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.35), this.stoneMat);
    step.position.set(0, 0.08, 0.95);
    group.add(step);

    // 2. Ground floor Tudor plaster body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.6), this.plasterMat);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    // Exposed dark oak timber framing: vertical posts
    const postGeo = new THREE.BoxGeometry(0.1, 1.12, 0.1);
    for (const [px, pz] of [[-0.95, -0.8], [0.95, -0.8], [-0.95, 0.8], [0.95, 0.8], [-0.35, 0.8], [0.35, 0.8]]) {
      const post = new THREE.Mesh(postGeo, this.woodMat);
      post.position.set(px, 0.95, pz);
      group.add(post);
    }

    // Horizontal timber beam belt
    const belt = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.08, 1.65), this.woodMat);
    belt.position.y = 1.48;
    group.add(belt);

    // Diagonal Tudor cross-braces on sides
    for (const sx of [-0.96, 0.96]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.08), this.woodMat);
      brace.position.set(sx, 0.95, 0);
      brace.rotation.x = Math.PI / 4;
      group.add(brace);
    }

    // 3. Overhanging upper floor & gables
    const upperFloor = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.7, 1.7), this.plasterMat);
    upperFloor.position.y = 1.85;
    upperFloor.castShadow = true;
    group.add(upperFloor);

    // Front and back triangular gables
    const gableGeo = new THREE.ConeGeometry(1.2, 0.8, 4);
    const gableFront = new THREE.Mesh(gableGeo, this.plasterMat);
    gableFront.rotation.y = Math.PI / 4;
    gableFront.position.set(0, 2.5, 0);
    gableFront.scale.set(1.2, 1.0, 1.0);
    group.add(gableFront);

    // 4. Steep pitched roof with wide eaves
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.1, 4), this.slateMat);
    roof.position.y = 2.65;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.15, 1.0, 0.95);
    roof.castShadow = true;
    group.add(roof);

    // Dark timber bargeboard ridge beam
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.1), this.woodMat);
    ridge.position.y = 3.18;
    group.add(ridge);

    // 5. Front door (wood planks + iron ring handle)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.06), this.woodMat);
    door.position.set(0, 0.78, 0.82);
    const doorknob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), this.ironMat);
    doorknob.position.set(0.14, 0.78, 0.86);
    group.add(door, doorknob);

    // 6. Glowing stained-glass windows
    const win1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.45), this.windowMat);
    win1.position.set(-0.6, 0.95, 0.81);
    const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.45), this.windowMat);
    win2.position.set(0.6, 0.95, 0.81);
    const winUpper = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.4), this.windowMat);
    winUpper.position.set(0, 1.9, 0.86);
    group.add(win1, win2, winUpper);

    // Small timber flower box under window
    const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.12), this.woodMat);
    flowerBox.position.set(-0.6, 0.68, 0.86);
    const flowers = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08),
      new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.6 })
    );
    flowers.position.set(-0.6, 0.76, 0.86);
    group.add(flowerBox, flowers);

    // 7. Stone chimney with terracotta pot and active smoking puffs
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.8, 0.42), this.stoneMat);
    chimney.position.set(0.78, 1.8, -0.45);
    chimney.castShadow = true;

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.35, 8),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 })
    );
    pot.position.set(0.78, 3.35, -0.45);
    group.add(chimney, pot);

    // Active rising smoke puffs
    const smokePuffs = this.createSmokePuffs(0.78, 3.5, -0.45);
    group.add(smokePuffs);

    // Stacked firewood logs against side wall
    const logStack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), this.woodMat);
    logStack.rotation.z = Math.PI / 2;
    logStack.position.set(-1.0, 0.45, 0.3);
    group.add(logStack);

    return group;
  }

  /**
   * Alchemist Apothecary: Curved arcane observatory with rotating brass astrolabe rings and glowing magical runes.
   */
  private createAlchemistShop(): THREE.Group {
    const group = new THREE.Group();

    // 1. Stone masonry round tower base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 1.6, 16), this.stoneMat);
    base.position.y = 0.8;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Gothic arched wooden entrance portal
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.1), this.woodMat);
    door.position.set(0, 0.7, 1.35);
    group.add(door);

    // Glowing potion display bay window
    const potionWindow = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.25), this.woodMat);
    potionWindow.position.set(0.9, 0.85, 0.9);
    potionWindow.rotation.y = -Math.PI / 4;

    const potionBottle1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 0.9 })
    );
    potionBottle1.position.set(0.85, 1.1, 0.95);

    const potionBottle2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd946ef, emissive: 0xd946ef, emissiveIntensity: 0.9 })
    );
    potionBottle2.position.set(1.0, 1.1, 0.8);
    group.add(potionWindow, potionBottle1, potionBottle2);

    // 2. Stone corbel ring supporting observation balcony
    const balconyFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.25, 0.2, 16), this.stoneMat);
    balconyFloor.position.y = 1.65;
    balconyFloor.castShadow = true;

    // Balcony brass balustrade
    const balustrade = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.04, 6, 24), this.goldMat);
    balustrade.rotation.x = Math.PI / 2;
    balustrade.position.y = 1.95;
    group.add(balconyFloor, balustrade);

    // 3. Curved arcane observatory dome (oxidised copper verdigris)
    const domeGeo = new THREE.SphereGeometry(1.2, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const dome = new THREE.Mesh(domeGeo, this.copperMat);
    dome.position.y = 1.75;
    dome.castShadow = true;
    group.add(dome);

    // Slit aperture with polished brass telescope
    const telescope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 8), this.goldMat);
    telescope.position.set(0.4, 2.5, 0.6);
    telescope.rotation.x = -Math.PI / 3;
    telescope.rotation.z = -Math.PI / 6;
    telescope.castShadow = true;
    group.add(telescope);

    // 4. Rotating Brass Astrolabe: 3 concentric nested rings
    const astrolabeGroup = new THREE.Group();
    astrolabeGroup.position.set(0, 3.25, 0);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 8, 32), this.goldMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.032, 8, 32), this.goldMat);
    ring2.rotation.x = Math.PI / 3;
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.03, 8, 32), this.goldMat);
    ring3.rotation.y = Math.PI / 4;

    // Glowing mystical aether core inside the astrolabe
    const aetherCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.8
      })
    );

    astrolabeGroup.add(ring1, ring2, ring3, aetherCore);
    group.add(astrolabeGroup);

    // 5. Glowing Magical Runes Disc
    const runeGeo = new THREE.CircleGeometry(1.15, 32);
    const runeMat = new THREE.MeshStandardMaterial({
      map: ProceduralTextures.getArcaneRuneTexture(),
      transparent: true,
      opacity: 0.88,
      emissive: 0x00f5ff,
      emissiveIntensity: 0.85,
      side: THREE.DoubleSide
    });
    const runeDisc = new THREE.Mesh(runeGeo, runeMat);
    runeDisc.rotation.x = -Math.PI / 2;
    runeDisc.position.y = 2.4;
    group.add(runeDisc);

    // Register animation updater for rotating astrolabe and pulsing runes
    this.animatedElements.push({
      update: (time, delta) => {
        ring1.rotation.y += delta * 0.9;
        ring2.rotation.z -= delta * 1.1;
        ring3.rotation.x += delta * 1.3;
        aetherCore.rotation.y += delta * 1.5;
        runeDisc.rotation.z += delta * 0.35;
        runeMat.emissiveIntensity = 0.7 + Math.sin(time * 3) * 0.35;
      }
    });

    return group;
  }

  /**
   * Blacksmith Forge: Stone furnace with glowing coal embers, anvil, water trough, and smoke puffs.
   */
  private createBlacksmithForge(): THREE.Group {
    const group = new THREE.Group();

    // 1. Heavy stone flagstone foundation
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 2.0), this.stoneMat);
    foundation.position.y = 0.15;
    foundation.receiveShadow = true;
    group.add(foundation);

    // 2. Open-air rustic timber-framed workshop with slate lean-to roof
    // 4 rough-hewn timber posts
    const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.8, 6);
    for (const [tx, tz] of [[-0.95, -0.85], [0.95, -0.85], [-0.95, 0.85], [0.95, 0.85]]) {
      const post = new THREE.Mesh(postGeo, this.woodMat);
      post.position.set(tx, 1.05, tz);
      post.castShadow = true;
      group.add(post);
    }

    // Heavy timber rafters
    const rafter1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), this.woodMat);
    rafter1.position.set(0, 1.95, -0.85);
    const rafter2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), this.woodMat);
    rafter2.position.set(0, 1.95, 0.85);
    group.add(rafter1, rafter2);

    // Weathered slate lean-to roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.2), this.slateMat);
    roof.position.set(0, 2.15, 0);
    roof.rotation.x = 0.12;
    roof.castShadow = true;
    group.add(roof);

    // 3. Stone furnace / hearth with deep fire cavity
    const furnaceBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), this.stoneMat);
    furnaceBase.position.set(0.4, 0.6, -0.4);
    furnaceBase.castShadow = true;

    // Arched fire hood
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 0.7, 8), this.stoneMat);
    hood.position.set(0.4, 1.35, -0.4);
    hood.castShadow = true;

    // Chimney stack
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.6, 8), this.stoneMat);
    chimney.position.set(0.4, 2.3, -0.4);
    chimney.castShadow = true;
    group.add(furnaceBase, hood, chimney);

    // Glowing coal embers inside the hearth
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff4500,
      emissiveIntensity: 1.4,
      roughness: 0.9
    });
    const embers = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 0.5), emberMat);
    embers.position.set(0.4, 0.6, -0.15);

    // Hearth firelight casting flickering glow
    const hearthLight = new THREE.PointLight(0xff7700, 2.2, 4.5);
    hearthLight.position.set(0.4, 0.75, -0.15);
    group.add(embers, hearthLight);

    // Smoke puffs from furnace chimney
    const smokePuffs = this.createSmokePuffs(0.4, 3.1, -0.4);
    group.add(smokePuffs);

    // 4. Steel Horn Anvil on heavy oak tree stump
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.55, 8), this.woodMat);
    stump.position.set(-0.45, 0.42, 0.25);
    stump.castShadow = true;

    // Anvil geometry (base, body, horn)
    const anvilBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 0.22), this.ironMat);
    anvilBody.position.set(-0.45, 0.78, 0.25);
    anvilBody.castShadow = true;

    const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), this.ironMat);
    anvilHorn.rotation.z = -Math.PI / 2;
    anvilHorn.position.set(-0.68, 0.85, 0.25);

    // Red-hot forged iron bar on the anvil
    const hotBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 1.0 })
    );
    hotBar.position.set(-0.45, 0.92, 0.25);

    // Blacksmith's hammer
    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), this.ironMat);
    hammerHead.position.set(-0.25, 0.92, 0.35);
    const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), this.woodMat);
    hammerHandle.rotation.x = Math.PI / 2;
    hammerHandle.position.set(-0.25, 0.92, 0.48);
    group.add(stump, anvilBody, anvilHorn, hotBar, hammerHead, hammerHandle);

    // 5. Water quench trough with clear water
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.95), this.woodMat);
    trough.position.set(-0.85, 0.36, -0.35);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.8 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(-0.85, 0.52, -0.35);
    group.add(trough, water);

    // Embers breathing animation updater
    this.animatedElements.push({
      update: (time) => {
        const pulse = Math.sin(time * 4) * 0.35 + 1.0;
        emberMat.emissiveIntensity = pulse * 1.5;
        hearthLight.intensity = pulse * 2.2;
      }
    });

    return group;
  }

  /**
   * Castle Rampart Wall: Crenelated stone battlement with torch sconces and waving heraldic banner.
   */
  private createCastleRampart(): THREE.Group {
    const group = new THREE.Group();

    // Heavy masonry curtain wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 0.9), this.stoneMat);
    wall.position.y = 1.1;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Raised stone battlement walkway
    const walkway = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 1.1), this.stoneMat);
    walkway.position.y = 2.25;
    group.add(walkway);

    // Corbelled battlements & crenelations (merlons)
    const merlonW = 0.5;
    for (let c = -2; c <= 2; c++) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(merlonW, 0.45, 0.3), this.stoneMat);
      merlon.position.set(c * 0.55, 2.55, 0.45);
      merlon.castShadow = true;
      group.add(merlon);
    }

    // Two flanking defensive wall turrets with conical slate roofs
    for (const tx of [-1.3, 1.3]) {
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 2.8, 10), this.stoneMat);
      turret.position.set(tx, 1.4, 0);
      turret.castShadow = true;

      const tRoof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 10), this.slateMat);
      tRoof.position.set(tx, 3.4, 0);
      tRoof.castShadow = true;

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), this.goldMat);
      finial.position.set(tx, 4.05, 0);
      group.add(turret, tRoof, finial);
    }

    // Wall torch sconce with warm flame glow
    const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.3, 6), this.ironMat);
    sconce.position.set(0, 1.3, 0.5);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.5 })
    );
    flame.position.set(0, 1.5, 0.5);
    const torchLight = new THREE.PointLight(0xf59e0b, 1.0, 3.5);
    torchLight.position.set(0, 1.5, 0.5);
    group.add(sconce, flame, torchLight);

    // Animated waving heraldic wall banner
    const banner = this.createWavingFlag(0, 1.35, 0.52, 0.7, 1.3, 0x1d4ed8);
    group.add(banner);

    return group;
  }

  /**
   * Royal Citadel / Grand Citadel: Multi-tiered gothic keep, corbelled battlements, arrow slits, corner turrets with conical slate roofs, and animated waving royal flags.
   */
  private createCastleCitadel(isGrandCitadel = false, isCenter = false): THREE.Group {
    const group = new THREE.Group();
    const scale = isCenter ? 1.55 : 1.2;

    // 1. Lower Tier: Massive Great Hall Keep
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.8 * scale, 0.5 * scale, 2.8 * scale), this.stoneMat);
    plinth.position.y = 0.25 * scale;
    plinth.receiveShadow = true;
    group.add(plinth);

    const greatHall = new THREE.Mesh(new THREE.BoxGeometry(2.5 * scale, 2.2 * scale, 2.5 * scale), this.stoneMat);
    greatHall.position.y = 1.35 * scale;
    greatHall.castShadow = true;
    greatHall.receiveShadow = true;
    group.add(greatHall);

    // Grand arched portal entrance
    const portalArch = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 1.3 * scale, 0.15 * scale), this.stoneMat);
    portalArch.position.set(0, 0.9 * scale, 1.28 * scale);
    const doors = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 1.1 * scale, 0.08 * scale), this.woodMat);
    doors.position.set(0, 0.8 * scale, 1.3 * scale);
    const portcullis = new THREE.Mesh(new THREE.BoxGeometry(0.65 * scale, 0.4 * scale, 0.04 * scale), this.ironMat);
    portcullis.position.set(0, 1.15 * scale, 1.32 * scale);
    group.add(portalArch, doors, portcullis);

    // Grand stone entrance stairs
    for (let s = 1; s <= 3; s++) {
      const stair = new THREE.Mesh(
        new THREE.BoxGeometry((1.1 - s * 0.12) * scale, 0.12 * scale, 0.25 * scale),
        this.stoneMat
      );
      stair.position.set(0, (0.06 * s) * scale, (1.3 + s * 0.2) * scale);
      group.add(stair);
    }

    // Tall gothic lancet windows flanking entrance with golden glow
    for (const wx of [-0.85 * scale, 0.85 * scale]) {
      const lancetWin = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35 * scale, 0.85 * scale),
        this.windowMat
      );
      lancetWin.position.set(wx, 1.2 * scale, 1.26 * scale);
      group.add(lancetWin);
    }

    // 2. Middle Tier: Upper Solar & Corbelled Battlements
    const corbelRing = new THREE.Mesh(new THREE.BoxGeometry(2.65 * scale, 0.2 * scale, 2.65 * scale), this.stoneMat);
    corbelRing.position.y = 2.48 * scale;
    group.add(corbelRing);

    // Crenelations on Tier 1
    const mSize = 0.4 * scale;
    for (let i = -2; i <= 2; i++) {
      const merlonF = new THREE.Mesh(new THREE.BoxGeometry(mSize, 0.35 * scale, 0.2 * scale), this.stoneMat);
      merlonF.position.set(i * 0.55 * scale, 2.72 * scale, 1.25 * scale);
      group.add(merlonF);
    }

    // Upper keep body
    const upperKeep = new THREE.Mesh(new THREE.BoxGeometry(1.9 * scale, 1.8 * scale, 1.9 * scale), this.stoneMat);
    upperKeep.position.y = 3.35 * scale;
    upperKeep.castShadow = true;
    group.add(upperKeep);

    // Arrow slits on upper keep
    const arrowSlitMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    for (const ax of [-0.5 * scale, 0.5 * scale]) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.5 * scale, 0.05 * scale), arrowSlitMat);
      slit.position.set(ax, 3.4 * scale, 0.96 * scale);
      group.add(slit);
    }

    // Upper gothic mullioned stained-glass windows
    const upperWin = new THREE.Mesh(new THREE.PlaneGeometry(0.45 * scale, 0.7 * scale), this.windowMat);
    upperWin.position.set(0, 3.5 * scale, 0.96 * scale);
    group.add(upperWin);

    // 3. High Central Spire
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.0 * scale, 2.8 * scale, 8),
      isGrandCitadel ? this.copperMat : this.slateMat
    );
    spire.position.y = 5.65 * scale;
    spire.castShadow = true;

    const centralFinial = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 8, 8), this.goldMat);
    centralFinial.position.y = 7.1 * scale;
    group.add(spire, centralFinial);

    // Central Spire Royal Flagpole & Flag
    const centerFlag = this.createWavingFlag(0, 7.3 * scale, 0, 0.8 * scale, 0.5 * scale, 0xdc2626);
    group.add(centerFlag);

    // 4. 4 Corner Turrets with Conical Slate Roofs and Royal Flags
    const turretOffset = 1.15 * scale;
    const turretPositions: [number, number][] = [
      [-turretOffset, -turretOffset],
      [turretOffset, -turretOffset],
      [-turretOffset, turretOffset],
      [turretOffset, turretOffset]
    ];

    turretPositions.forEach(([tx, tz], tIdx) => {
      // Cylindrical stone turret shaft
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42 * scale, 0.48 * scale, 4.4 * scale, 10),
        this.stoneMat
      );
      turret.position.set(tx, 2.2 * scale, tz);
      turret.castShadow = true;

      // Corbelled turret top
      const tCorbel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55 * scale, 0.42 * scale, 0.25 * scale, 10),
        this.stoneMat
      );
      tCorbel.position.set(tx, 4.45 * scale, tz);

      // Conical slate / copper roof
      const tRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.6 * scale, 1.6 * scale, 10),
        isGrandCitadel ? this.copperMat : this.slateMat
      );
      tRoof.position.set(tx, 5.3 * scale, tz);
      tRoof.castShadow = true;

      const tFinial = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 6, 6), this.goldMat);
      tFinial.position.set(tx, 6.15 * scale, tz);

      // Waving pennant flag on each corner turret
      const flagColor = tIdx % 2 === 0 ? 0x1d4ed8 : 0xdc2626;
      const cornerFlag = this.createWavingFlag(tx, 6.2 * scale, tz, 0.6 * scale, 0.4 * scale, flagColor);

      group.add(turret, tCorbel, tRoof, tFinial, cornerFlag);
    });

    // 5. Grand Citadel Unique Enhancements: Flying Buttresses & Anti-Gravity Aether Core
    if (isGrandCitadel) {
      // 4 Flying Buttresses
      for (const [bx, bz] of [[-1.5 * scale, 0], [1.5 * scale, 0], [0, -1.5 * scale], [0, 1.5 * scale]]) {
        const buttressPier = new THREE.Mesh(
          new THREE.BoxGeometry(0.35 * scale, 3.2 * scale, 0.35 * scale),
          this.stoneMat
        );
        buttressPier.position.set(bx, 1.6 * scale, bz);
        buttressPier.castShadow = true;

        const archRib = new THREE.Mesh(
          new THREE.BoxGeometry(0.2 * scale, 0.2 * scale, 1.2 * scale),
          this.stoneMat
        );
        archRib.position.set(bx * 0.65, 3.0 * scale, bz * 0.65);
        if (Math.abs(bx) > 0.1) archRib.rotation.y = Math.PI / 2;
        group.add(buttressPier, archRib);
      }

      // Floating Anti-Gravity Aether Core Star at Pinnacle
      const aetherStar = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.9 * scale, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.2,
          roughness: 0.1,
          metalness: 0.9
        })
      );
      aetherStar.position.y = 8.2 * scale;

      // Concentric orbiting energy rings
      const starRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.3 * scale, 0.04 * scale, 8, 32), this.goldMat);
      starRing1.position.y = 8.2 * scale;
      const starRing2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.05 * scale, 0.035 * scale, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 1.0 })
      );
      starRing2.position.y = 8.2 * scale;
      starRing2.rotation.x = Math.PI / 3;

      group.add(aetherStar, starRing1, starRing2);

      this.animatedElements.push({
        update: (time, delta) => {
          aetherStar.rotation.y += delta * 1.2;
          aetherStar.position.y = 8.2 * scale + Math.sin(time * 2) * 0.15;
          starRing1.rotation.y += delta * 0.8;
          starRing2.rotation.z -= delta * 1.0;
        }
      });
    }

    return group;
  }

  /**
   * Animated Waving Cloth Flag with Sinusoidal Rippling Vertices.
   */
  private createWavingFlag(
    x: number,
    y: number,
    z: number,
    width = 0.8,
    height = 0.5,
    color = 0x1d4ed8
  ): THREE.Group {
    const flagGroup = new THREE.Group();
    flagGroup.position.set(x, y, z);

    // Slim brass flagpole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, height * 1.8, 6), this.goldMat);
    pole.position.y = height * 0.5;
    flagGroup.add(pole);

    // Segmented cloth flag for smooth wave deformation
    const flagGeo = new THREE.PlaneGeometry(width, height, 12, 6);
    const flagMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(width / 2, height * 0.8, 0);
    flagMesh.castShadow = true;
    flagGroup.add(flagMesh);

    // Gold trim spearhead finial
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), this.goldMat);
    finial.position.y = height * 1.4;
    flagGroup.add(finial);

    // Register waving animation update
    const randomOffset = Math.random() * Math.PI * 2;
    this.animatedElements.push({
      update: (time) => {
        const pos = flagGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const vx = pos.getX(i);
          const dist = (vx + width / 2) / width;
          const wave = Math.sin(time * 6 + dist * 5 + randomOffset) * 0.08 * dist;
          pos.setZ(i, wave);
        }
        pos.needsUpdate = true;
        flagGeo.computeVertexNormals();
      }
    });

    return flagGroup;
  }

  /**
   * Active Smoke Puffs Emitter: Billowing spheres that rise, expand, fade, and loop.
   */
  private createSmokePuffs(x: number, y: number, z: number): THREE.Group {
    const smokeGroup = new THREE.Group();
    smokeGroup.position.set(x, y, z);

    const puffCount = 5;
    const puffs: SmokePuff[] = [];

    for (let i = 0; i < puffCount; i++) {
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12, 1),
        new THREE.MeshStandardMaterial({
          color: 0xd1d5db,
          roughness: 0.9,
          transparent: true,
          opacity: 0.5
        })
      );
      const initialY = (i / puffCount) * 1.2;
      mesh.position.set(0, initialY, 0);
      mesh.scale.setScalar(0.7 + (i / puffCount) * 0.8);
      smokeGroup.add(mesh);

      puffs.push({
        mesh,
        initialY: 0,
        maxHeight: 1.6,
        speed: 0.45 + Math.random() * 0.15,
        initialScale: 0.6,
        driftX: (Math.random() - 0.5) * 0.25,
        driftZ: (Math.random() - 0.5) * 0.25
      });
    }

    this.animatedElements.push({
      update: (_, delta) => {
        puffs.forEach(p => {
          p.mesh.position.y += p.speed * delta;
          p.mesh.position.x += p.driftX * delta;
          p.mesh.position.z += p.driftZ * delta;

          const progress = p.mesh.position.y / p.maxHeight;
          if (progress >= 1.0) {
            p.mesh.position.y = 0;
            p.mesh.position.x = 0;
            p.mesh.position.z = 0;
            p.mesh.scale.setScalar(p.initialScale);
            (p.mesh.material as THREE.MeshStandardMaterial).opacity = 0.55;
          } else {
            p.mesh.scale.setScalar(p.initialScale * (1 + progress * 2.5));
            (p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.55 * (1 - progress));
          }
        });
      }
    });

    return smokeGroup;
  }

  /**
   * Town Hall: Classical/Gothic Civic Palace with fluted pillars, clock tower, and copper dome.
   */
  private createTownHall(): THREE.Group {
    const group = new THREE.Group();

    // Grand stone staircase plinth
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 2.2), this.stoneMat);
    base.position.y = 0.22;
    base.receiveShadow = true;
    group.add(base);

    // Civic Hall body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 1.9), this.stoneMat);
    body.position.y = 1.15;
    body.castShadow = true;
    group.add(body);

    // Classical portico pillars
    const colGeo = new THREE.CylinderGeometry(0.08, 0.09, 1.4, 8);
    for (let c = -3; c <= 3; c += 2) {
      const col = new THREE.Mesh(colGeo, this.stoneMat);
      col.position.set(c * 0.35, 1.15, 1.05);
      col.castShadow = true;
      group.add(col);
    }

    // Triangular Pediment over entrance
    const pediment = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 4), this.stoneMat);
    pediment.rotation.y = Math.PI / 4;
    pediment.position.set(0, 2.05, 0.7);
    pediment.scale.set(1.1, 1.0, 0.4);
    group.add(pediment);

    // Central Clock & Belfry Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), this.stoneMat);
    tower.position.set(0, 2.6, 0);
    tower.castShadow = true;

    // 4 Glowing Clock Faces
    for (const [cx, cz, roty] of [[0, 0.46, 0], [0, -0.46, Math.PI], [0.46, 0, Math.PI / 2], [-0.46, 0, -Math.PI / 2]]) {
      const clock = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 16),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8 })
      );
      clock.position.set(cx, 2.9, cz);
      clock.rotation.y = roty;
      group.add(clock);
    }

    // Polished copper cupola dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 12), this.copperMat);
    dome.position.set(0, 3.7, 0);
    dome.castShadow = true;

    const spireFinial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.8, 6), this.goldMat);
    spireFinial.position.set(0, 4.4, 0);
    group.add(tower, dome, spireFinial);

    return group;
  }

  /**
   * Lumber Mill: Medieval sawmill with functional rotating wooden water wheel.
   */
  private createLumberMill(): THREE.Group {
    const group = new THREE.Group();

    // Stone foundation
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 1.8), this.stoneMat);
    foundation.position.y = 0.18;
    group.add(foundation);

    // Timber plank mill house
    const mill = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.5), this.woodMat);
    mill.position.y = 1.0;
    mill.castShadow = true;

    // Pitch slate roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 4), this.slateMat);
    roof.position.y = 2.1;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1.0, 0.9);
    roof.castShadow = true;
    group.add(mill, roof);

    // Working Wooden Water Wheel
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(1.05, 0.75, 0);

    const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), this.woodMat);
    wheelHub.rotation.z = Math.PI / 2;
    wheelGroup.add(wheelHub);

    // Outer wheel rim
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 6, 24), this.woodMat);
    wheelRim.rotation.y = Math.PI / 2;
    wheelGroup.add(wheelRim);

    // 8 paddle blades & spokes
    for (let p = 0; p < 8; p++) {
      const pAngle = (p / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 1.35), this.woodMat);
      spoke.rotation.x = pAngle;
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.04), this.woodMat);
      paddle.position.set(0, Math.cos(pAngle) * 0.68, Math.sin(pAngle) * 0.68);
      wheelGroup.add(spoke, paddle);
    }
    group.add(wheelGroup);

    // Stacked logs
    for (let l = 0; l < 3; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), this.woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(-0.7, 0.25 + l * 0.18, 0.7);
      group.add(log);
    }

    // Water wheel continuous rotation animation
    this.animatedElements.push({
      update: (_, delta) => {
        wheelGroup.rotation.x += delta * 1.5;
      }
    });

    return group;
  }

  /**
   * Smelter: Industrial blast furnace with twin refractory smokestacks and molten iron slag channel.
   */
  private createSmelter(): THREE.Group {
    const group = new THREE.Group();

    // Heavy foundation
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.4, 2.1), this.stoneMat);
    base.position.y = 0.2;
    group.add(base);

    // Furnace kiln
    const kiln = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.6), this.stoneMat);
    kiln.position.y = 1.1;
    kiln.castShadow = true;
    group.add(kiln);

    // Twin tall industrial refractory chimneys
    for (const cx of [-0.45, 0.45]) {
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 2.2, 10), this.stoneMat);
      chimney.position.set(cx, 2.5, -0.3);
      chimney.castShadow = true;
      group.add(chimney);

      const smoke = this.createSmokePuffs(cx, 3.6, -0.3);
      group.add(smoke);
    }

    // Molten iron crucible & glowing slag channel
    const slag = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0xff3b00,
        emissive: 0xff4500,
        emissiveIntensity: 1.5,
        roughness: 0.2
      })
    );
    slag.position.set(0, 0.42, 0.65);

    const glowLight = new THREE.PointLight(0xff5500, 2.0, 3.5);
    glowLight.position.set(0, 0.65, 0.65);
    group.add(slag, glowLight);

    return group;
  }

  /**
   * Festival Plaza: Festive rotunda with circus-striped canopy, stage, and glowing fairy lanterns.
   */
  private createFestivalPlaza(): THREE.Group {
    const group = new THREE.Group();

    // Polished timber stage deck
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.3, 12), this.woodMat);
    deck.position.y = 0.15;
    group.add(deck);

    // Pavilion posts
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 6), this.woodMat);
      post.position.set(Math.cos(ang) * 1.25, 0.95, Math.sin(ang) * 1.25);
      post.castShadow = true;
      group.add(post);

      // Glowing fairy lantern on each post
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 })
      );
      lantern.position.set(Math.cos(ang) * 1.25, 1.8, Math.sin(ang) * 1.25);
      group.add(lantern);
    }

    // Striped festival circus canopy
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
    );
    canopy.position.y = 2.3;
    canopy.castShadow = true;
    group.add(canopy);

    return group;
  }

  /**
   * Root Nursery: Iron-framed botanical glass greenhouse with ancient ironwood roots.
   */
  private createRootNursery(): THREE.Group {
    const group = new THREE.Group();

    // Stone plant bed foundation
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 1.8), this.stoneMat);
    bed.position.y = 0.15;
    group.add(bed);

    // Botanical greenhouse glass conservatory
    const glassHouse = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.2, 1.5),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1
      })
    );
    glassHouse.position.y = 0.9;
    group.add(glassHouse);

    // Iron frame ribs
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.22, 1.52), this.ironMat);
    frame.position.y = 0.9;
    // Glass conservatory roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 0.8, 4),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 })
    );
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // Coiling ancient ironwood roots wrapping around the structure
    for (let r = 0; r < 4; r++) {
      const root = new THREE.Mesh(new THREE.TorusGeometry(0.7 + r * 0.15, 0.08, 6, 16, Math.PI), this.woodMat);
      root.rotation.x = Math.PI / 3 + r * 0.2;
      root.rotation.z = r * 0.8;
      root.position.set(0, 0.4 + r * 0.2, 0);
      group.add(root);
    }

    // Bioluminescent flora glowing green/cyan
    const spore = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.1 })
    );
    spore.position.set(0, 0.85, 0);
    group.add(spore);

    return group;
  }

  /**
   * Canal Filter: Tiered limestone water filtration aqueduct.
   */
  private createCanalFilter(): THREE.Group {
    const group = new THREE.Group();

    // Tiered limestone basins
    const basin1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.8), this.stoneMat);
    basin1.position.y = 0.25;
    const basin2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.4), this.stoneMat);
    basin2.position.set(0, 0.6, -0.3);
    group.add(basin1, basin2);

    // Cascading clean turquoise water pools
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.08,
      metalness: 0.85,
      transparent: true,
      opacity: 0.85
    });
    const pool1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), waterMat);
    pool1.rotation.x = -Math.PI / 2;
    pool1.position.set(0, 0.51, 0.1);
    group.add(pool1);

    return group;
  }

  /**
   * Sky Monument: Celestial stratospheric obelisk with anti-gravity energy rings.
   */
  private createSkyMonument(): THREE.Group {
    const group = new THREE.Group();

    // Marble pediment
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), this.stoneMat);
    base.position.y = 0.3;
    group.add(base);

    // Soaring celestial obelisk
    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.9, 6.5, 4),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.5 })
    );
    obelisk.position.y = 3.6;
    obelisk.castShadow = true;

    // Floating Aether crystal at apex
    const apexStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x00f5ff, emissiveIntensity: 1.4 })
    );
    apexStar.position.y = 7.4;

    // Floating rotating Aether rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.04, 8, 32), this.goldMat);
    ring1.position.y = 5.2;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 8, 32), this.goldMat);
    ring2.position.y = 6.2;
    ring2.rotation.x = Math.PI / 4;

    group.add(obelisk, apexStar, ring1, ring2);

    this.animatedElements.push({
      update: (time, delta) => {
        apexStar.rotation.y += delta * 1.5;
        apexStar.position.y = 7.4 + Math.sin(time * 2.5) * 0.18;
        ring1.rotation.y += delta * 0.8;
        ring2.rotation.z -= delta * 1.0;
      }
    });

    return group;
  }

  /**
   * Generic Medieval Townhouse fallback.
   */
  private createGenericTownhouse(): THREE.Group {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.6), this.stoneMat);
    base.position.y = 0.7;
    base.castShadow = true;

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.0, 4), this.slateMat);
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;

    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.45), this.windowMat);
    win.position.set(0, 0.9, 0.81);

    group.add(base, roof, win);
    return group;
  }

  /**
   * Central Aether Fountain & Crystal (when no central castle is placed).
   */
  private createCentralFountain(): THREE.Group {
    const group = new THREE.Group();

    // Multi-tiered carved stone fountain basin
    const basinBottom = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.35, 24), this.stoneMat);
    basinBottom.position.y = 0.18;
    basinBottom.receiveShadow = true;

    const basinRim = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.15, 8, 24), this.stoneMat);
    basinRim.rotation.x = Math.PI / 2;
    basinRim.position.y = 0.45;

    // Clear turquoise water pool
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1.9, 24),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.8
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.38;

    // Central carved pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.9, 12), this.stoneMat);
    pedestal.position.y = 0.75;
    pedestal.castShadow = true;

    // Floating Rotating Aether Crystal
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 0.85,
        roughness: 0.1,
        metalness: 0.85
      })
    );
    crystal.position.y = 1.8;
    crystal.castShadow = true;

    // Orbiting gold ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 8, 32), this.goldMat);
    ring.position.y = 1.8;
    ring.rotation.x = Math.PI / 3;

    group.add(basinBottom, basinRim, water, pedestal, crystal, ring);

    // Floating crystal bobbing & rotating animation
    this.animatedElements.push({
      update: (time, delta) => {
        crystal.rotation.y += delta * 1.2;
        crystal.rotation.z = Math.sin(time * 1.5) * 0.15;
        crystal.position.y = 1.8 + Math.sin(time * 2.2) * 0.12;
        ring.rotation.y -= delta * 0.7;
        ring.position.y = crystal.position.y;
      }
    });

    return group;
  }

  /**
   * Multi-Canopy Stylized Tree with organic clusters, tapered trunk, and varied height.
   */
  private createTree3D(seed = 0): THREE.Group {
    const group = new THREE.Group();

    const heightScale = 0.85 + ((seed * 7) % 5) * 0.1; // 0.85 - 1.25

    // Tapered organic tree trunk with root flares
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * heightScale, 0.22 * heightScale, 1.1 * heightScale, 7),
      this.woodMat
    );
    trunk.position.y = 0.55 * heightScale;
    trunk.castShadow = true;
    group.add(trunk);

    // Tree foliage cluster palette
    const foliageColors = [0x15803d, 0x16a34a, 0x14532d, 0x166534, 0x155e75];
    const baseCol = foliageColors[seed % foliageColors.length];

    const clusterMat = new THREE.MeshStandardMaterial({
      color: baseCol,
      roughness: 0.85,
      flatShading: true
    });

    // Multi-canopy layered organic foliage clusters
    const clusterOffsets: [number, number, number, number][] = [
      [0, 1.25 * heightScale, 0, 0.65 * heightScale],
      [-0.25 * heightScale, 1.55 * heightScale, 0.15 * heightScale, 0.5 * heightScale],
      [0.2 * heightScale, 1.6 * heightScale, -0.2 * heightScale, 0.52 * heightScale],
      [0, 1.95 * heightScale, 0, 0.42 * heightScale]
    ];

    clusterOffsets.forEach(([ox, oy, oz, r]) => {
      const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), clusterMat);
      cluster.position.set(ox, oy, oz);
      cluster.rotation.set(Math.random() * 2, Math.random() * 2, 0);
      cluster.castShadow = true;
      group.add(cluster);
    });

    // Small mossy stone or shrub at tree base
    if (seed % 2 === 0) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), this.stoneMat);
      stone.position.set(0.35, 0.1, 0.2);
      group.add(stone);
    }

    return group;
  }

  /**
   * Dual-Layer Floating Atmospheric Motes: Golden embers and cyan aether sparkles.
   */
  private createAtmosphericMotes() {
    // 1. Warm Golden Embers
    const goldCount = 120;
    const goldGeo = new THREE.BufferGeometry();
    const goldPos = new Float32Array(goldCount * 3);

    for (let i = 0; i < goldCount * 3; i += 3) {
      goldPos[i] = (Math.random() - 0.5) * 26;
      goldPos[i + 1] = 0.5 + Math.random() * 11;
      goldPos[i + 2] = (Math.random() - 0.5) * 26;
    }
    goldGeo.setAttribute('position', new THREE.BufferAttribute(goldPos, 3));

    const goldMat = new THREE.PointsMaterial({
      map: ProceduralTextures.getParticleSpriteTexture('gold'),
      size: 0.28,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.goldEmbersMesh = new THREE.Points(goldGeo, goldMat);
    this.scene.add(this.goldEmbersMesh);

    // 2. Cyan Aether Motes
    const cyanCount = 90;
    const cyanGeo = new THREE.BufferGeometry();
    const cyanPos = new Float32Array(cyanCount * 3);

    for (let i = 0; i < cyanCount * 3; i += 3) {
      cyanPos[i] = (Math.random() - 0.5) * 22;
      cyanPos[i + 1] = 1.0 + Math.random() * 9;
      cyanPos[i + 2] = (Math.random() - 0.5) * 22;
    }
    cyanGeo.setAttribute('position', new THREE.BufferAttribute(cyanPos, 3));

    const cyanMat = new THREE.PointsMaterial({
      map: ProceduralTextures.getParticleSpriteTexture('cyan'),
      size: 0.22,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.cyanMotesMesh = new THREE.Points(cyanGeo, cyanMat);
    this.scene.add(this.cyanMotesMesh);
  }

  // ==========================================
  // CONTROLS & CAMERA INTERACTION
  // ==========================================

  private setupControls() {
    const dom = this.renderer.domElement;

    this.onDomMouseDown = (e: MouseEvent) => {
      this.isDragging = true;
      this.isAutoRotating = false;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    };

    this.onWindowMouseUp = () => {
      this.isDragging = false;
    };

    this.onDomMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      this.cameraAngle -= deltaX * 0.008;
      this.cameraHeight = Math.max(3, Math.min(22, this.cameraHeight + deltaY * 0.04));

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.updateCameraPosition();
    };

    this.onDomWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.cameraRadius = Math.max(7, Math.min(32, this.cameraRadius + e.deltaY * 0.02));
      this.updateCameraPosition();
    };

    dom.addEventListener('mousedown', this.onDomMouseDown);
    window.addEventListener('mouseup', this.onWindowMouseUp);
    dom.addEventListener('mousemove', this.onDomMouseMove);
    dom.addEventListener('wheel', this.onDomWheel);
  }

  private updateCameraPosition() {
    this.camera.position.x = Math.cos(this.cameraAngle) * this.cameraRadius;
    this.camera.position.z = Math.sin(this.cameraAngle) * this.cameraRadius;
    this.camera.position.y = this.cameraHeight;
    this.camera.lookAt(0, 1.4, 0);
  }

  public onAutoRotateChange: ((rotating: boolean) => void) | null = null;

  public toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    sounds.playSaoSelect();
    if (this.onAutoRotateChange) {
      this.onAutoRotateChange(this.isAutoRotating);
    }
  }

  public resetCamera() {
    this.cameraAngle = 0.5;
    this.cameraRadius = 18;
    this.cameraHeight = 10;
    this.updateCameraPosition();
  }

  public pause() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.clock.start();
      this.animate();
    }
  }

  public captureSnapshot(): string {
    sounds.playSaoConfirm();
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ==========================================
  // RENDER & ANIMATION LOOP
  // ==========================================

  private animate = () => {
    if (!this.isRunning) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // Auto-orbit camera
    if (this.isAutoRotating) {
      this.cameraAngle += 0.004;
      this.updateCameraPosition();
    }

    // Update all registered architectural animations (flags, astrolabes, smoke, coals, wheels, fountains)
    for (let i = 0; i < this.animatedElements.length; i++) {
      this.animatedElements[i].update(time, delta);
    }

    // Subtle lantern light flickering
    if (this.streetLanternLights.length > 0) {
      for (let i = 0; i < this.streetLanternLights.length; i++) {
        this.streetLanternLights[i].intensity = 1.1 + Math.sin(time * 7 + i * 1.5) * 0.15;
      }
    }

    // Atmospheric motes gentle drift
    if (this.goldEmbersMesh) {
      this.goldEmbersMesh.rotation.y += delta * 0.03;
      this.goldEmbersMesh.position.y = Math.sin(time * 0.8) * 0.15;
    }
    if (this.cyanMotesMesh) {
      this.cyanMotesMesh.rotation.y -= delta * 0.025;
      this.cyanMotesMesh.position.y = Math.cos(time * 0.7) * 0.15;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public handleResize() {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.onWindowMouseUp) {
      window.removeEventListener('mouseup', this.onWindowMouseUp);
      this.onWindowMouseUp = null;
    }

    if (this.renderer) {
      const dom = this.renderer.domElement;
      if (this.onDomMouseDown) {
        dom.removeEventListener('mousedown', this.onDomMouseDown);
        this.onDomMouseDown = null;
      }
      if (this.onDomMouseMove) {
        dom.removeEventListener('mousemove', this.onDomMouseMove);
        this.onDomMouseMove = null;
      }
      if (this.onDomWheel) {
        dom.removeEventListener('wheel', this.onDomWheel);
        this.onDomWheel = null;
      }
    }

    if (this.scene) {
      this.scene.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        } else {
          const item = node as any;
          if (item.geometry) {
            item.geometry.dispose();
          }
          if (item.material) {
            if (Array.isArray(item.material)) {
              item.material.forEach((m: THREE.Material) => m.dispose());
            } else {
              item.material.dispose();
            }
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    ProceduralTextures.disposeAll();
  }
}
