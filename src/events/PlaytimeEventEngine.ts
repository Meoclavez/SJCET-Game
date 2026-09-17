import { gameState } from '../state/GameState';
import { PlaytimeEventDef, MilitaryRank, TownResources } from '../types';
import { sounds } from '../audio/SoundEffects';

declare global {
  interface Window {
    resetGameSession?: () => void;
  }
}

export class PlaytimeEventEngine {
  private static instance: PlaytimeEventEngine;

  private sessionSeconds: number = 0;
  private totalPlaySeconds: number = 0;
  private speedMultiplier: number = 1;
  private timerInterval: number | null = null;
  private saveCounter: number = 0;

  private triggeredEvents: Set<string> = new Set();
  private resolvedEvents: Map<string, number> = new Map();

  // DOM elements
  private hudElement: HTMLElement | null = null;
  private toastContainer: HTMLElement | null = null;
  private decisionModal: HTMLElement | null = null;
  private timelineModal: HTMLElement | null = null;

  private readonly STORAGE_KEY_TOTAL_SECONDS = 'sjcet_playtime_total_seconds';
  private readonly STORAGE_KEY_RESOLVED = 'sjcet_playtime_resolved_events';

  public readonly timelineEvents: PlaytimeEventDef[] = [
    {
      id: 'settlers_arrival',
      triggerMinute: 1,
      title: "Settlers' Arrival",
      subtitle: "Pioneer Migrants at the Northern Ridge",
      icon: "🏕️",
      type: "settlers",
      severity: "low",
      description: "A weary caravan of pioneer farmers and craftsmen from the devastated outer plains has reached your settlement gates. Carrying sacks of drought-resistant grain and hand tools, they plead for sanctuary under your banner. How will you integrate them into the realm?",
      choices: [
        {
          text: "Open Granaries & Welcome As Citizens",
          subtitle: "Distribute starter rations and build homesteads",
          lore: "Provide food from civic stockpiles to nourish the settlers and recruit their youth into the garrison.",
          cost: { food: 20 },
          reward: { population: 8, troops: 4 },
          metricDeltas: { rootIntegrity: 0 },
          prestigeDelta: 20,
          outcomeText: "The grateful settlers build cottages! 4 sturdy pioneers join the city guard, and population rises by 8."
        },
        {
          text: "Impose Commercial Entry Tariffs",
          subtitle: "Levy silver fees before granting residence permits",
          lore: "Charge hefty entry dues to line municipal coffers. They can erect makeshift tents along the outer slopes.",
          cost: {},
          reward: { gold: 75, population: 4 },
          metricDeltas: { rootIntegrity: -12 },
          prestigeDelta: -5,
          outcomeText: "Gold flows into the treasury! However, overcrowded shantytowns erode the hillside root-soil."
        },
        {
          text: "Conscript Labor for Cavern Excavation",
          subtitle: "Direct all able-bodied men directly into deep iron mines",
          lore: "Forcibly enlist the newcomers into the heavy subterranean mining brigades to extract industrial ore.",
          cost: { food: 10 },
          reward: { stone: 60, iron: 30, troops: 6 },
          metricDeltas: { tectonicWeight: +14 },
          prestigeDelta: -10,
          outcomeText: "Quarrying output spikes! 6 conscript miners reinforce the guard, but intense deep drilling rattles the cavern roof."
        }
      ]
    },
    {
      id: 'sylvan_native_envoy',
      triggerMinute: 3,
      title: "Sylvan Native Envoy",
      subtitle: "Ambassador of the Primeval Ironwood Deepwood",
      icon: "🧝",
      type: "diplomacy",
      severity: "medium",
      description: "An ancient Sylvan dryad ambassador crowned with radiant bioluminescent moss steps from the primeval forest. The Envoy demands an immediate cessation of reckless clear-cutting, offering an enchanted timber trade compact in exchange for ecological reverence.",
      choices: [
        {
          text: "Sign the Sacred Arbor Accord",
          subtitle: "Cease clear-cutting & receive ancient druidic blessings",
          lore: "Respect ancient dryad groves. In return, the Sylvan spirits imbue subterranean roots with living mana sap.",
          cost: { wood: 35 },
          reward: { mana: 45, lumens: 20 },
          metricDeltas: { rootIntegrity: +35, toxicityLevel: -10 },
          prestigeDelta: 25,
          outcomeText: "The Sylvan elders bless your roots with eternal sap (+35% Roots)! Ambient aether mana cascades into your stores."
        },
        {
          text: "Establish Regulated Timber Trade",
          subtitle: "Barter forged tools and masonry for cured Ironwood",
          lore: "Propose a diplomatic trade pact: exchange refined iron and cut stone for treated timber without damaging sacred groves.",
          cost: { iron: 20, stone: 35 },
          reward: { wood: 90, food: 25 },
          metricDeltas: { rootIntegrity: +10 },
          prestigeDelta: 15,
          outcomeText: "Trade convoys begin! High-grade treated Sylvan timber flows into town while keeping forest roots stable."
        },
        {
          text: "Banish the Envoy & Clear-Cut the Glade",
          subtitle: "Assert industrial supremacy over forest superstitions",
          lore: "Drive the ambassador away at blade-point and dispatch logging teams into the ancient groves.",
          cost: {},
          reward: { wood: 160, gold: 60 },
          metricDeltas: { rootIntegrity: -45, tectonicWeight: +15 },
          prestigeDelta: -30,
          outcomeText: "The Envoy disappears in an emerald flash with a vengeful curse! Massive clear-cutting triggers severe cavern mudslides."
        }
      ]
    },
    {
      id: 'acid_leak_panic',
      triggerMinute: 6,
      title: "Subterranean Acid Leak Panic",
      subtitle: "Fault-Line Vitriol Rupture in Deep Caverns",
      icon: "🧪",
      type: "crisis",
      severity: "high",
      description: "A violent geological fissure has ripped through the lower cavern stratum! Corrosive emerald vitriol acid is surging upward toward city aquifers, eating away timber supports and threatening complete subterranean collapse. The miners are in sheer panic!",
      choices: [
        {
          text: "Deploy Alkaline Base Magic Neutralization",
          subtitle: "Infuse pure mana reagents to precipitate harmless salts",
          lore: "Synthesize concentrated alkaline mana solutions directly into the rising acid flood, neutralizing it at a chemical level.",
          cost: { mana: 35, lumens: 10 },
          reward: { food: 25 },
          metricDeltas: { toxicityLevel: -50, rootIntegrity: +20 },
          prestigeDelta: 30,
          outcomeText: "🧪 CHEMICAL NEUTRALIZATION: Acid pH normalized to pure mineral water! Toxicity drops by 50% and cavern springs are saved."
        },
        {
          text: "Construct Heavy Iron & Stone Bulkheads",
          subtitle: "Quarantine flooded shafts with fortified blast gates",
          lore: "Dispatch engineers to erect heavy masonry bulkheads to contain the corrosive flood within abandoned shafts.",
          cost: { stone: 65, iron: 30 },
          reward: {},
          metricDeltas: { toxicityLevel: -25, tectonicWeight: +18 },
          prestigeDelta: 10,
          outcomeText: "Bulkheads contain the acid lake, though the colossal stone gates add +18% Tectonic Weight stress to the ceiling."
        },
        {
          text: "Siphon Corrosive Slurry to Surface Drainage",
          subtitle: "Pump vitriol upward into surface drainage ditches",
          lore: "Save deep mining tunnels by venting the acidic sludge to surface agricultural runoff channels.",
          cost: { food: 25 },
          reward: { iron: 25 },
          metricDeltas: { toxicityLevel: +25, vibrationLevel: +20 },
          prestigeDelta: -25,
          outcomeText: "Cavern tunnels remain dry, but caustic fumes destroy surface crops (-25 Food) and sicken citizens (+25% Toxicity)."
        }
      ]
    },
    {
      id: 'demon_scout_patrol',
      triggerMinute: 10,
      title: "Demon King Scout Patrol",
      subtitle: "First Invasion Wave - Obsidian Gargoyles & Void Reavers",
      icon: "👹",
      type: "invasion",
      severity: "critical",
      description: "Air-raid bells ring out in terror! A dimensional portal has torn open in the southern rift crags. Obsidian-armored gargoyles and shadow void-reavers swarm the outer battlements, probing your defenses and slaughtering border sentries for the Demon King!",
      choices: [
        {
          text: "Marshal City Garrison & Counter-Assault",
          subtitle: "Lead trained soldiers in a disciplined steel phalanx",
          lore: "Commit the city's armed troops in a coordinated frontal clash to crush the demonic vanguard and seize their dark power.",
          cost: { troops: 6 },
          reward: { demonShards: 30, gold: 50 },
          metricDeltas: { rootIntegrity: 0 },
          prestigeDelta: 40,
          rankPromotion: 'captain',
          outcomeText: "⚔️ VALOROUS VICTORY! Your garrison smashes the demon vanguard. You reap 30 Demon Shards and are recognized as CAPTAIN!"
        },
        {
          text: "Discharge Prismatic Aether Shock-Wards",
          subtitle: "Channel town mana into a blinding incandescent pulse",
          lore: "Overcharge the alchemical conduit grid, vaporizing the demonic intruders with a searing shockwave of pure radiant mana.",
          cost: { mana: 45, gold: 35 },
          reward: { demonShards: 18, lumens: 20 },
          metricDeltas: { vibrationLevel: -10 },
          prestigeDelta: 30,
          rankPromotion: 'captain',
          outcomeText: "🔮 RADIANT PURGE! Blinding mana incinerates the demons into crystallizing shards! You are acclaimed as CAPTAIN!"
        },
        {
          text: "Surrender Outer Granaries as Demonic Tribute",
          subtitle: "Bribe the vanguard with food supplies to avert slaughter",
          lore: "Bargain with the dark vanguard, throwing open outer storehouses of grain and gold to satisfy their hunger and buy time.",
          cost: { food: 45, gold: 75 },
          reward: { demonShards: 6 },
          metricDeltas: { toxicityLevel: +20 },
          prestigeDelta: -35,
          outcomeText: "The demons loot your granaries with mocking laughter, leaving corrupt sulfuric blight across outer farms (+20% Toxicity)."
        }
      ]
    },
    {
      id: 'coronation_quest',
      triggerMinute: 18,
      title: "Sovereign Coronation Quest",
      subtitle: "Ascension to the Royal Throne of Strata",
      icon: "👑",
      type: "coronation",
      severity: "critical",
      description: "Heralds of the Allied High Kingdoms and the Council of Strata arrive in royal galleons. Having steered the settlement through geological perils and demon incursions, the realm demands a legitimate crowned Sovereign to wield the Scepter of Dominion and unite the populace!",
      choices: [
        {
          text: "Imperial Coronation of Light & Aether",
          subtitle: "Crown ceremony binding soul to the Royal Citadel",
          lore: "Consecrate the royal coronation with sacred mana and gold. Inspire 15 elite royal guards to pledge their lives to the crown.",
          cost: { gold: 110, mana: 55, food: 35 },
          reward: { troops: 15, demonShards: 15 },
          metricDeltas: { rootIntegrity: +25, toxicityLevel: -20 },
          prestigeDelta: 130,
          rankPromotion: 'king',
          outcomeText: "👑 ALL HAIL THE KING! Royal trumpets shake the mountains. You ascend the throne as KING! 15 royal guards swear fealty!"
        },
        {
          text: "Martial Sovereign of the Iron Vanguard",
          subtitle: "Forge the crown from dark steel and arm a massive legion",
          lore: "Cast aside ostentatious feasts; forge treasury metals into armor for 28 vanguard shock-troopers to prepare for the final siege.",
          cost: { iron: 85, stone: 70, gold: 60 },
          reward: { troops: 28, demonShards: 25 },
          metricDeltas: { tectonicWeight: +12 },
          prestigeDelta: 100,
          rankPromotion: 'king',
          outcomeText: "👑 THE WAR KING ASCENDS! An iron-clad royal legion rallies under your battle standard, ready for total war against the Abyss!"
        },
        {
          text: "Regent of the Free Citizen Commonwealth",
          subtitle: "Refuse royal luxury and dedicate wealth to civilian life",
          lore: "Decline monarchic grandeur. Distribute royal treasures as grain and public works, serving as the People's Protector.",
          cost: { gold: 50 },
          reward: { food: 110, population: 18 },
          metricDeltas: { rootIntegrity: +35, toxicityLevel: -20 },
          prestigeDelta: 80,
          rankPromotion: 'captain',
          outcomeText: "The commonwealth thrives! Granaries overflow (+110 Food) and citizens celebrate you as their eternal Champion!"
        }
      ]
    },
    {
      id: 'abyssal_eclipse_siege',
      triggerMinute: 25,
      title: "Abyssal Eclipse Siege",
      subtitle: "Major Multi-Lane Invasion - The Demon King's Dread Fleet",
      icon: "🌌",
      type: "siege",
      severity: "critical",
      description: "The heavens bleed pitch-crimson under a cataclysmic solar eclipse! The earth shrieks as the Demon King's grand dread-armada descends: abyssal siege engines, leviathan nether-behemoths, and demon warlords launch a coordinated multi-lane siege from cavern depths and blackened skies!",
      choices: [
        {
          text: "Deploy Royal Phalanx & Aether Annihilation",
          subtitle: "Multi-lane defense backed by high celestial mana bombardment",
          lore: "Command the full royal army into locked shield-walls while arch-mages discharge catastrophic aether beams into the invasion fleet.",
          cost: { troops: 18, mana: 65 },
          reward: { demonShards: 110, gold: 180 },
          metricDeltas: { toxicityLevel: -35, rootIntegrity: +25 },
          prestigeDelta: 260,
          outcomeText: "🏆 IMMORTAL TRIUMPH! Your phalanxes shatter the Abyssal Armada! The Demon Host is crushed, yielding 110 Demon Shards!"
        },
        {
          text: "Transmute Demon Shards into Super-Weapon Blast",
          subtitle: "Detonate captured shards inside the Aether Core conduit",
          lore: "Load harvested Demon Shards into the core reactor, generating an antimatter singularity that collapses every demon portal in the valley.",
          cost: { demonShards: 25, mana: 40 },
          reward: { lumens: 60, aetherCore: 1, gold: 120 },
          metricDeltas: { vibrationLevel: +25, toxicityLevel: -50 },
          prestigeDelta: 220,
          outcomeText: "🌌 THE ABYSS CONSUMED! The antimatter pulse vaporizes the demon fleet and crystallizes an incandescent AETHER CORE!"
        },
        {
          text: "Fortress Citadel Lockdown & Scorched Traps",
          subtitle: "Fall back behind castle ramparts and trigger deep magma moats",
          lore: "Retreat to the core citadel, detonating perimeter bridges and stone ramparts to trap the demon vanguard in burning rubble.",
          cost: { stone: 65, wood: 65, food: 35 },
          reward: { demonShards: 40 },
          metricDeltas: { tectonicWeight: +30, rootIntegrity: -20 },
          prestigeDelta: 70,
          outcomeText: "The citadel holds! The demon legions dash themselves futilely against the walls and break into retreat, leaving 40 Shards."
        }
      ]
    }
  ];

