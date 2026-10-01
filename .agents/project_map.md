# Project Architecture & Component Map: SJCET-Game

**Created:** 2026-09-17  
**Root Directory:** `/home/meoclavezz/Projects/SJCET-Game`

## 🧭 System Overview
- Repository and development environment for **SJCET-Game**.
- Primary asset curation and integration framework established.

## 📦 Active Components & Services
- **Asset Master Directory:** Comprehensive documentation of 60+ free and open-source game development asset sources (`GAME_ASSETS.md`).
- **Attribution & Credits Registry:** Legal and Creative Commons tracking file for third-party assets (`CREDITS.md`).
- **Game Engine & Core:** TypeScript + Phaser 3 + Vite implementation of *Overburden: Tales from the Under-Town*.
  - `src/main.ts`: Phaser game initialization, arcade physics, and pixel-art rendering.
  - `src/types.ts`: Game state, consequence metrics, building specifications, and mining node data models.
  - `src/data/buildings.ts`: Building catalog with mechanical trade-offs and unintended consequence parameters.
  - `src/state/GameState.ts`: Central reactive state manager handling economy, consequences, and win/loss conditions.
  - `src/audio/SoundEffects.ts`: Zero-dependency rich procedural Web Audio API synthesizer with tailored pitch-reactive mining clinks, SAO holographic UI audio cues, triumphant fanfares, battle clash & spell projectiles, and persistent mute/volume controls.
  - `src/scenes/BootScene.ts`: Procedural canvas pixel-art generator for player, tiles, buildings, hazards, and ore.
  - `src/scenes/SurfaceScene.ts`: Interactive City Builder view with building plots, atmospheric consequences, and mine lift.
  - `src/scenes/CavernScene.ts`: 2D precision miner-platformer with dynamic ceiling sagging, mudslide friction, falling stalactites, and acid/healing fluid pools.
  - `src/war/WarEngine.ts` & `src/war/Factions.ts`: Parallel world-conquering engine with territory conquest, army mobilization (Militia, Knights, Sorcerers, Golems), Demon King Malgok invasions, and Sylvan/Molekin diplomacy.
  - `src/events/PlaytimeEventEngine.ts`: Persistent session playtime recorder tracking elapsed hours, triggering escalating narrative events, crises, and the Sovereign Coronation Quest.
  - `src/showcase/CityShowcase3D.ts` & `src/showcase/ProceduralTextures.ts`: High-fidelity Three.js 3D diorama engine with procedural masonry, timber, stained-glass windows, waving flags, and interactive drag-to-orbit controls.
  - `src/ui/SaoHoloUI.ts` & `src/ui/WarRoomUI.ts`: Sword Art Online (SAO) holographic interface with hexagonal navigation, in-city stores, 3D brag snapshot preview modal, and strategic war room.
  - `src/styles/sao-ui.css`: Cyber anime glassmorphic CSS styling with guaranteed z-index layering and clickability in 3D mode.
  - `src/data/shopItems.ts`: Scientific and engineering store items (Acid-Base Neutralization, Hydraulic Jacks, Mycelium Elixirs, Sonic Dampeners).
  - `src/data/buildings.ts`: Building catalog with stores, castle ramparts, royal keeps, and imperial citadel synthesis.

## ⚙️ Configuration & Key Paths
- `README.md`: Project summary, lore, controls, and run instructions.
- `OPTIMIZATIONS_AND_FEATURES.md`: Comprehensive performance analysis (Three.js, Phaser, Vite) and 5 tri-layer gameplay expansions.
- `GAME_DESIGN_DOCUMENT.md`: Game Design Document for 'Overburden' (Eco-Platformer Builder).
- `GAME_ASSETS.md`: Master catalog covering Kenney, OpenGameArt, itch.io, and 50+ vetted resources.
- `CREDITS.md`: Project license attribution tracker.
- `package.json` / `tsconfig.json`: Vite and TypeScript configuration.

