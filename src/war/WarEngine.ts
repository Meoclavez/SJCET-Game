import { gameState } from '../state/GameState';
import { sounds } from '../audio/SoundEffects';
import {
  PlayerRank,
  PLAYER_RANKS,
  FactionId,
  RelationshipStatus,
  factions
} from './Factions';
import { BuildingId } from '../types';

export enum UnitType {
  MILITIA = 'MILITIA',
  KNIGHT = 'KNIGHT',
  ARCANE_SORCERER = 'ARCANE_SORCERER',
  AETHER_GOLEM = 'AETHER_GOLEM',
  SYLVAN_RANGER = 'SYLVAN_RANGER',
  MOLEKIN_SAPPER = 'MOLEKIN_SAPPER'
}

export interface UnitDef {
  type: UnitType;
  name: string;
  category: 'infantry' | 'heavy' | 'arcane' | 'colossus' | 'auxiliary';
  icon: string;
  hp: number;
  attack: number;
  defense: number;
  morale: number;
  requiredRank: PlayerRank;
  cost: {
    gold: number;
    wood?: number;
    iron?: number;
    lumens?: number;
    aetherCore?: number;
  };
  description: string;
}

export const UNIT_CATALOG: Record<UnitType, UnitDef> = {
  [UnitType.MILITIA]: {
    type: UnitType.MILITIA,
    name: 'Town Militia',
    category: 'infantry',
    icon: '🛡️',
    hp: 130,
    attack: 26,
    defense: 12,
    morale: 65,
    requiredRank: PlayerRank.PEASANT,
    cost: { gold: 35, wood: 25 },
    description: 'Disciplined volunteer defenders armed with hardened ironwood pikes and round shields.'
  },
  [UnitType.KNIGHT]: {
    type: UnitType.KNIGHT,
    name: 'Heavy Paladin Knight',
    category: 'heavy',
    icon: '⚔️',
    hp: 300,
    attack: 52,
    defense: 34,
    morale: 85,
    requiredRank: PlayerRank.MILITIA_CAPTAIN,
    cost: { gold: 75, iron: 40 },
    description: 'Armored vanguard champions forged in castle smithies. Can withstand furious demonic onslaughts.'
  },
  [UnitType.ARCANE_SORCERER]: {
    type: UnitType.ARCANE_SORCERER,
    name: 'Arcane Battlemage',
    category: 'arcane',
    icon: '🔮',
    hp: 180,
    attack: 90,
    defense: 16,
    morale: 75,
    requiredRank: PlayerRank.WARLORD,
    cost: { gold: 110, lumens: 35 },
    description: 'Academy sorcerers channeling destructive solar beams and arcane barrier fields.'
  },
  [UnitType.AETHER_GOLEM]: {
    type: UnitType.AETHER_GOLEM,
    name: 'Colossal Aether Golem',
    category: 'colossus',
    icon: '🗿',
    hp: 800,
    attack: 145,
    defense: 65,
    morale: 100,
    requiredRank: PlayerRank.SOVEREIGN_KING,
    cost: { gold: 240, iron: 90, lumens: 60 },
    description: 'Towering animated titan powered by pure celestial aether. Unyielding siege juggernaut with complete fear immunity.'
  },
  [UnitType.SYLVAN_RANGER]: {
    type: UnitType.SYLVAN_RANGER,
    name: 'Sylvan Wind-Strider',
    category: 'auxiliary',
    icon: '🍃',
    hp: 210,
    attack: 70,
    defense: 20,
    morale: 90,
    requiredRank: PlayerRank.PEASANT,
    cost: { gold: 50, wood: 40 },
    description: 'Allied Sylvan archers who shoot armor-piercing wind arrows from the root canopies.'
  },
  [UnitType.MOLEKIN_SAPPER]: {
    type: UnitType.MOLEKIN_SAPPER,
    name: 'Molekin Drill Sapper',
    category: 'auxiliary',
    icon: '⛏️',
    hp: 260,
    attack: 62,
    defense: 32,
    morale: 85,
    requiredRank: PlayerRank.PEASANT,
    cost: { gold: 60, iron: 35 },
    description: 'Allied subterranean engineers with pneumatic mining drills that crush defensive walls.'
  }
};

export interface Battalion {
  id: string;
  name: string;
  units: Record<UnitType, number>;
  totalHp: number;
  maxHp: number;
  morale: number; // 0-100%
  attackPower: number;
  defensePower: number;
  stationedTerritoryId: string;
  isMarching: boolean;
  destinationTerritoryId: string | null;
  marchProgress: number; // 0-100%
}