  private constructor() {
    this.loadPersistence();
    if (typeof window !== 'undefined') {
      window.resetGameSession = () => this.resetGameSession();
      window.addEventListener('game:restart', () => this.resetGameSession());
      window.addEventListener('restartgame', () => this.resetGameSession());
    }
  }

  public static getInstance(): PlaytimeEventEngine {
    if (!PlaytimeEventEngine.instance) {
      PlaytimeEventEngine.instance = new PlaytimeEventEngine();
    }
    if (typeof window !== 'undefined') {
      window.resetGameSession = () => PlaytimeEventEngine.instance.resetGameSession();
    }
    return PlaytimeEventEngine.instance;
  }

  public start() {
    if (typeof window !== 'undefined') {
      window.resetGameSession = () => this.resetGameSession();
    }
    if (this.timerInterval !== null) return;

    this.mountDOM();
    this.updateHUD();

    this.timerInterval = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public resetGameSession() {
    this.sessionSeconds = 0;
    this.triggeredEvents.clear();
    this.resolvedEvents.clear();
    try {
      localStorage.removeItem(this.STORAGE_KEY_RESOLVED);
    } catch {
      // Ignore localStorage errors
    }
    this.updateHUD();
  }

  private tick() {
    const delta = this.speedMultiplier;
    this.sessionSeconds += delta;
    this.totalPlaySeconds += delta;
    this.saveCounter += delta;

    if (this.saveCounter >= 5) {
      this.savePersistence();
      this.saveCounter = 0;
    }

    const totalHours = Number((this.totalPlaySeconds / 3600).toFixed(2));
    gameState.updatePlaytime(this.sessionSeconds, totalHours);

    this.updateHUD();
    this.checkTimelineEvents();
  }

  public advanceTime(seconds: number) {
    this.sessionSeconds += seconds;
    this.totalPlaySeconds += seconds;
    this.savePersistence();
    const totalHours = Number((this.totalPlaySeconds / 3600).toFixed(2));
    gameState.updatePlaytime(this.sessionSeconds, totalHours);
    this.updateHUD();
    this.checkTimelineEvents();
  }

  public setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = Math.max(1, multiplier);
    this.updateHUD();
    gameState.addLog(`Playtime clock speed set to ${this.speedMultiplier}x`, 'info');
  }

