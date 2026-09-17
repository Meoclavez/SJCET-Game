export enum PlayerRank {
  PEASANT = 'PEASANT',
  SCOUT = 'SCOUT',
  MILITIA_CAPTAIN = 'MILITIA_CAPTAIN',
  WARLORD = 'WARLORD',
  SOVEREIGN_KING = 'SOVEREIGN_KING'
}

export interface PlayerRankDef {
  rank: PlayerRank;
  title: string;
  badge: string;
  icon: string;
  color: string;
  commandCapacity: number; // Max active battalions player can field
  unlockedUnits: string[];
  description: string;
  requirementsDescription: string;
  checkUnlocked: (context: {
    day: number;
    cityPrestige: number;
    solvedDisastersCount: number;
    conqueredTerritoriesCount: number;
    defeatedIncursionsCount: number;
    hasCitadelOrMonument: boolean;
  }) => boolean;
}

export const PLAYER_RANKS: Record<PlayerRank, PlayerRankDef> = {
  [PlayerRank.PEASANT]: {
    rank: PlayerRank.PEASANT,
    title: 'Tiller of the Soil',
    badge: 'RANK I',
    icon: '🌾',
    color: '#94a3b8',
    commandCapacity: 1,
    unlockedUnits: ['MILITIA'],
    description: 'A humble farmer and laborer surviving on the subterranean frontier. Can muster small civilian militia.',
    requirementsDescription: 'Starting Rank (Automatic)',
    checkUnlocked: () => true
  },
  [PlayerRank.SCOUT]: {
    rank: PlayerRank.SCOUT,
    title: 'Frontier Pathfinder',
    badge: 'RANK II',
    icon: '🏹',
    color: '#22c55e',
    commandCapacity: 2,
    unlockedUnits: ['MILITIA'],
    description: 'Ventured into the unknown caverns and frontier borders. Capable of leading reconnaissance parties.',
    requirementsDescription: 'Survive to Day 2 or achieve 60+ City Prestige',
    checkUnlocked: (ctx) => ctx.day >= 2 || ctx.cityPrestige >= 60
  },
  [PlayerRank.MILITIA_CAPTAIN]: {
    rank: PlayerRank.MILITIA_CAPTAIN,
    title: 'Garrison Commander',
    badge: 'RANK III',
    icon: '🛡️',
    color: '#38bdf8',
    commandCapacity: 3,
    unlockedUnits: ['MILITIA', 'KNIGHT'],
    description: 'Proven leader of fortified ramparts. Commissioned to field heavily armored Knight platoons.',
    requirementsDescription: 'Day 4+, 120+ Prestige, and solve at least 1 crisis',
    checkUnlocked: (ctx) => ctx.day >= 4 && ctx.cityPrestige >= 120 && ctx.solvedDisastersCount >= 1
  },
  [PlayerRank.WARLORD]: {
    rank: PlayerRank.WARLORD,
    title: 'Conqueror of the Reaches',
    badge: 'RANK IV',
    icon: '⚔️',
    color: '#a855f7',
    commandCapacity: 4,
    unlockedUnits: ['MILITIA', 'KNIGHT', 'ARCANE_SORCERER'],
    description: 'Feared tactician wielding elemental battle magic. Unlocks Arcane Sorcerers and tactical war offensives.',
    requirementsDescription: '200+ Prestige, conquer 1 territory or defeat 1 Demon Incursion',
    checkUnlocked: (ctx) =>
      ctx.cityPrestige >= 200 &&
      (ctx.conqueredTerritoriesCount >= 1 || ctx.defeatedIncursionsCount >= 1)
  },
  [PlayerRank.SOVEREIGN_KING]: {
    rank: PlayerRank.SOVEREIGN_KING,
    title: 'Sovereign of the Realm',
    badge: 'RANK V - SUPREME',
    icon: '👑',
    color: '#f59e0b',
    commandCapacity: 6,
    unlockedUnits: ['MILITIA', 'KNIGHT', 'ARCANE_SORCERER', 'AETHER_GOLEM'],
    description: 'Supreme monarch of the civilized realm. Fields legendary Aether Golems and commands the Grand Royal Army.',
    requirementsDescription: '300+ Prestige, build Imperial Citadel/Monument, conquer 2+ territories',
    checkUnlocked: (ctx) =>
      (ctx.cityPrestige >= 300 || ctx.hasCitadelOrMonument) &&
      ctx.conqueredTerritoriesCount >= 2
  }
};

export enum FactionId {
  PLAYER = 'PLAYER',
  SYLVANS = 'SYLVANS',
  MOLEKIN = 'MOLEKIN',
  DEMON_LEGION = 'DEMON_LEGION',
  NEUTRAL = 'NEUTRAL'
}