export interface Territory {
  id: string;
  name: string;
  subtitle: string;
  controllingFaction: FactionId;
  fortificationLevel: number; // 0 - 100%
  dailyYield: {
    gold?: number;
    wood?: number;
    iron?: number;
    lumens?: number;
  };
  connectedTo: string[];
  mapCoords: { x: number; y: number };
  lore: string;
  garrisonStrength: number;
  isUnderSiege: boolean;
  bossEntity?: string;
}

export interface EnemyForce {
  name: string;
  faction: FactionId;
  commander: string;
  totalHp: number;
  maxHp: number;
  attackPower: number;
  defensePower: number;
  morale: number;
  isBoss: boolean;
  unitsSummary: string;
}

export interface CombatLogEntry {
  round: number;
  text: string;
  type: 'clash' | 'spell' | 'crit' | 'tactics' | 'victory' | 'defeat' | 'info';
}

export interface ActiveBattle {
  id: string;
  territoryId: string;
  territoryName: string;
  playerBattalion: Battalion;
  enemyForce: EnemyForce;
  round: number;
  isFinished: boolean;
  winner: 'PLAYER' | 'ENEMY' | null;
  playerStance: 'BALANCED' | 'SHIELD_WALL' | 'CHARGE' | 'ARCANE_BARRAGE';
  logs: CombatLogEntry[];
}

export class WarEngine {
  private static instance: WarEngine;

  public currentRank: PlayerRank = PlayerRank.PEASANT;
  public battalions: Battalion[] = [];
  public territories: Territory[] = [];
  public activeBattle: ActiveBattle | null = null;
  public defeatedIncursionsCount: number = 0;
  public totalTerritoriesConquered: number = 0;
  public nextBattalionIndex: number = 1;

  private constructor() {
    this.initTerritories();
    this.initInitialBattalion();
  }

  public static getInstance(): WarEngine {
    if (!WarEngine.instance) {
      WarEngine.instance = new WarEngine();
    }
    return WarEngine.instance;
  }