  public getSessionSeconds(): number {
    return this.sessionSeconds;
  }

  public getTotalPlayHours(): number {
    return Number((this.totalPlaySeconds / 3600).toFixed(2));
  }

  public static formatClock(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  private checkTimelineEvents() {
    const currentMinute = Math.floor(this.sessionSeconds / 60);

    for (const event of this.timelineEvents) {
      if (currentMinute >= event.triggerMinute && !this.triggeredEvents.has(event.id)) {
        this.triggerEvent(event);
      }
    }
  }

  public triggerEventById(eventId: string) {
    const event = this.timelineEvents.find(e => e.id === eventId);
    if (event) {
      this.triggerEvent(event);
    }
  }

  private triggerEvent(event: PlaytimeEventDef) {
    this.triggeredEvents.add(event.id);
    this.savePersistence();

    if (event.severity === 'critical' || event.type === 'invasion' || event.type === 'siege') {
      sounds.playTremor();
      sounds.playHazardAlarm();
    } else if (event.type === 'coronation') {
      sounds.playRoyalFanfare();
    } else {
      sounds.playHazardAlarm();
    }

    gameState.addLog(`⚡ EVENT TRIGGERED: [Minute ${event.triggerMinute}] ${event.title} - ${event.subtitle}`, event.severity === 'critical' ? 'crisis' : 'warning');

    this.showToast(event);
    this.openDecisionModal(event);
    this.updateHUD();
  }

  public resolveEventChoice(event: PlaytimeEventDef, choiceIndex: number) {
    const choice = event.choices[choiceIndex];
    if (!choice) return;

    // Check affordability with fallback for emergency choices
    if (choice.cost && !gameState.canAfford(choice.cost)) {
      sounds.playHazardAlarm();
      alert("Insufficient resources to execute this directive! Choose an alternative plan or procure resources.");
      return;
    }

    // Deduct costs
    if (choice.cost) {
      gameState.deductResources(choice.cost);
    }

    // Award rewards
    if (choice.reward) {
      gameState.addResources(choice.reward);
    }

    // Apply consequence metrics
    if (choice.metricDeltas) {
      gameState.modifyMetrics(choice.metricDeltas);
    }

    // Apply prestige
    if (choice.prestigeDelta) {
      gameState.cityPrestige += choice.prestigeDelta;
    }

    // Apply rank promotion
    if (choice.rankPromotion) {
      gameState.setMilitaryRank(choice.rankPromotion);
    }

    // Play victory / confirm sound
    if (event.type === 'coronation' || choice.rankPromotion === 'king') {
      sounds.playRoyalFanfare();
    } else if (event.id === 'acid_leak_panic' && choiceIndex === 0) {
      sounds.playNeutralizeSuccess();
    } else {
      sounds.playSaoConfirm();
    }

    // Mark resolved
    this.resolvedEvents.set(event.id, choiceIndex);
    this.savePersistence();

    // Log resolution
    gameState.addLog(choice.outcomeText, 'positive');

    // Close decision modal
    this.closeDecisionModal();

    // Show resolution toast
    this.showResolutionToast(event.title, choice.outcomeText);

    this.updateHUD();
  }

  private mountDOM() {
    if (document.getElementById('sao-playtime-hud')) return;

    // 1. Digital HUD Clock Bar
    this.hudElement = document.createElement('div');
    this.hudElement.id = 'sao-playtime-hud';
    this.hudElement.className = 'sao-playtime-hud';
    this.hudElement.innerHTML = `
      <div class="hud-clock-section" id="hud-clock-toggle" title="Elapsed Playtime Session">
        <span class="hud-clock-icon">⏱️</span>
        <span class="hud-digital-clock" id="hud-digital-clock">00:00:00</span>
        <span class="hud-total-hours" id="hud-total-hours">Total: 0.0h</span>
      </div>

      <div class="hud-rank-section rank-peasant" id="hud-rank-badge" title="Military Command Rank">
        <span class="rank-icon" id="hud-rank-icon">🎖️</span>
        <span class="rank-title" id="hud-rank-title">PEASANT</span>
      </div>

      <div class="hud-timeline-trigger">
        <button class="hud-timeline-btn" id="hud-btn-timeline">
          📜 EVENTS (<span id="hud-events-resolved-count">0</span>/6)
        </button>
      </div>

      <div class="hud-speed-controls">
        <button class="hud-spd-btn active" id="btn-spd-1x" title="Normal 1x Speed">1x</button>
        <button class="hud-spd-btn" id="btn-spd-5x" title="Fast Forward 5x">5x</button>
        <button class="hud-spd-btn glow-gold" id="btn-spd-min" title="Test Trigger: Advance +1 Minute">+1m</button>
      </div>
    `;
    document.body.appendChild(this.hudElement);

    // 2. Toast Notifications Container
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'sao-toast-container';
    this.toastContainer.className = 'sao-toast-container';
    document.body.appendChild(this.toastContainer);

    // 3. Decision Modal Backdrop
    this.decisionModal = document.createElement('div');
    this.decisionModal.id = 'sao-event-modal';
    this.decisionModal.className = 'sao-modal-backdrop';
    this.decisionModal.style.display = 'none';
    document.body.appendChild(this.decisionModal);

    // 4. Timeline Modal Backdrop
    this.timelineModal = document.createElement('div');
    this.timelineModal.id = 'sao-timeline-modal';
    this.timelineModal.className = 'sao-modal-backdrop';
    this.timelineModal.style.display = 'none';
    document.body.appendChild(this.timelineModal);

    this.bindDOMEvents();
  }

  private bindDOMEvents() {
    document.getElementById('btn-spd-1x')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.setSpeedMultiplier(1);
    });

