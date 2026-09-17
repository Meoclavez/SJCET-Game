# ⛏️ OVERBURDEN: Tales from the Under-Town

> **Theme:** *Unexpected Consequences*  
> **Genre:** Hybrid City-Builder & 2D Precision Miner-Platformer  
> **Engine / Tech Stack:** TypeScript, Phaser 3, Vite, Web Audio API  
> **Directory:** `/home/meoclavezz/Projects/SJCET-Game`

---

## 📖 Concept & Lore
You are the Mayor-Miner of a fledgling settlement perched atop ancient hollow crags. To build and expand your town on the surface, you must personally dive into the underground cavern levels to mine stone, coal, iron, and ancient power crystals.

However, **the surface and the underground are physically entangled**: every building, road, factory, and festival you orchestrate above mechanically warps the physics, layout, hazards, and ecology of the platformer levels below!

---

## ⚡ The 3 Core Pillars of Unexpected Consequences

### 1. The Resource Balancing Act (Visible Wealth vs. Hidden Tectonic Strain)
- **The Surface Goal:** Optimize Population, Tax Gold, and Production.
- **The Hidden Cavern Strain:** Heavy stone buildings and factories add **Tectonic Weight** and **Toxicity**.
- **The Crisis:** As Tectonic Weight climbs, cavern ceilings physically sag lower, restricting jump clearances. When weight exceeds 50%, stalactites shake and plummet whenever the miner runs underneath!

### 2. The Delayed Ripple Effect (Actions Today Alter Tomorrow's Physics)
- **Deforestation Trap:** Building Lumber Mills harvests wood rapidly (+25 Wood/day) but destroys ancient tree roots (-25 Root Stability). When you descend into the mine, solid stone platforms liquefy into slick, slippery mudslides (`tile_mud`) with low friction and crumbling ledges!
- **Industrial Smelters:** Refines ore into valuable Iron blocks (+15 Iron/day, +15 Gold/day), but toxic soot and slag seep into the cavern floor (+35 Toxicity), transforming the bottom water pit from a healing mineral bath into boiling green acid!
- **Jubilee Festivals:** Citizens throw wild celebrations for happiness and gold, but acoustic vibrations (+35 Vibration) cause cave-ins and shatter crystal geodes into hazardous shrapnel!

### 3. Scientific & Engineering Problem Solving (In-City Stores)
Visit city stores via the **SAO Holographic Menu** to purchase logical solutions to cavern crises:
- 🧼 **Alkaline Soap Solution (Base):** Uses **Acid-Base Neutralization** (`2H⁺ + CO₃²⁻ → H₂O + CO₂`). Pours alkaline base into the cavern drainage to neutralize 45% Toxicity and turn boiling acid back into clean healing water!
- 🔩 **Hydraulic Steel Ceiling Jacks:** Relieves 30% Tectonic Weight through triangulated load distribution, preventing stalactites from falling.
- 🧪 **Deep-Mycelium Root Elixir:** Infuses cavern root beds with bio-polymers, restoring +40% Root Stability and turning loose mud back to solid stone.
- 🎛️ **Acoustic Resonance Absorber:** Emits inverted phase waves to cancel out 100% of festival vibration tremors.

### 4. 🏰 Castle Combinations & 👑 3D Anime Brag Showcase
- **Castle Synthesis:** Build **Castle Ramparts** flanking a **Royal Citadel Keep** to synthesize the **Imperial Aether Citadel**, granting SSS-Tier City Rank!
- **Sword Art Online (SAO) Holographic Interface:** Glassmorphic floating navigation, hexagonal icons, and authentic anime sound effects.
- **3D City & Castle Brag Showcase:** Powered by **Three.js**! Enjoy a cinematic orbital drone tour of your 3D kingdom, inspect architectural details, and generate high-res **Brag Cards** with your Monarch rank and stats to show off!
- **The Explicit Goal:** Erect the **Sky-Spire Monument** to complete the game.
- **The Trap:** The most "optimal" greedy path is building multiple Heavy Foundries and Lumber Mills to quickly amass the required 350 Stone and 150 Iron.
- **The Consequence:** Doing so drives cavern strain over 75%. Placing the Monument causes catastrophic foundation shear—the hollow caverns collapse, swallowing the entire city into the abyss!
- **The True Victory:** Achieve **Harmonic Bio-Metropolis** by balancing industry with ecological restoration (keeping all strains under 50%).

---

## 🕹️ Controls

| Context | Action | Keybinding |
| :--- | :--- | :--- |
| **Universal** | **Switch View (Surface <-> Mine)** | <kbd>TAB</kbd> or Top-Right Button |
| **Surface** | **Inspect / Build on Plot** | Left Click on `+ BUILD` or Building |
| **Surface** | **Advance Day / Collect Income** | Click `💤 REST` Button |
| **Caverns** | **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> |
| **Caverns** | **Jump (Variable Height + Coyote)** | <kbd>SPACE</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> |
| **Caverns** | **Swing Pickaxe (Mine Nodes)** | <kbd>J</kbd> or Left Click |
| **Caverns** | **Ascend Elevator (Bank Loot)** | Stand in Elevator & press <kbd>W</kbd> / <kbd>TAB</kbd> |

---

## 🚀 How to Run the Game Locally

1. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
2. Open your web browser at the displayed local URL (typically `http://localhost:5173`).
3. To compile a production bundle:
   ```bash
   npm run build
   ```

---

## 🎨 Asset & Audio Pipeline
- **Procedural Pixel Art:** Generated on startup in `BootScene.ts` using Canvas API. Zero external image dependencies required.
- **Procedural Sound FX:** Custom Web Audio API synthesizer in `SoundEffects.ts` generating authentic chiptune jumps, mining clangs, rockfalls, acid sizzles, and victory fanfares without external audio files.
- **Attribution & Licenses:** Logged in [`CREDITS.md`](file:///home/meoclavezz/Projects/SJCET-Game/CREDITS.md) according to the guidelines in [`GAME_ASSETS.md`](file:///home/meoclavezz/Projects/SJCET-Game/GAME_ASSETS.md).