  private initTerritories() {
    this.territories = [
      {
        id: 'CAPITAL_STRATA',
        name: 'Metropolis of Strata',
        subtitle: 'Sovereign Capital & Foundational Keep',
        controllingFaction: FactionId.PLAYER,
        fortificationLevel: 85,
        dailyYield: { gold: 12 },
        connectedTo: ['WHISPERING_HOLLOW', 'BASALT_CHASM'],
        mapCoords: { x: 14, y: 50 },
        lore: 'The thriving dual-level city built above the rich subterranean iron and lumen shafts.',
        garrisonStrength: 100,
        isUnderSiege: false
      },
      {
        id: 'WHISPERING_HOLLOW',
        name: 'Whispering Hollow',
        subtitle: 'Arbor Frontier & Valley Crossroads',
        controllingFaction: FactionId.NEUTRAL,
        fortificationLevel: 30,
        dailyYield: { wood: 14, gold: 6 },
        connectedTo: ['CAPITAL_STRATA', 'EMERALD_CANOPY', 'OBSIDIAN_WASTES'],
        mapCoords: { x: 38, y: 32 },
        lore: 'A mist-shrouded valley filled with primeval lumber and ancient standing stones.',
        garrisonStrength: 45,
        isUnderSiege: false
      },
      {
        id: 'EMERALD_CANOPY',
        name: 'The Emerald Canopy',
        subtitle: 'Sacred Realm of the Native Sylvans',
        controllingFaction: FactionId.SYLVANS,
        fortificationLevel: 65,
        dailyYield: { wood: 20 },
        connectedTo: ['WHISPERING_HOLLOW', 'AETHERIAN_HIGHLANDS'],
        mapCoords: { x: 62, y: 18 },
        lore: 'Towering Ironwood biomes where Sylvan wind-striders weave living root fortresses.',
        garrisonStrength: 75,
        isUnderSiege: false
      },
      {
        id: 'BASALT_CHASM',
        name: 'The Basalt Chasm',
        subtitle: 'Subterranean Deep Realm of the Molekin',
        controllingFaction: FactionId.MOLEKIN,
        fortificationLevel: 70,
        dailyYield: { iron: 15, lumens: 8 },
        connectedTo: ['CAPITAL_STRATA', 'OBSIDIAN_WASTES'],
        mapCoords: { x: 36, y: 78 },
        lore: 'A labyrinth of geothermal tunnels rich with iron veins and bioluminescent crystal grottos.',
        garrisonStrength: 80,
        isUnderSiege: false
      },
      {
        id: 'AETHERIAN_HIGHLANDS',
        name: 'Aetherian Highlands',
        subtitle: 'Crystal Peaks of Ancient Celestial Resonance',
        controllingFaction: FactionId.NEUTRAL,
        fortificationLevel: 50,
        dailyYield: { lumens: 16, gold: 8 },
        connectedTo: ['EMERALD_CANOPY', 'BRIMSTONE_GATE'],
        mapCoords: { x: 78, y: 32 },
        lore: 'High-altitude ridges radiating uncorrupted celestial magic. A strategic staging ground.',
        garrisonStrength: 60,
        isUnderSiege: false
      },
      {
        id: 'OBSIDIAN_WASTES',
        name: 'Obsidian Wastes',
        subtitle: 'Demon Legion Vanguard Outpost',
        controllingFaction: FactionId.DEMON_LEGION,
        fortificationLevel: 65,
        dailyYield: { iron: 18 },
        connectedTo: ['WHISPERING_HOLLOW', 'BASALT_CHASM', 'BRIMSTONE_GATE'],
        mapCoords: { x: 64, y: 70 },
        lore: 'Scorched volcanic plains overrun by Malgok’s Hellhounds and Infernal vanguard.',
        garrisonStrength: 90,
        isUnderSiege: false
      },
      {
        id: 'BRIMSTONE_GATE',
        name: 'The Brimstone Gate',
        subtitle: 'Abyssal Nether Rift & Malgok’s Stronghold',
        controllingFaction: FactionId.DEMON_LEGION,
        fortificationLevel: 95,
        dailyYield: { gold: 30, lumens: 25, iron: 25 },
        connectedTo: ['AETHERIAN_HIGHLANDS', 'OBSIDIAN_WASTES'],
        mapCoords: { x: 88, y: 55 },
        lore: 'The dimensional chasm torn open between planes. Demon King Malgok commands his legions here.',
        garrisonStrength: 150,
        isUnderSiege: false,
        bossEntity: 'Demon King Malgok'
      }
    ];
  }

  private initInitialBattalion() {
    this.battalions = [
      this.createBattalion('1st Strata Militia Platoon', {
        [UnitType.MILITIA]: 4,
        [UnitType.KNIGHT]: 0,
        [UnitType.ARCANE_SORCERER]: 0,
        [UnitType.AETHER_GOLEM]: 0,
        [UnitType.SYLVAN_RANGER]: 0,
        [UnitType.MOLEKIN_SAPPER]: 0
      }, 'CAPITAL_STRATA')
    ];
  }

  public createBattalion(
    name: string,
    units: Record<UnitType, number>,
    stationedTerritoryId: string
  ): Battalion {
    const b: Battalion = {
      id: `bat_${Date.now()}_${this.nextBattalionIndex++}`,
      name,
      units: { ...units },
      totalHp: 0,
      maxHp: 0,
      morale: 80,
      attackPower: 0,
      defensePower: 0,
      stationedTerritoryId,
      isMarching: false,
      destinationTerritoryId: null,
      marchProgress: 0
    };
    this.recalculateBattalionStats(b);
    return b;
  }

  public recalculateBattalionStats(b: Battalion) {
    let hp = 0;
    let atk = 0;
    let def = 0;

    for (const [uType, count] of Object.entries(b.units) as [UnitType, number][]) {
      const defData = UNIT_CATALOG[uType];
      if (defData && count > 0) {
        hp += defData.hp * count;
        atk += defData.attack * count;
        def += defData.defense * count;
      }
    }

    b.maxHp = Math.max(10, hp);
    if (b.totalHp === 0 || b.totalHp > b.maxHp) {
      b.totalHp = b.maxHp;
    }
    b.attackPower = atk;
    b.defensePower = def;
  }

  public getRankDef(): (typeof PLAYER_RANKS)[PlayerRank] {
    return PLAYER_RANKS[this.currentRank];
  }