    document.getElementById('btn-spd-5x')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.setSpeedMultiplier(5);
    });

    document.getElementById('btn-spd-min')?.addEventListener('click', () => {
      sounds.playSaoConfirm();
      this.advanceTime(60);
    });

    document.getElementById('hud-btn-timeline')?.addEventListener('click', () => {
      sounds.playSaoOpen();
      this.openTimelineModal();
    });
  }

  private updateHUD() {
    const clockElem = document.getElementById('hud-digital-clock');
    if (clockElem) {
      clockElem.innerText = PlaytimeEventEngine.formatClock(this.sessionSeconds);
    }

    const totalHoursElem = document.getElementById('hud-total-hours');
    if (totalHoursElem) {
      totalHoursElem.innerText = `Total: ${this.getTotalPlayHours()}h`;
    }

    // Update Rank Badge
    const rank = gameState.militaryRank;
    const rankElem = document.getElementById('hud-rank-badge');
    const rankTitle = document.getElementById('hud-rank-title');
    const rankIcon = document.getElementById('hud-rank-icon');
    if (rankElem && rankTitle && rankIcon) {
      rankElem.className = `hud-rank-section rank-${rank}`;
      rankTitle.innerText = rank.toUpperCase();
      if (rank === 'king') {
        rankIcon.innerText = '👑';
      } else if (rank === 'captain') {
        rankIcon.innerText = '⚔️';
      } else {
        rankIcon.innerText = '🎖️';
      }
    }

    // Update Speed Buttons UI
    document.querySelectorAll('.hud-spd-btn').forEach(btn => btn.classList.remove('active'));
    if (this.speedMultiplier === 1) {
      document.getElementById('btn-spd-1x')?.classList.add('active');
    } else if (this.speedMultiplier === 5) {
      document.getElementById('btn-spd-5x')?.classList.add('active');
    }

    // Update resolved count
    const resolvedElem = document.getElementById('hud-events-resolved-count');
    if (resolvedElem) {
      resolvedElem.innerText = `${this.resolvedEvents.size}`;
    }
  }

  private showToast(event: PlaytimeEventDef) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `sao-toast toast-${event.severity}`;
    toast.id = `toast-${event.id}`;
    toast.innerHTML = `
      <div class="toast-indicator"></div>
      <div class="toast-icon-box">${event.icon}</div>
      <div class="toast-body">
        <div class="toast-meta">
          <span class="toast-badge">${event.severity.toUpperCase()} ALERT</span>
          <span class="toast-min">MIN ${event.triggerMinute}</span>
        </div>
        <div class="toast-title">${event.title}</div>
        <div class="toast-sub">${event.subtitle}</div>
      </div>
      <button class="toast-cta-btn" data-event-id="${event.id}">DECIDE</button>
    `;

    this.toastContainer.appendChild(toast);

    toast.querySelector('.toast-cta-btn')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      toast.remove();
      this.openDecisionModal(event);
    });

    // Auto remove toast after 18 seconds if ignored
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 400);
      }
    }, 18000);
  }

  private showResolutionToast(title: string, outcome: string) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'sao-toast toast-resolution';
    toast.innerHTML = `
      <div class="toast-indicator"></div>
      <div class="toast-icon-box">📜</div>
      <div class="toast-body">
        <div class="toast-meta">
          <span class="toast-badge-success">DIRECTIVE EXECUTED</span>
        </div>
        <div class="toast-title">${title}</div>
        <div class="toast-sub">${outcome}</div>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 400);
      }
    }, 8000);
  }

  public openDecisionModal(event: PlaytimeEventDef) {
    if (!this.decisionModal) return;

    const isResolved = this.resolvedEvents.has(event.id);
    const chosenIdx = this.resolvedEvents.get(event.id);

    this.decisionModal.innerHTML = `
      <div class="sao-glass-panel sao-decision-dialog">
        <div class="sao-panel-header">
          <div class="sao-title-group">
            <span class="sao-badge ${event.severity === 'critical' ? 'badge-critical' : ''}">${event.type.toUpperCase()} CRISIS</span>
            <h2>${event.icon} ${event.title}</h2>
          </div>
          <div class="sao-header-right">
            <span class="sao-event-time">⏱️ MINUTE ${event.triggerMinute} TIMELINE</span>
            <button class="sao-close-btn" id="sao-decision-close">✕</button>
          </div>
        </div>

        <div class="sao-event-header-sub">
          <strong>${event.subtitle}</strong>
        </div>

        <div class="sao-event-narrative">
          <p>${event.description}</p>
        </div>

        ${isResolved ? `<div class="sao-resolved-banner">✅ DIRECTIVE PREVIOUSLY RESOLVED WITH OPTION ${chosenIdx! + 1}</div>` : ''}

        <div class="sao-decision-cards-grid">
          ${event.choices.map((c, idx) => {
            const canAfford = !c.cost || gameState.canAfford(c.cost);
            const isSelected = isResolved && chosenIdx === idx;
            return `
              <div class="sao-decision-card ${canAfford ? 'affordable' : 'unaffordable'} ${isSelected ? 'selected-decision' : ''}">
                <div class="decision-card-top">
                  <span class="decision-opt-num">DIRECTIVE ${idx + 1}</span>
                  <div class="decision-opt-title">${c.text}</div>
                </div>

                ${c.subtitle ? `<div class="decision-opt-sub">${c.subtitle}</div>` : ''}

                <div class="decision-lore">${c.lore}</div>

                <div class="decision-breakdown">
                  <!-- Costs -->
                  <div class="breakdown-row">
                    <span class="row-tag">COST:</span>
                    <div class="chip-container">
                      ${this.renderCostChips(c.cost)}
                    </div>
                  </div>

                  <!-- Rewards -->
                  <div class="breakdown-row">
                    <span class="row-tag">REWARD:</span>
                    <div class="chip-container">
                      ${this.renderRewardChips(c.reward, c.prestigeDelta, c.rankPromotion)}
                    </div>
                  </div>

                  <!-- Metric shifts -->
                  ${c.metricDeltas ? `
                    <div class="breakdown-row">
                      <span class="row-tag">ECOLOGY:</span>
                      <div class="chip-container">
                        ${this.renderMetricChips(c.metricDeltas)}
                      </div>
                    </div>
                  ` : ''}
                </div>

                <button class="sao-action-btn ${canAfford ? 'glow-cyan' : ''} decision-exec-btn"
                  data-choice-idx="${idx}"
                  ${(!canAfford || isResolved) ? 'disabled' : ''}>
                  ${isSelected ? 'CURRENT DIRECTIVE' : isResolved ? 'COMPLETED' : canAfford ? 'EXECUTE DIRECTIVE' : 'LACK RESOURCES'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.decisionModal.style.display = 'flex';

    document.getElementById('sao-decision-close')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeDecisionModal();
    });

    this.decisionModal.querySelectorAll('.decision-exec-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idxStr = (e.currentTarget as HTMLElement).getAttribute('data-choice-idx');
        if (idxStr !== null) {
          const idx = parseInt(idxStr, 10);
          this.resolveEventChoice(event, idx);
        }
      });
    });
  }

  public closeDecisionModal() {
    if (this.decisionModal) {
      this.decisionModal.style.display = 'none';
    }
  }

  public openTimelineModal() {
    if (!this.timelineModal) return;

    this.timelineModal.innerHTML = `
      <div class="sao-glass-panel sao-timeline-dialog">
        <div class="sao-panel-header">
          <div class="sao-title-group">
            <span class="sao-badge">CHRONICLES OF STRATA</span>
            <h2>📜 PLAYTIME EVENT TIMELINE</h2>
          </div>
          <button class="sao-close-btn" id="sao-timeline-close">✕</button>
        </div>

        <div class="sao-panel-sub">
          ⏱️ <strong>Session Playtime:</strong> ${PlaytimeEventEngine.formatClock(this.sessionSeconds)} | 
          <strong>Total Machine Playtime:</strong> ${this.getTotalPlayHours()} hours | 
          <strong>Rank:</strong> ${gameState.militaryRank.toUpperCase()}
        </div>

        <div class="sao-timeline-list">
          ${this.timelineEvents.map(e => {
            const isResolved = this.resolvedEvents.has(e.id);
            const isTriggered = this.triggeredEvents.has(e.id);
            const currentMin = Math.floor(this.sessionSeconds / 60);
            const isUpcoming = currentMin < e.triggerMinute;

            return `
              <div class="sao-timeline-entry ${isResolved ? 'resolved' : isTriggered ? 'active-threat' : 'locked'}">
                <div class="tl-time-col">
                  <div class="tl-minute">MIN ${e.triggerMinute}</div>
                  <div class="tl-status-badge ${isResolved ? 'badge-resolved' : isTriggered ? 'badge-active' : 'badge-locked'}">
                    ${isResolved ? 'RESOLVED' : isTriggered ? 'ACTIVE' : 'UPCOMING'}
                  </div>
                </div>

                <div class="tl-content-col">
                  <div class="tl-header">
                    <span class="tl-icon">${e.icon}</span>
                    <span class="tl-title">${e.title}</span>
                    <span class="tl-subtitle">- ${e.subtitle}</span>
                  </div>
                  <div class="tl-desc">${e.description}</div>
                </div>

                <div class="tl-action-col">
                  <button class="sao-action-btn glow-cyan tl-inspect-btn" data-event-id="${e.id}">
                    ${isResolved ? 'INSPECT OUTCOME' : 'VIEW DIRECTIVES'}
                  </button>
                  <button class="sao-action-btn tl-trigger-now-btn" data-event-id="${e.id}" title="Dev/Review Fast Trigger">
                    TRIGGER NOW
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.timelineModal.style.display = 'flex';

    document.getElementById('sao-timeline-close')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeTimelineModal();
    });

    this.timelineModal.querySelectorAll('.tl-inspect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-event-id');
        if (id) {
          const ev = this.timelineEvents.find(x => x.id === id);
          if (ev) {
            this.closeTimelineModal();
            this.openDecisionModal(ev);
          }
        }
      });
    });

    this.timelineModal.querySelectorAll('.tl-trigger-now-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-event-id');
        if (id) {
          const ev = this.timelineEvents.find(x => x.id === id);
          if (ev) {
            this.closeTimelineModal();
            this.triggerEvent(ev);
          }
        }
      });
    });
  }

  public closeTimelineModal() {
    if (this.timelineModal) {
      this.timelineModal.style.display = 'none';
    }
  }

  private renderCostChips(cost?: Partial<TownResources>): string {
    if (!cost || Object.keys(cost).length === 0) {
      return `<span class="chip chip-free">FREE / DIPLOMATIC</span>`;
    }
    const chips: string[] = [];
    const iconMap: Record<string, string> = {
      gold: '💰', wood: '🌲', stone: '🪨', iron: '⚙️', lumens: '✨',
      food: '🌾', mana: '🔮', troops: '⚔️', demonShards: '💜'
    };
    for (const [res, amt] of Object.entries(cost)) {
      if (amt && amt > 0) {
        const hasEnough = (gameState.resources[res as keyof TownResources] ?? 0) >= amt;
        chips.push(`<span class="chip chip-cost ${hasEnough ? 'afford' : 'lacking'}">${iconMap[res] || ''} -${amt} ${res}</span>`);
      }
    }
    return chips.join(' ');
  }

  private renderRewardChips(reward?: Partial<TownResources>, prestige?: number, rank?: MilitaryRank): string {
    const chips: string[] = [];
    const iconMap: Record<string, string> = {
      gold: '💰', wood: '🌲', stone: '🪨', iron: '⚙️', lumens: '✨', aetherCore: '💎',
      food: '🌾', mana: '🔮', troops: '⚔️', demonShards: '💜', population: '👥'
    };
    if (reward) {
      for (const [res, amt] of Object.entries(reward)) {
        if (amt && amt > 0) {
          chips.push(`<span class="chip chip-reward">${iconMap[res] || '🎁'} +${amt} ${res}</span>`);
        }
      }
    }
    if (prestige) {
      chips.push(`<span class="chip chip-prestige">🏰 +${prestige} Prestige</span>`);
    }
    if (rank) {
      chips.push(`<span class="chip chip-rank glow-gold">🎖️ RANK: ${rank.toUpperCase()}</span>`);
    }
    if (chips.length === 0) return `<span class="chip chip-neutral">None</span>`;
    return chips.join(' ');
  }

  private renderMetricChips(deltas: { tectonicWeight?: number; rootIntegrity?: number; toxicityLevel?: number; vibrationLevel?: number }): string {
    const chips: string[] = [];
    if (deltas.tectonicWeight) {
      const isPositive = deltas.tectonicWeight < 0;
      chips.push(`<span class="chip ${isPositive ? 'chip-good' : 'chip-bad'}">⚖️ Weight ${deltas.tectonicWeight > 0 ? '+' : ''}${deltas.tectonicWeight}%</span>`);
    }
    if (deltas.rootIntegrity) {
      const isPositive = deltas.rootIntegrity > 0;
      chips.push(`<span class="chip ${isPositive ? 'chip-good' : 'chip-bad'}">🌿 Roots ${deltas.rootIntegrity > 0 ? '+' : ''}${deltas.rootIntegrity}%</span>`);
    }
    if (deltas.toxicityLevel) {
      const isPositive = deltas.toxicityLevel < 0;
      chips.push(`<span class="chip ${isPositive ? 'chip-good' : 'chip-bad'}">☣️ Toxic ${deltas.toxicityLevel > 0 ? '+' : ''}${deltas.toxicityLevel}%</span>`);
    }
    if (deltas.vibrationLevel) {
      const isPositive = deltas.vibrationLevel < 0;
      chips.push(`<span class="chip ${isPositive ? 'chip-good' : 'chip-bad'}">🎛️ Tremor ${deltas.vibrationLevel > 0 ? '+' : ''}${deltas.vibrationLevel}%</span>`);
    }
    return chips.join(' ');
  }

  private loadPersistence() {
    try {
      const savedSecs = localStorage.getItem(this.STORAGE_KEY_TOTAL_SECONDS);
      if (savedSecs) {
        this.totalPlaySeconds = parseInt(savedSecs, 10) || 0;
      }
      const savedEvents = localStorage.getItem(this.STORAGE_KEY_RESOLVED);
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents) as [string, number][];
        this.resolvedEvents = new Map(parsed);
        for (const [id] of this.resolvedEvents) {
          this.triggeredEvents.add(id);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private savePersistence() {
    try {
      localStorage.setItem(this.STORAGE_KEY_TOTAL_SECONDS, this.totalPlaySeconds.toString());
      localStorage.setItem(this.STORAGE_KEY_RESOLVED, JSON.stringify(Array.from(this.resolvedEvents.entries())));
    } catch {
      // Ignore localStorage errors
    }
  }
}

export const playtimeEngine = PlaytimeEventEngine.getInstance();
