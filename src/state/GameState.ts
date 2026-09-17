import { TownResources, ConsequenceMetrics, BuildingId, SurfacePlot, GameMode, MilitaryRank } from '../types';
import { BUILDINGS_CATALOG } from '../data/buildings';
import { SHOP_ITEMS } from '../data/shopItems';
import { sounds } from '../audio/SoundEffects';
import { factions } from '../war/Factions';
import { warEngine } from '../war/WarEngine';

export interface ConsequenceLog {
  id: number;
  text: string;
  type: 'warning' | 'crisis' | 'info' | 'positive';
  timestamp: string;
}

export class GameStateManager {
  private static instance: GameStateManager;

  public currentMode: GameMode = GameMode.SURFACE;
  public day: number = 1;
  public cityPrestige: number = 50;
  public solvedDisastersCount: number = 0;
  public militaryRank: MilitaryRank = 'peasant';
  public sessionSeconds: number = 0;
  public totalPlayHours: number = 0;

  public resources: TownResources = {
    gold: 140,
    wood: 180,
    stone: 120,
    iron: 40,
    lumens: 15,
    aetherCore: 0,
    food: 60,
    mana: 40,
    troops: 8,
    demonShards: 0,
    population: 18,
    maxPopulation: 30
  };

  public metrics: ConsequenceMetrics = {
    tectonicWeight: 15,    // 0-100%
    rootIntegrity: 85,     // 0-100%
    toxicityLevel: 10,     // 0-100%
    vibrationLevel: 0      // 0-100%
  };

  public plots: SurfacePlot[] = [
    { id: 0, x: 120, y: 370, building: BuildingId.COTTAGE },
    { id: 1, x: 250, y: 370, building: BuildingId.ALCHEMIST_SHOP },
    { id: 2, x: 380, y: 370, building: null },
    { id: 3, x: 510, y: 370, building: null },
    { id: 4, x: 640, y: 370, building: null },
    { id: 5, x: 770, y: 370, building: null },
    { id: 6, x: 900, y: 370, building: null }
  ];

  public inventory: Record<string, number> = {
    soap_neutralizer: 1,
    ceiling_jack: 0,
    root_fertilizer: 0,
    sonic_dampener: 0
  };

  public logs: ConsequenceLog[] = [
    {
      id: 1,
      text: 'Welcome Mayor! Use the SAO Holographic Menu to govern, shop, and showcase your metropolis.',
      type: 'info',
      timestamp: 'Day 1'
    }
  ];

  public listeners: Set<() => void> = new Set();
  public nextLogId = 2;

  private constructor() {}

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public notify() {
    for (const fn of this.listeners) {
      fn();
    }
  }

  public addLog(text: string, type: 'warning' | 'crisis' | 'info' | 'positive') {
    this.logs.unshift({
      id: this.nextLogId++,
      text,
      type,
      timestamp: `Day ${this.day}`
    });
    if (this.logs.length > 8) this.logs.pop();
    if (type === 'warning' || type === 'crisis') {
      sounds.playAlert();
    }
    this.notify();
  }

  public canAfford(cost: {
    gold?: number;
    wood?: number;
    stone?: number;
    iron?: number;
    lumens?: number;
    aetherCore?: number;
    food?: number;
    mana?: number;
    troops?: number;
    demonShards?: number;
  }): boolean {
    if ((cost.gold ?? 0) > this.resources.gold) return false;
    if ((cost.wood ?? 0) > this.resources.wood) return false;
    if ((cost.stone ?? 0) > this.resources.stone) return false;
    if ((cost.iron ?? 0) > this.resources.iron) return false;
    if ((cost.lumens ?? 0) > this.resources.lumens) return false;
    if ((cost.aetherCore ?? 0) > this.resources.aetherCore) return false;
    if ((cost.food ?? 0) > this.resources.food) return false;
    if ((cost.mana ?? 0) > this.resources.mana) return false;
    if ((cost.troops ?? 0) > this.resources.troops) return false;
    if ((cost.demonShards ?? 0) > this.resources.demonShards) return false;
    return true;
  }