  /**
   * Update Player Rank progression dynamically
   */
  public updatePlayerRank(): boolean {
    const hasCitadelOrMonument = gameState.plots.some(
      p => p.building === BuildingId.GRAND_CITADEL || p.building === BuildingId.SKY_MONUMENT
    );

    const conqueredCount = this.territories.filter(t => t.controllingFaction === FactionId.PLAYER).length - 1;
    this.totalTerritoriesConquered = Math.max(0, conqueredCount);

    const evalContext = {
      day: gameState.day,
      cityPrestige: gameState.cityPrestige,
      solvedDisastersCount: gameState.solvedDisastersCount,
      conqueredTerritoriesCount: this.totalTerritoriesConquered,
      defeatedIncursionsCount: this.defeatedIncursionsCount,
      hasCitadelOrMonument
    };

    const ranksHierarchy = [
      PlayerRank.SOVEREIGN_KING,
      PlayerRank.WARLORD,
      PlayerRank.MILITIA_CAPTAIN,
      PlayerRank.SCOUT,
      PlayerRank.PEASANT
    ];

    for (const r of ranksHierarchy) {
      if (PLAYER_RANKS[r].checkUnlocked(evalContext)) {
        if (r !== this.currentRank) {
          const oldRank = this.currentRank;
          this.currentRank = r;
          sounds.playCastleHorn();
          gameState.addLog(
            `👑 ROYAL ADVANCEMENT: You ascended from ${PLAYER_RANKS[oldRank].title} to ${PLAYER_RANKS[r].title} (${PLAYER_RANKS[r].badge})! Command capacity increased!`,
            'positive'
          );
          return true;
        }
        break;
      }
    }
    return false;
  }

  /**
   * Recruit units into a battalion
   */
  public recruitUnit(battalionId: string, unitType: UnitType): { success: boolean; message: string } {
    const battalion = this.battalions.find(b => b.id === battalionId);
    if (!battalion) {
      return { success: false, message: 'Battalion not found.' };
    }

    const unitDef = UNIT_CATALOG[unitType];
    if (!unitDef) {
      return { success: false, message: 'Unknown unit type.' };
    }

    // Check rank requirements
    const rankRankHierarchy = [
      PlayerRank.PEASANT,
      PlayerRank.SCOUT,
      PlayerRank.MILITIA_CAPTAIN,
      PlayerRank.WARLORD,
      PlayerRank.SOVEREIGN_KING
    ];
    if (rankRankHierarchy.indexOf(this.currentRank) < rankRankHierarchy.indexOf(unitDef.requiredRank)) {
      return {
        success: false,
        message: `Locked! Requires rank: ${PLAYER_RANKS[unitDef.requiredRank].title}.`
      };
    }

    // Check costs
    if (gameState.resources.gold < unitDef.cost.gold) {
      return { success: false, message: `Lacking gold! Needs ${unitDef.cost.gold}G.` };
    }
    if (unitDef.cost.wood && gameState.resources.wood < unitDef.cost.wood) {
      return { success: false, message: `Lacking wood! Needs ${unitDef.cost.wood} wood.` };
    }
    if (unitDef.cost.iron && gameState.resources.iron < unitDef.cost.iron) {
      return { success: false, message: `Lacking iron! Needs ${unitDef.cost.iron} iron.` };
    }
    if (unitDef.cost.lumens && gameState.resources.lumens < unitDef.cost.lumens) {
      return { success: false, message: `Lacking lumens! Needs ${unitDef.cost.lumens} lumens.` };
    }

    // Deduct
    gameState.resources.gold -= unitDef.cost.gold;
    if (unitDef.cost.wood) gameState.resources.wood -= unitDef.cost.wood;
    if (unitDef.cost.iron) gameState.resources.iron -= unitDef.cost.iron;
    if (unitDef.cost.lumens) gameState.resources.lumens -= unitDef.cost.lumens;

    battalion.units[unitType] = (battalion.units[unitType] || 0) + 1;
    this.recalculateBattalionStats(battalion);

    sounds.playSwordClash();
    gameState.addLog(
      `⚔️ Recruited 1x ${unitDef.name} into ${battalion.name}! Power: ${battalion.attackPower} ATK / ${battalion.defensePower} DEF.`,
      'positive'
    );
    gameState.notify();

    return {
      success: true,
      message: `Successfully recruited ${unitDef.name} into ${battalion.name}!`
    };
  }

