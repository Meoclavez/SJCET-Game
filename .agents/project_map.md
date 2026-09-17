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
  - `src/audio/SoundEffects.ts`: Zero-dependency procedural Web Audio API synthesizer.
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
- **2026-09-17:** Resolved 3D mode button clickability bug by adding pointer-event isolation, explicit z-indexing, global Escape key dismiss, and in-app brag card preview modal.
- **2026-09-17:** Upgraded 3D City Showcase with procedural PBR textures, waving banners, smoking chimneys, and realistic lighting.
- **2026-09-17:** Integrated Parallel World Conquering (`WarEngine.ts`), Factions (Demon King, Sylvans, Molekin), Army Mobilization, and Playtime Event Scheduler (`PlaytimeEventEngine.ts`).
- **2026-09-17:** Formulated complete Game Design Document for "Overburden: Tales from the Under-Town" (City Builder + 2D Platformer hybrid exploring Unexpected Consequences through Resource Balancing, Delayed Ripples, and Perverse Incentives).
- **2026-09-17:** Scaffolded project map, created master game asset documentation from 4 primary web hubs (Kenney, OpenGameArt, itch.io, r/gamedev 50+ list), and initialized structured asset repository directories.