  public setMilitaryRank(rank: MilitaryRank) {
    if (this.militaryRank !== rank) {
      this.militaryRank = rank;
      if (rank === 'captain') {
        this.resources.maxPopulation += 10;
        this.resources.troops += 5;
      } else if (rank === 'king') {
        this.resources.maxPopulation += 30;
        this.resources.troops += 15;
        this.cityPrestige += 50;
      }
      this.addLog(`🎖️ MILITARY ADVANCEMENT: You have risen to the rank of ${rank.toUpperCase()}!`, 'positive');
      sounds.playCastleHorn();
      this.notify();
    }
  }

  public updatePlaytime(sessionSecs: number, totalHours: number) {
    this.sessionSeconds = sessionSecs;
    this.totalPlayHours = totalHours;
    this.notify();
  }

  public addResources(delta: Partial<TownResources>) {
    for (const key of Object.keys(delta) as (keyof TownResources)[]) {
      const val = delta[key];
      if (typeof val === 'number') {
        this.resources[key] = Math.max(0, this.resources[key] + val);
      }
    }
    this.notify();
  }

  public deductResources(cost: Partial<TownResources>) {
    for (const key of Object.keys(cost) as (keyof TownResources)[]) {
      const val = cost[key];
      if (typeof val === 'number') {
        this.resources[key] = Math.max(0, this.resources[key] - val);
      }
    }
    this.notify();
  }

  public modifyMetrics(deltas: Partial<ConsequenceMetrics>) {
    if (deltas.tectonicWeight !== undefined) {
      this.metrics.tectonicWeight = Math.min(100, Math.max(0, this.metrics.tectonicWeight + deltas.tectonicWeight));
    }
    if (deltas.rootIntegrity !== undefined) {
      this.metrics.rootIntegrity = Math.min(100, Math.max(0, this.metrics.rootIntegrity + deltas.rootIntegrity));
    }
    if (deltas.toxicityLevel !== undefined) {
      this.metrics.toxicityLevel = Math.min(100, Math.max(0, this.metrics.toxicityLevel + deltas.toxicityLevel));
    }
    if (deltas.vibrationLevel !== undefined) {
      this.metrics.vibrationLevel = Math.min(100, Math.max(0, this.metrics.vibrationLevel + deltas.vibrationLevel));
    }
    this.notify();
  }

  public build(plotId: number, buildingId: BuildingId): boolean {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || plot.building !== null) return false;

    const def = BUILDINGS_CATALOG[buildingId];
    if (!def) return false;

    if (!this.canAfford(def.cost)) return false;

    // Deduct cost
    this.resources.gold -= def.cost.gold ?? 0;
    this.resources.wood -= def.cost.wood ?? 0;
    this.resources.stone -= def.cost.stone ?? 0;
    this.resources.iron -= def.cost.iron ?? 0;
    this.resources.lumens -= def.cost.lumens ?? 0;
    this.resources.aetherCore -= def.cost.aetherCore ?? 0;
    this.resources.food -= def.cost.food ?? 0;
    this.resources.mana -= def.cost.mana ?? 0;
    this.resources.troops -= def.cost.troops ?? 0;
    this.resources.demonShards -= def.cost.demonShards ?? 0;

    plot.building = buildingId;
    this.resources.maxPopulation += def.popCapacityDelta;

    // Apply immediate consequence shifts
    this.metrics.tectonicWeight = Math.min(100, Math.max(0, this.metrics.tectonicWeight + def.weightDelta));
    this.metrics.rootIntegrity = Math.min(100, Math.max(0, this.metrics.rootIntegrity + def.rootDelta));
    this.metrics.toxicityLevel = Math.min(100, Math.max(0, this.metrics.toxicityLevel + def.toxicityDelta));
    this.metrics.vibrationLevel = Math.min(100, Math.max(0, this.metrics.vibrationLevel + def.vibrationDelta));

    this.cityPrestige += 15;

    if (def.category === 'castle') {
      sounds.playCastleHorn();
      this.checkCastleCombination();
    } else {
      sounds.playBuild();
    }

    this.addLog(`Constructed ${def.name}! ${def.consequenceSummary}`, def.category === 'eco' || def.category === 'castle' ? 'positive' : 'warning');