  /**
   * Commission a brand new battalion (if under command cap)
   */
  public musterNewBattalion(name?: string): { success: boolean; message: string } {
    const cap = PLAYER_RANKS[this.currentRank].commandCapacity;
    if (this.battalions.length >= cap) {
      return {
        success: false,
        message: `Command capacity reached (${this.battalions.length}/${cap}). Ascend player rank to command more armies!`
      };
    }

    const goldCost = 50;
    if (gameState.resources.gold < goldCost) {
      return { success: false, message: `Muster fee of ${goldCost} Gold required.` };
    }

    gameState.resources.gold -= goldCost;
    const count = this.battalions.length + 1;
    const bName = name || `Royal Legion #${count}`;
    const newB = this.createBattalion(bName, {
      [UnitType.MILITIA]: 2,
      [UnitType.KNIGHT]: 0,
      [UnitType.ARCANE_SORCERER]: 0,
      [UnitType.AETHER_GOLEM]: 0,
      [UnitType.SYLVAN_RANGER]: 0,
      [UnitType.MOLEKIN_SAPPER]: 0
    }, 'CAPITAL_STRATA');

    this.battalions.push(newB);
    sounds.playWarHorn();
    gameState.addLog(`🚩 New Battalion Mobilized: ${bName} is stationed at Capital Strata!`, 'positive');
    gameState.notify();

    return { success: true, message: `Mobilized ${bName}!` };
  }

  /**
   * Dispatch battalion to march to an adjacent territory
   */
  public marchBattalion(battalionId: string, destinationId: string): { success: boolean; message: string } {
    const b = this.battalions.find(bat => bat.id === battalionId);
    if (!b) return { success: false, message: 'Battalion not found.' };

    const currentT = this.territories.find(t => t.id === b.stationedTerritoryId);
    const destT = this.territories.find(t => t.id === destinationId);
    if (!currentT || !destT) return { success: false, message: 'Invalid territory.' };

    if (!currentT.connectedTo.includes(destinationId)) {
      return { success: false, message: `${destT.name} is not adjacent to ${currentT.name}!` };
    }

    if (b.isMarching) {
      return { success: false, message: `${b.name} is already in transit!` };
    }

    b.isMarching = true;
    b.destinationTerritoryId = destinationId;
    b.marchProgress = 0;

    sounds.playSaoConfirm();
    gameState.addLog(`🚩 ${b.name} started marching toward ${destT.name}!`, 'info');

    // Instantly or fast arrival
    setTimeout(() => {
      this.arriveBattalionAtDestination(b.id);
    }, 1200);

    return { success: true, message: `${b.name} is on the march to ${destT.name}!` };
  }

  private arriveBattalionAtDestination(battalionId: string) {
    const b = this.battalions.find(bat => bat.id === battalionId);
    if (!b || !b.destinationTerritoryId) return;

    const destT = this.territories.find(t => t.id === b.destinationTerritoryId);
    if (!destT) return;

    b.stationedTerritoryId = destT.id;
    b.isMarching = false;
    b.destinationTerritoryId = null;
    b.marchProgress = 100;

    // Check if territory is hostile or under demon occupation
    if (destT.controllingFaction === FactionId.DEMON_LEGION || destT.controllingFaction === FactionId.NEUTRAL) {
      this.initiateSkirmish(b.id, destT.id);
    } else {
      sounds.playSaoConfirm();
      gameState.addLog(`🚩 ${b.name} safely arrived at ${destT.name} and established a garrison.`, 'info');
      gameState.notify();
    }
  }