export enum RelationshipStatus {
  HOSTILE = 'HOSTILE',
  SUSPICIOUS = 'SUSPICIOUS',
  NEUTRAL = 'NEUTRAL',
  FRIENDLY = 'FRIENDLY',
  ALLIED = 'ALLIED'
}

export interface FactionState {
  id: FactionId;
  name: string;
  leaderTitle: string;
  leaderName: string;
  icon: string;
  bannerColor: string;
  reputation: number; // -100 to +100
  status: RelationshipStatus;
  lore: string;
  currentDisposition: string;
  activeTreaties: string[];
  tributeGiven: number;
}

export class FactionManager {
  private static instance: FactionManager;

  public sylvans: FactionState = {
    id: FactionId.SYLVANS,
    name: 'Verdant Sylvan Enclave',
    leaderTitle: 'Arbor Elder',
    leaderName: 'Rowan of the Deep Roots',
    icon: '🍃',
    bannerColor: '#22c55e',
    reputation: 25,
    status: RelationshipStatus.NEUTRAL,
    lore: 'Peaceful nature-born wardens bonded to the primeval Ironwood canopy and mycorrhizal subterranean networks. They observe human industry with cautious vigilance, violently opposing clear-cutting but showering ecological stewards with blessings and Elven Ranger skirmishers.',
    currentDisposition: 'Observing surface forestry practices carefully.',
    activeTreaties: [],
    tributeGiven: 0
  };

  public molekin: FactionState = {
    id: FactionId.MOLEKIN,
    name: 'Subterranean Molekin Burrow',
    leaderTitle: 'High Burrowmaster',
    leaderName: 'Thrum Iron-Paws',
    icon: '⛏️',
    bannerColor: '#f97316',
    reputation: 20,
    status: RelationshipStatus.NEUTRAL,
    lore: 'Hardy cavern subterranean humanoids who dwell within the geothermal basalt strata. Toxic acid drainage seeping from surface foundries burns their grottos and hatcheries. Chemical neutralization of acid pools wins their eternal loyalty and unlocks lethal Tunnel Sappers.',
    currentDisposition: 'Monitoring subterranean water acidity levels in the lower shafts.',
    activeTreaties: [],
    tributeGiven: 0
  };

  public demonLegion: {
    id: FactionId.DEMON_LEGION;
    name: string;
    rulerTitle: string;
    rulerName: string;
    icon: string;
    bannerColor: string;
    threatLevel: number; // 0 - 100%
    invasionReadiness: number; // 0 - 100%
    incursionCount: number;
    activeIncursionTarget: string | null;
    lore: string;
    taunts: string[];
  } = {
    id: FactionId.DEMON_LEGION,
    name: 'Abyssal Demon Legion',
    rulerTitle: 'Nether Warlord',
    rulerName: 'Demon King Malgok',
    icon: '😈',
    bannerColor: '#ef4444',
    threatLevel: 15,
    invasionReadiness: 0,
    incursionCount: 0,
    activeIncursionTarget: null,
    lore: 'Extradimensional void invaders pouring forth from the Brimstone Gate rift. Led by the hulking terror Demon King Malgok, the legion consumes pure Aether energy and seeks to conquer every surface settlement and drag the upper world into molten ash.',
    taunts: [
      'Your fragile stone walls will crumble before my Hellhound vanguard, mortal!',
      'I smell the Aether Core pulsing in your city... Soon, it shall fuel my hellfire forge!',
      'Malgok bows to no sovereign! Your empire shall be reduced to cinder and bone!'
    ]
  };

  private constructor() {}

  public static getInstance(): FactionManager {
    if (!FactionManager.instance) {
      FactionManager.instance = new FactionManager();
    }
    return FactionManager.instance;
  }

  public getStatus(reputation: number): RelationshipStatus {
    if (reputation <= -40) return RelationshipStatus.HOSTILE;
    if (reputation < 0) return RelationshipStatus.SUSPICIOUS;
    if (reputation <= 30) return RelationshipStatus.NEUTRAL;
    if (reputation <= 70) return RelationshipStatus.FRIENDLY;
    return RelationshipStatus.ALLIED;
  }