    const ecoLogs = factions.reactToEcology(this.metrics.rootIntegrity, this.metrics.toxicityLevel, buildingId);
    ecoLogs.forEach(l => this.addLog(l, 'warning'));
    warEngine.updatePlayerRank();

    if (buildingId === BuildingId.SKY_MONUMENT) {
      this.evaluateMonumentOutcome();
    }

    this.notify();
    return true;
  }

  public checkCastleCombination() {
    // If player has built 2 Ramparts and 1 Royal Keep, merge them into the GRAND_CITADEL!
    const ramparts = this.plots.filter(p => p.building === BuildingId.CASTLE_RAMPART);
    const keep = this.plots.find(p => p.building === BuildingId.ROYAL_KEEP);

    if (ramparts.length >= 2 && keep) {
      // Upgrade keep to GRAND_CITADEL
      keep.building = BuildingId.GRAND_CITADEL;
      this.cityPrestige += 100;
      sounds.playCastleHorn();
      this.addLog('🏰 CASTLE SYNTHESIS ACHIEVED! The Royal Keep and Ramparts fused into the IMPERIAL AETHER CITADEL!', 'positive');
    }
  }

  public buyShopItem(itemId: string): boolean {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (this.resources.gold < item.costGold) return false;
    if (item.costMaterials?.iron && this.resources.iron < item.costMaterials.iron) return false;
    if (item.costMaterials?.stone && this.resources.stone < item.costMaterials.stone) return false;
    if (item.costMaterials?.lumens && this.resources.lumens < item.costMaterials.lumens) return false;
    if (item.costMaterials?.mana && this.resources.mana < item.costMaterials.mana) return false;
    if (item.costMaterials?.food && this.resources.food < item.costMaterials.food) return false;
    if (item.costMaterials?.troops && this.resources.troops < item.costMaterials.troops) return false;
    if (item.costMaterials?.demonShards && this.resources.demonShards < item.costMaterials.demonShards) return false;

    // Deduct cost
    this.resources.gold -= item.costGold;
    if (item.costMaterials?.iron) this.resources.iron -= item.costMaterials.iron;
    if (item.costMaterials?.stone) this.resources.stone -= item.costMaterials.stone;
    if (item.costMaterials?.lumens) this.resources.lumens -= item.costMaterials.lumens;
    if (item.costMaterials?.mana) this.resources.mana -= item.costMaterials.mana;
    if (item.costMaterials?.food) this.resources.food -= item.costMaterials.food;
    if (item.costMaterials?.troops) this.resources.troops -= item.costMaterials.troops;
    if (item.costMaterials?.demonShards) this.resources.demonShards -= item.costMaterials.demonShards;

    this.inventory[itemId] = (this.inventory[itemId] || 0) + 1;
    sounds.playSaoConfirm();
    this.addLog(`Purchased ${item.name} from city store! Ready for deployment.`, 'positive');

    // Automatically trigger immediate deployment logic
    this.deployShopItem(itemId);

    this.notify();
    return true;
  }

  public deployShopItem(itemId: string) {
    switch (itemId) {
      case 'soap_neutralizer':
        // Acid-Base Neutralization
        sounds.playNeutralizeSuccess();
        this.metrics.toxicityLevel = Math.max(0, this.metrics.toxicityLevel - 45);
        this.solvedDisastersCount += 1;
        this.addLog('🧪 CHEMICAL NEUTRALIZATION DEPLOYED: Basic Alkaline Soap neutralized the cavern acid pool! (pH restored to neutral water).', 'positive');
        break;

      case 'ceiling_jack':
        // Hydraulic Load Redistribution
        sounds.playBuild();
        this.metrics.tectonicWeight = Math.max(0, this.metrics.tectonicWeight - 30);
        this.solvedDisastersCount += 1;
        this.addLog('🔩 HYDRAULIC CEILING JACKS INSTALLED: Steel trusses relieved 30% Tectonic Weight strain and stabilized stalactites!', 'positive');
        break;

      case 'root_fertilizer':
        // Bio-Polymer Soil Solidification
        sounds.playChemicalReact();
        this.metrics.rootIntegrity = Math.min(100, this.metrics.rootIntegrity + 40);
        this.solvedDisastersCount += 1;
        this.addLog('🌱 MYCELIUM NUTRIENTS APPLIED: Subterranean roots reinforced! Slippery mud has consolidated into firm rock footing.', 'positive');
        break;

      case 'sonic_dampener':
        // Destructive Acoustic Interference
        sounds.playSaoConfirm();
        this.metrics.vibrationLevel = 0;
        this.solvedDisastersCount += 1;
        this.addLog('🎛️ ACOUSTIC DAMPENER ONLINE: Destructive interference neutralized all festival tremors. Caverns are peaceful.', 'positive');
        break;

      case 'castle_spire_kit':
        sounds.playCastleHorn();
        this.cityPrestige += 50;
        this.addLog('🚩 ROYAL BATTLESTONES UNLOCKED: Castle towers now gleam with golden Aether spires!', 'positive');
        break;

      case 'ration_packs':
        sounds.playSaoConfirm();
        this.resources.food += 35;
        this.addLog('🌾 SYLVAN GRAIN RATIONS: Distributed 35 nutrient-rich grain rations to citizens and garrison.', 'positive');
        break;

      case 'mana_distiller':
        sounds.playChemicalReact();
        this.resources.mana += 40;
        this.addLog('🔮 AETHERIUM CONDENSER: Condensed +40 pure Aetherium Mana from ambient crystal currents.', 'positive');
        break;

      case 'mercenary_contract':
        sounds.playCastleHorn();
        this.resources.troops += 6;
        this.addLog('⚔️ MERCENARY RECRUITS: 6 battle-hardened sellswords mustered into the city defense garrison.', 'positive');
        break;

      case 'demon_shard_crucible':
        sounds.playChemicalReact();
        if (this.resources.demonShards >= 10) {
          this.resources.demonShards -= 10;
          this.resources.mana += 30;
          this.resources.lumens += 20;
          this.resources.gold += 40;
          this.metrics.toxicityLevel = Math.max(0, this.metrics.toxicityLevel - 20);
          this.addLog('💜 DEMON SHARD CRUCIBLE: Transmuted 10 dark shards into +30 Mana, +20 Lumens, +40 Gold & cleansed 20% Toxicity!', 'positive');
        } else {
          this.metrics.toxicityLevel = Math.max(0, this.metrics.toxicityLevel - 15);
          this.addLog('💜 CRUCIBLE ACTIVE: Purified surrounding cavern air (-15% Toxicity). Collect 10 Shards for deep transmutation.', 'info');
        }
        break;
    }

    const factionMsg = factions.reactToItemDeployment(itemId);
    if (factionMsg) {
      this.addLog(factionMsg, 'positive');
    }
    warEngine.updatePlayerRank();
  }

  public demolish(plotId: number) {
    const plot = this.plots.find(p => p.id === plotId);
    if (!plot || !plot.building) return;

    const def = BUILDINGS_CATALOG[plot.building];
    if (!def) return;

    this.resources.maxPopulation = Math.max(6, this.resources.maxPopulation - def.popCapacityDelta);
    this.metrics.tectonicWeight = Math.min(100, Math.max(0, this.metrics.tectonicWeight - def.weightDelta));
    this.metrics.rootIntegrity = Math.min(100, Math.max(0, this.metrics.rootIntegrity - def.rootDelta));
    this.metrics.toxicityLevel = Math.min(100, Math.max(0, this.metrics.toxicityLevel - def.toxicityDelta));
    this.metrics.vibrationLevel = Math.min(100, Math.max(0, this.metrics.vibrationLevel - def.vibrationDelta));

    plot.building = null;
    this.addLog(`Demolished ${def.name}. Subterranean pressure adjusted.`, 'info');
    sounds.playDemolish();
    this.notify();
  }

  public endDayCycle() {
    this.day += 1;
    sounds.playPassDay();

    let addedGold = 8;
    let addedWood = 0;
    let addedIron = 0;
    let addedFood = 6;
    let addedMana = 4;
    let addedTroops = 0;

    for (const plot of this.plots) {
      if (!plot.building) continue;
      const def = BUILDINGS_CATALOG[plot.building];
      if (def) {
        addedGold += def.passiveGold;
        addedWood += def.passiveWood;
        addedIron += def.passiveIron;
        addedFood += def.passiveFood ?? 0;
        addedMana += def.passiveMana ?? 0;
        addedTroops += def.passiveTroops ?? 0;
      }
    }

    // Rank based bonuses
    if (this.militaryRank === 'captain') {
      addedTroops += 1;
      this.cityPrestige += 2;
    } else if (this.militaryRank === 'king') {
      addedTroops += 3;
      addedMana += 6;
      this.cityPrestige += 6;
    }

    this.resources.gold += addedGold;
    this.resources.wood += addedWood;
    this.resources.iron += addedIron;
    this.resources.food += addedFood;
    this.resources.mana += addedMana;
    this.resources.troops += addedTroops;

    // Population consumes rations
    const foodConsumed = Math.min(this.resources.food, Math.ceil(this.resources.population * 0.25));
    this.resources.food -= foodConsumed;

    if (this.resources.population < this.resources.maxPopulation) {
      if (this.resources.food > 0) {
        this.resources.population += 1;
      }
    }

    this.metrics.vibrationLevel = Math.max(0, this.metrics.vibrationLevel - 15);
    this.cityPrestige += 5;

    if (this.metrics.tectonicWeight >= 85) {
      this.addLog('⚠️ CRITICAL TECTONIC LOAD! Buy a Hydraulic Ceiling Jack from the Forge to prevent collapse!', 'crisis');
    } else if (this.metrics.toxicityLevel >= 55) {
      this.addLog('⚠️ ACID HAZARD! Visit the Alchemist Apothecary for Alkaline Soap to neutralize the pit!', 'crisis');
    } else if (this.resources.food === 0) {
      this.addLog('⚠️ FOOD SHORTAGE! Citizens are hungry! Procure grain rations to sustain population growth.', 'warning');
    } else {
      this.addLog(`Day ${this.day} begins. Collected +${addedGold}G, +${addedWood}W, +${addedIron}Fe, +${addedFood} Food, +${addedMana} Mana.`, 'info');
    }

    // War & Factions Daily Processing
    warEngine.processDayCycle();
    const ecoDaily = factions.reactToEcology(this.metrics.rootIntegrity, this.metrics.toxicityLevel);
    ecoDaily.forEach(l => this.addLog(l, 'warning'));

    this.notify();
  }

  public getCityRank(): { tier: string; title: string; color: string } {
    let p = this.cityPrestige + this.resources.population * 2 + this.resources.troops * 4;
    if (this.militaryRank === 'king') p += 100;
    else if (this.militaryRank === 'captain') p += 40;

    if (p > 350) return { tier: 'SSS', title: 'IMPERIAL AETHER DYNASTY', color: '#f59e0b' };
    if (p > 220) return { tier: 'S', title: 'GRAND CITADEL OF STRATA', color: '#a855f7' };
    if (p > 140) return { tier: 'A', title: 'FORTIFIED MINING METROPOLIS', color: '#00f5ff' };
    if (p > 80) return { tier: 'B', title: 'THRIVING EXPEDITION POST', color: '#22c55e' };
    return { tier: 'C', title: 'PIONEER FRONTIER SETTLEMENT', color: '#94a3b8' };
  }

  private evaluateMonumentOutcome() {
    const totalStrain = this.metrics.tectonicWeight + this.metrics.toxicityLevel + (100 - this.metrics.rootIntegrity);
    if (totalStrain > 150) {
      this.currentMode = GameMode.GAME_OVER;
      sounds.playTremor();
      this.addLog('THE PERVERSE OUTCOME: The Monument stood proud for an hour before the hollow caverns gave way. The city was swallowed whole.', 'crisis');
    } else {
      this.currentMode = GameMode.VICTORY;
      sounds.playVictory();
      this.addLog('HARMONIC TRIUMPH: The Sky-Spire stands in ecological harmony with the deep world below!', 'positive');
    }
  }

  public depositMinedOre(resource: keyof TownResources, amount: number) {
    if (typeof this.resources[resource] === 'number') {
      (this.resources[resource] as number) += amount;
      this.notify();
    }
  }
}

export const gameState = GameStateManager.getInstance();