  /**
   * Initiate a tactical battle against enemy garrison or Demon forces
   */
  public initiateSkirmish(battalionId: string, territoryId: string): { success: boolean; battle?: ActiveBattle; message: string } {
    const b = this.battalions.find(bat => bat.id === battalionId);
    const t = this.territories.find(ter => ter.id === territoryId);
    if (!b || !t) return { success: false, message: 'Invalid battle parameters.' };

    if (this.activeBattle && !this.activeBattle.isFinished) {
      return { success: false, message: 'A tactical battle is already underway!' };
    }

    // Build enemy force based on territory
    let enemyForce: EnemyForce;

    if (territoryId === 'BRIMSTONE_GATE') {
      // Final Boss encounter!
      enemyForce = {
        name: 'The Nether Sovereign Guard',
        faction: FactionId.DEMON_LEGION,
        commander: 'Demon King Malgok (The Void Tyrant)',
        totalHp: 1300,
        maxHp: 1300,
        attackPower: 180,
        defensePower: 75,
        morale: 100,
        isBoss: true,
        unitsSummary: 'Demon King Malgok, 4x Abyssal Dreadnoughts, 6x Void Weavers'
      };
      sounds.playDemonRoar();
      gameState.addLog('🔥 BOSS ENGAGEMENT! Confronting Demon King Malgok at the Brimstone Gate!', 'crisis');
    } else if (t.controllingFaction === FactionId.DEMON_LEGION) {
      enemyForce = {
        name: 'Abyssal Vanguard Legion',
        faction: FactionId.DEMON_LEGION,
        commander: 'Infernal Gate-Lord Xul',
        totalHp: 650,
        maxHp: 650,
        attackPower: 95,
        defensePower: 38,
        morale: 85,
        isBoss: false,
        unitsSummary: '6x Hellhounds, 3x Infernal Vanguard, 2x Void Weavers'
      };
      sounds.playDemonRoar();
      gameState.addLog(`⚔️ ENGAGING DEMON OCCUPIERS at ${t.name}!`, 'crisis');
    } else {
      // Neutral territory wild beasts / bandits
      enemyForce = {
        name: 'Corrupted Wilderness Denizens',
        faction: FactionId.NEUTRAL,
        commander: 'Blighted Alpha Beast',
        totalHp: 380,
        maxHp: 380,
        attackPower: 60,
        defensePower: 22,
        morale: 60,
        isBoss: false,
        unitsSummary: '4x Shadow Prowlers, 2x Bramble Goliaths'
      };
      sounds.playSwordClash();
      gameState.addLog(`⚔️ Cleansing territory defenders at ${t.name}!`, 'warning');
    }

    this.activeBattle = {
      id: `battle_${Date.now()}`,
      territoryId: t.id,
      territoryName: t.name,
      playerBattalion: b,
      enemyForce,
      round: 0,
      isFinished: false,
      winner: null,
      playerStance: 'BALANCED',
      logs: [
        {
          round: 0,
          text: `Battle commenced at ${t.name}! ${b.name} (${b.attackPower} ATK) faces ${enemyForce.name} (${enemyForce.attackPower} ATK).`,
          type: 'info'
        }
      ]
    };

    return { success: true, battle: this.activeBattle, message: 'Battle initiated!' };
  }

