export enum GameMode {
  SURFACE = 'SURFACE',
  CAVERN = 'CAVERN',
  SHOWCASE_3D = 'SHOWCASE_3D',
  TRANSITION = 'TRANSITION',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type MilitaryRank = 'peasant' | 'captain' | 'king';

export interface TownResources {
  gold: number;
  wood: number;
  stone: number;
  iron: number;
  lumens: number;
  aetherCore: number;
  food: number;
  mana: number;
  troops: number;
  demonShards: number;
  population: number;
  maxPopulation: number;
}

export interface ConsequenceMetrics {
  tectonicWeight: number;    // 0 - 100% (Ceiling sags, falling stalactites)
  rootIntegrity: number;     // 0 - 100% (100 = solid rock, <40 = slippery mudslides)
  toxicityLevel: number;     // 0 - 100% (0 = healing spring, >50 = lethal acid pool)
  vibrationLevel: number;    // 0 - 100% (Spikes during festivals, shatters geodes)
}

export enum BuildingId {
  COTTAGE = 'COTTAGE',
  TOWN_HALL = 'TOWN_HALL',
  LUMBER_MILL = 'LUMBER_MILL',
  SMELTER = 'SMELTER',
  FESTIVAL_PLAZA = 'FESTIVAL_PLAZA',
  ROOT_NURSERY = 'ROOT_NURSERY',
  CANAL_FILTER = 'CANAL_FILTER',
  ALCHEMIST_SHOP = 'ALCHEMIST_SHOP',
  BLACKSMITH_FORGE = 'BLACKSMITH_FORGE',
  CASTLE_RAMPART = 'CASTLE_RAMPART',
  ROYAL_KEEP = 'ROYAL_KEEP',
  GRAND_CITADEL = 'GRAND_CITADEL',
  SKY_MONUMENT = 'SKY_MONUMENT'
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  category: 'growth' | 'industry' | 'culture' | 'eco' | 'store' | 'castle' | 'monument';
  description: string;
  icon: string;
  cost: {
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
  };
  benefits: string;
  consequenceSummary: string;
  weightDelta: number;
  rootDelta: number;
  toxicityDelta: number;
  vibrationDelta: number;
  popCapacityDelta: number;
  passiveGold: number;
  passiveWood: number;
  passiveIron: number;
  passiveFood?: number;
  passiveMana?: number;
  passiveTroops?: number;
}

export interface SurfacePlot {
  id: number;
  x: number;
  y: number;
  building: BuildingId | null;
}

export interface MiningNode {
  x: number;
  y: number;
  type: 'stone' | 'coal' | 'iron' | 'lumens' | 'aether' | 'stalactite';
  maxHp: number;
  hp: number;
  yieldAmount: number;
  resourceKey: keyof TownResources;
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'chemical' | 'engineering' | 'ecological' | 'prestige' | 'military' | 'arcane';
  icon: string;
  costGold: number;
  costMaterials?: {
    iron?: number;
    stone?: number;
    lumens?: number;
    mana?: number;
    food?: number;
    troops?: number;
    demonShards?: number;
  };
  tagline: string;
  scientificLogic: string;
  description: string;
  inStock: boolean;
}

export interface PlaytimeEventChoice {
  text: string;
  subtitle?: string;
  lore: string;
  cost?: Partial<TownResources>;
  reward?: Partial<TownResources>;
  metricDeltas?: {
    tectonicWeight?: number;
    rootIntegrity?: number;
    toxicityLevel?: number;
    vibrationLevel?: number;
  };
  prestigeDelta?: number;
  rankPromotion?: MilitaryRank;
  outcomeText: string;
}

export interface PlaytimeEventDef {
  id: string;
  triggerMinute: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  type: 'settlers' | 'diplomacy' | 'crisis' | 'invasion' | 'coronation' | 'siege';
  severity: 'low' | 'medium' | 'high' | 'critical';
  choices: PlaytimeEventChoice[];
}