  /**
   * Called when environmental actions occur (e.g. chopping trees, planting roots, acid changes)
   */
  public reactToEcology(rootIntegrity: number, toxicityLevel: number, buildingId?: string): string[] {
    const feedback: string[] = [];

    // 1. Sylvan Reaction
    if (rootIntegrity >= 85) {
      this.sylvans.reputation = Math.min(100, this.sylvans.reputation + 2);
      this.sylvans.currentDisposition = 'Revering the thriving root canopy and dense woodland.';
    } else if (rootIntegrity < 40) {
      this.sylvans.reputation = Math.max(-100, this.sylvans.reputation - 5);
      this.sylvans.currentDisposition = 'Enraged by clear-cutting and soil erosion! Root spirits weep.';
      feedback.push('🍃 The Native Sylvans condemn your heavy deforestation! (-Reputation)');
    }

    // 2. Molekin Reaction
    if (toxicityLevel <= 15) {
      this.molekin.reputation = Math.min(100, this.molekin.reputation + 2);
      this.molekin.currentDisposition = 'Grateful for pristine, pure subterranean spring water.';
    } else if (toxicityLevel >= 50) {
      this.molekin.reputation = Math.max(-100, this.molekin.reputation - 6);
      this.molekin.currentDisposition = 'Suffering from caustic acid seepage in the lower burrows!';
      feedback.push('⛏️ The Subterranean Molekin choke on your acid runoff! (-Reputation)');
    }

    this.sylvans.status = this.getStatus(this.sylvans.reputation);
    this.molekin.status = this.getStatus(this.molekin.reputation);

    return feedback;
  }

  /**
   * React when player applies specific items (e.g. chemical soap, mycelium fertilizer)
   */
  public reactToItemDeployment(itemId: string): string | null {
    if (itemId === 'soap_neutralizer') {
      this.molekin.reputation = Math.min(100, this.molekin.reputation + 25);
      this.molekin.status = this.getStatus(this.molekin.reputation);
      this.molekin.currentDisposition = 'Overjoyed! Alkaline soap restored safety to their underground burrows.';
      return '⛏️ High Burrowmaster Thrum sends gratitude! Molekin relation surged (+25).';
    }

    if (itemId === 'root_fertilizer') {
      this.sylvans.reputation = Math.min(100, this.sylvans.reputation + 25);
      this.sylvans.status = this.getStatus(this.sylvans.reputation);
      this.sylvans.currentDisposition = 'Harmonious! The mycorrhizal nutrient weave has blessed the forest.';
      return '🍃 Elder Rowan rejoices at your soil stewardship! Sylvan relation surged (+25).';
    }

    return null;
  }

  /**
   * Sylvan diplomatic tribute: Send Timber and Seeds
   */
  public sendSylvanTribute(goldCost: number, woodCost: number): { success: boolean; message: string } {
    this.sylvans.reputation = Math.min(100, this.sylvans.reputation + 20);
    this.sylvans.tributeGiven += 1;
    this.sylvans.status = this.getStatus(this.sylvans.reputation);
    this.sylvans.currentDisposition = 'Deeply appreciative of your diplomatic botanical offerings.';
    return {
      success: true,
      message: '🍃 Delivered herbal seeds and timber supplies to the Sylvans! (+20 Reputation)'
    };
  }

  /**
   * Molekin diplomatic tribute: Send Alkaline Reagents and Refined Iron
   */
  public sendMolekinTribute(goldCost: number, ironCost: number): { success: boolean; message: string } {
    this.molekin.reputation = Math.min(100, this.molekin.reputation + 20);
    this.molekin.tributeGiven += 1;
    this.molekin.status = this.getStatus(this.molekin.reputation);
    this.molekin.currentDisposition = 'Pleased with your metallurgical and chemical gifts.';
    return {
      success: true,
      message: '⛏️ Delivered alkaline buffers and refined iron to High Burrowmaster Thrum! (+20 Reputation)'
    };
  }

  /**
   * Advance demon threat level and invasion readiness
   */
  public tickDemonThreat(cityPrestige: number, day: number): { invasionTriggered: boolean; message?: string } {
    // Threat grows based on city prestige and day
    const growth = 3 + Math.floor(cityPrestige / 80) + Math.min(6, day);
    this.demonLegion.threatLevel = Math.min(100, this.demonLegion.threatLevel + growth);
    this.demonLegion.invasionReadiness = Math.min(100, this.demonLegion.invasionReadiness + 15 + Math.floor(cityPrestige / 100));

    if (this.demonLegion.invasionReadiness >= 100) {
      this.demonLegion.invasionReadiness = 0;
      this.demonLegion.incursionCount += 1;
      return {
        invasionTriggered: true,
        message: `🚨 DEMON KING MALGOK HAS SOUNDED THE WAR HORNS! An Abyssal invasion legion marches from Brimstone Gate!`
      };
    }

    return { invasionTriggered: false };
  }
}

export const factions = FactionManager.getInstance();