  /**
   * Execute 1 tactical turn in the active skirmish
   */
  public stepBattleRound(stance?: 'BALANCED' | 'SHIELD_WALL' | 'CHARGE' | 'ARCANE_BARRAGE') {
    if (!this.activeBattle || this.activeBattle.isFinished) return;

    const battle = this.activeBattle;
    battle.round += 1;
    if (stance) battle.playerStance = stance;

    const b = battle.playerBattalion;
    const ef = battle.enemyForce;

    // Modifiers based on stance
    let playerAtkMod = 1.0;
    let playerDefMod = 1.0;
    let specialMessage = '';

    switch (battle.playerStance) {
      case 'SHIELD_WALL':
        playerAtkMod = 0.85;
        playerDefMod = 1.5;
        specialMessage = '🛡️ Shield Wall established! Defense boosted +50%.';
        break;
      case 'CHARGE':
        playerAtkMod = 1.45;
        playerDefMod = 0.75;
        specialMessage = '⚡ Heavy Cavalry Charge launched! Attack boosted +45%.';
        break;
      case 'ARCANE_BARRAGE':
        playerAtkMod = 1.35;
        playerDefMod = 0.9;
        specialMessage = '🔮 Arcane Battlemages overcharged celestial mana beams!';
        sounds.playSpellCast();
        break;
      default:
        specialMessage = '⚔️ Units maintain disciplined tactical lines.';
        break;
    }

    battle.logs.unshift({
      round: battle.round,
      text: specialMessage,
      type: 'tactics'
    });

    // 1. Arcane / Ranged Skirmish Phase
    const arcaneCount = b.units[UnitType.ARCANE_SORCERER] || 0;
    const sylvanCount = b.units[UnitType.SYLVAN_RANGER] || 0;
    if (arcaneCount > 0 || sylvanCount > 0) {
      const rangedDmg = Math.round(arcaneCount * 45 * playerAtkMod + sylvanCount * 30);
      ef.totalHp = Math.max(0, ef.totalHp - rangedDmg);
      sounds.playSpellCast();
      battle.logs.unshift({
        round: battle.round,
        text: `🔮 Ranged Volley: Arcane beams and wind arrows pierced the enemy for ${rangedDmg} magic damage!`,
        type: 'spell'
      });
    }

    // 2. Melee Frontline Clash
    const netPlayerAtk = Math.round(b.attackPower * playerAtkMod);
    const netEnemyDef = ef.defensePower;
    const dmgToEnemy = Math.max(15, Math.round(netPlayerAtk * (100 / (100 + netEnemyDef))));

    ef.totalHp = Math.max(0, ef.totalHp - dmgToEnemy);
    sounds.playSwordClash();

    // Check crit
    const isCrit = Math.random() < 0.2;
    if (isCrit) {
      const bonus = Math.round(dmgToEnemy * 0.5);
      ef.totalHp = Math.max(0, ef.totalHp - bonus);
      battle.logs.unshift({
        round: battle.round,
        text: `💥 CRITICAL STRIKE! Royal steel struck the enemy flank for +${bonus} extra damage!`,
        type: 'crit'
      });
    } else {
      battle.logs.unshift({
        round: battle.round,
        text: `⚔️ Frontline Clash: Royal forces dealt ${dmgToEnemy} physical damage to ${ef.name}.`,
        type: 'clash'
      });
    }

    // 3. Enemy Retaliation
    if (ef.totalHp > 0) {
      const netEnemyAtk = ef.attackPower;
      const netPlayerDef = Math.round(b.defensePower * playerDefMod);
      const dmgToPlayer = Math.max(12, Math.round(netEnemyAtk * (100 / (100 + netPlayerDef))));

      b.totalHp = Math.max(0, b.totalHp - dmgToPlayer);

      if (ef.isBoss && battle.round % 2 === 0) {
        // Demon King Malgok Hellfire Breath
        const bossHellfire = 55;
        b.totalHp = Math.max(0, b.totalHp - bossHellfire);
        sounds.playDemonRoar();
        battle.logs.unshift({
          round: battle.round,
          text: `🔥 MALGOK HELLFIRE ROAR: Demon King unleashed dark abyssal flames dealing ${bossHellfire} pure damage!`,
          type: 'crit'
        });
      } else {
        battle.logs.unshift({
          round: battle.round,
          text: `💀 Enemy Counter-Attack: ${ef.name} struck back dealing ${dmgToPlayer} damage!`,
          type: 'clash'
        });
      }
    }

    // 4. Resolve Victory or Defeat
    if (ef.totalHp <= 0) {
      this.resolveBattleVictory(battle);
    } else if (b.totalHp <= 0) {
      this.resolveBattleDefeat(battle);
    }

    gameState.notify();
  }

  private resolveBattleVictory(battle: ActiveBattle) {
    battle.isFinished = true;
    battle.winner = 'PLAYER';

    const t = this.territories.find(ter => ter.id === battle.territoryId);
    if (t) {
      t.controllingFaction = FactionId.PLAYER;
      t.fortificationLevel = Math.min(100, t.fortificationLevel + 20);
      t.isUnderSiege = false;
    }

    sounds.playConquestFanfare();

    let rewardText = '';
    if (battle.enemyForce.isBoss) {
      this.defeatedIncursionsCount += 2;
      gameState.cityPrestige += 150;
      gameState.resources.gold += 200;
      gameState.resources.lumens += 80;
      gameState.resources.aetherCore += 1;
      rewardText = '🏆 DEMON KING MALGOK DEFEATED! The Nether Rift is sealed! Gained +200G, +80 Lumens, +1 Aether Core, +150 Prestige!';
    } else {
      this.defeatedIncursionsCount += 1;
      gameState.cityPrestige += 40;
      gameState.resources.gold += 60;
      gameState.resources.iron += 25;
      rewardText = '🏆 VICTORIOUS CONQUEST! Territory liberated! Gained +60 Gold, +25 Iron, +40 Prestige!';
    }

    battle.logs.unshift({
      round: battle.round,
      text: rewardText,
      type: 'victory'
    });

    gameState.addLog(rewardText, 'positive');
    this.updatePlayerRank();
  }

  private resolveBattleDefeat(battle: ActiveBattle) {
    battle.isFinished = true;
    battle.winner = 'ENEMY';

    sounds.playAlert();
    const text = `⚠️ DEFEAT: ${battle.playerBattalion.name} fell in combat against ${battle.enemyForce.name}!`;
    battle.logs.unshift({
      round: battle.round,
      text,
      type: 'defeat'
    });
    gameState.addLog(text, 'crisis');

    // Remove or reset battalion
    const idx = this.battalions.indexOf(battle.playerBattalion);
    if (idx !== -1) {
      this.battalions.splice(idx, 1);
    }
  }