## 📝 Recent Architectural Decisions
- **2026-09-17:** Engineered comprehensive procedural Web Audio API engine (`SoundEffects.ts`) featuring zero external asset loading, SAO Link Start frequency sweeps, material-tailored mining strikes (coal, iron, lumens, aether), multi-oscillator brass royal fanfares, FM demonic growls, and interactive SAO navigation dock audio controls (persistent mute/volume toggle and interaction auto-unlock).
- **2026-09-17:** Resolved 3D mode button clickability bug by adding pointer-event isolation, explicit z-indexing, global Escape key dismiss, and in-app brag card preview modal.
- **2026-09-17:** Upgraded 3D City Showcase with procedural PBR textures, waving banners, smoking chimneys, and realistic lighting.
- **2026-09-17:** Integrated Parallel World Conquering (`WarEngine.ts`), Factions (Demon King, Sylvans, Molekin), Army Mobilization, and Playtime Event Scheduler (`PlaytimeEventEngine.ts`).
- **2026-09-17:** Formulated complete Game Design Document for "Overburden: Tales from the Under-Town" (City Builder + 2D Platformer hybrid exploring Unexpected Consequences through Resource Balancing, Delayed Ripples, and Perverse Incentives).
- **2026-09-17:** Scaffolded project map, created master game asset documentation from 4 primary web hubs (Kenney, OpenGameArt, itch.io, r/gamedev 50+ list), and initialized structured asset repository directories.
- **2026-09-17:** Implemented responsive fullscreen architecture (100vw x 100vh) with Phaser.Scale.RESIZE, dynamic expanding building plots (up to 14 plots), and camera fade reset on wake; created OpeningDemoScene with SAO Link Start anime prologue and interactive dioramas; integrated procedural Web Audio sound suite across all gameplay actions.
- **2026-09-17:** Upgraded 3D City Showcase camera to critically-damped spherical orbital rotation with inertial momentum, pointer-event capture, and delta-time independent smoothing in CityShowcase3D.ts, eliminating stutter and abrupt stops.
- **2026-10-01:** Resolved browser animation lag and 3D rendering stalls: switched Phaser to hardware-accelerated WebGL (`Phaser.AUTO`), paused Phaser during 3D Showcase modal to stop dual 60fps game loops, optimized Three.js shadow maps to 1024x1024, capped pixel ratio to 1.25, and pooled 8 forward lantern lights into 2 strategic plaza lights.
- **2026-10-01:** Engineered Dungeon Excavation & Dynamic Terrain Changes: mining nodes leaves permanent depleted rock sockets, drops functional stone rubble piles onto ledges, shatters rock fissures into the cavern backdrop, and triggers unexpected seismic weight consequences.
- **2026-10-01:** Added Subterranean Challenges & Combat: implemented Skeleton Knights (patrol, slash, bone clatter), Abyssal Predators (stalking, high-velocity leap, toxic bite), and the Apex Abyssal Dragon Boss (hovering flight, screen-shaking roars, fireball barrage, dive-bombing, and epic boss HP bar), with responsive player pickaxe melee combat.
- **2026-10-01:** Introduced Multi-Tier Dungeon Depths: Level 1 (Upper Caverns 100m), Level 2 (Sunken Crypts 300m), and Level 3 (Abyssal Magma Lair 600m) with dedicated descent/ascent portals, depth HUD banners, and escalating atmosphere.
- **2026-10-01:** Rebuilt Surface World into realistic 2.5D with floor Length and Breadth: 3 perspective depth tiers (Upper Royal Terrace, Middle Artisan Boulevard, Lower Commons), isometric foundation pads (`iso_plot_pad`), 2.5D building textures with shaded sides and chimneys, depth-sorting (`container.setDepth(plot.y)`), animated strolling citizens (`citizen_walk`), street lamps, and headframe quarry mine shaft.