  /**
   * Fast auto-resolve battle
   */
  public autoResolveBattle() {
    if (!this.activeBattle) return;
    while (!this.activeBattle.isFinished && this.activeBattle.round < 20) {
      this.stepBattleRound('BALANCED');
    }
  }

  /**
   * Rally troops with a Royal Decree
   */
  public royalRally(): { success: boolean; message: string } {
    if (!this.activeBattle || this.activeBattle.isFinished) {
      return { success: false, message: 'No active battle.' };
    }

    const costGold = 30;
    if (gameState.resources.gold < costGold) {
      return { success: false, message: `Needs ${costGold} Gold to issue royal rations & rallying war banners.` };
    }

    gameState.resources.gold -= costGold;
    const healAmount = Math.round(this.activeBattle.playerBattalion.maxHp * 0.25);
    this.activeBattle.playerBattalion.totalHp = Math.min(
      this.activeBattle.playerBattalion.maxHp,
      this.activeBattle.playerBattalion.totalHp + healAmount
    );
    this.activeBattle.playerBattalion.morale = 100;

    sounds.playCastleHorn();
    this.activeBattle.logs.unshift({
      round: this.activeBattle.round,
      text: `🎺 ROYAL RALLY! The Monarch blew the War Horn! Restored +${healAmount} HP and maximized battalion morale!`,
      type: 'tactics'
    });

    gameState.notify();
    return { success: true, message: 'Rallied battalion!' };
  }

  /**
   * Day cycle update for War and Territories
   */
  public processDayCycle() {
    this.updatePlayerRank();

    // 1. Collect yields from conquered territories
    let totalAddedGold = 0;
    let totalAddedWood = 0;
    let totalAddedIron = 0;
    let totalAddedLumens = 0;

    for (const t of this.territories) {
      if (t.controllingFaction === FactionId.PLAYER && t.id !== 'CAPITAL_STRATA') {
        if (t.dailyYield.gold) totalAddedGold += t.dailyYield.gold;
        if (t.dailyYield.wood) totalAddedWood += t.dailyYield.wood;
        if (t.dailyYield.iron) totalAddedIron += t.dailyYield.iron;
        if (t.dailyYield.lumens) totalAddedLumens += t.dailyYield.lumens;
      }
    }

    if (totalAddedGold || totalAddedWood || totalAddedIron || totalAddedLumens) {
      gameState.resources.gold += totalAddedGold;
      gameState.resources.wood += totalAddedWood;
      gameState.resources.iron += totalAddedIron;
      gameState.resources.lumens += totalAddedLumens;

      gameState.addLog(
        `🗺️ Territory Conquest Tributes: +${totalAddedGold}G, +${totalAddedWood} Wood, +${totalAddedIron} Iron, +${totalAddedLumens} Lumens.`,
        'positive'
      );
    }

    // 2. Sylvan alliance daily timber gift
    if (factions.sylvans.status === RelationshipStatus.ALLIED) {
      gameState.resources.wood += 15;
      gameState.addLog('🍃 Sylvan Conclave gifted +15 Sacred Timber from the Elder Canopy.', 'positive');
    }

    // 3. Molekin alliance daily metal gift
    if (factions.molekin.status === RelationshipStatus.ALLIED) {
      gameState.resources.iron += 10;
      gameState.resources.lumens += 5;
      gameState.addLog('⛏️ Molekin Sappers delivered +10 Refined Iron and +5 Bioluminescent Crystals.', 'positive');
    }

    // 4. Tick Demon Legion threat
    const incursionRes = factions.tickDemonThreat(gameState.cityPrestige, gameState.day);
    if (incursionRes.invasionTriggered) {
      sounds.playWarHorn();
      sounds.playDemonRoar();
      gameState.addLog(incursionRes.message || '🚨 DEMON INVASION IMMINENT!', 'crisis');

      // Target a vulnerable territory
      const targetCandidates = this.territories.filter(
        t => t.controllingFaction === FactionId.PLAYER && t.id !== 'CAPITAL_STRATA'
      );
      const target = targetCandidates.length > 0 ? targetCandidates[0] : this.territories[0];
      target.isUnderSiege = true;
    }
  }
}

export const warEngine = WarEngine.getInstance();
