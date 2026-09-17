import { gameState } from '../state/GameState';
import { sounds } from '../audio/SoundEffects';
import {
  warEngine,
  UnitType,
  UNIT_CATALOG,
  Territory,
  Battalion,
  ActiveBattle
} from '../war/WarEngine';
import {
  factions,
  PlayerRank,
  PLAYER_RANKS,
  FactionId,
  RelationshipStatus
} from '../war/Factions';

export type WarRoomTab = 'map' | 'army' | 'diplomacy' | 'skirmish';

export class WarRoomUI {
  private static instance: WarRoomUI;
  private container: HTMLElement;
  private isOpen: boolean = false;
  private activeTab: WarRoomTab = 'map';
  private selectedTerritoryId: string = 'CAPITAL_STRATA';
  private selectedBattalionId: string | null = null;

  private constructor() {
    this.container = document.createElement('div');
    this.container.id = 'sao-war-root';
    document.body.appendChild(this.container);

    this.render();
    gameState.subscribe(() => {
      if (this.isOpen) {
        this.updateContent();
      }
    });
  }

  public static getInstance(): WarRoomUI {
    if (!WarRoomUI.instance) {
      WarRoomUI.instance = new WarRoomUI();
    }
    return WarRoomUI.instance;
  }

  public open(defaultTab?: WarRoomTab) {
    this.isOpen = true;
    if (defaultTab) this.activeTab = defaultTab;

    // Ensure selected battalion is valid
    if (warEngine.battalions.length > 0 && !this.selectedBattalionId) {
      this.selectedBattalionId = warEngine.battalions[0].id;
    }

    const modal = document.getElementById('sao-war-modal');
    if (modal) modal.style.display = 'flex';
    sounds.playModalWhoosh();
    sounds.playWarMarch();
    this.updateContent();
  }

  public get isOpened(): boolean {
    return this.isOpen;
  }

  public close() {
    this.isOpen = false;
    const modal = document.getElementById('sao-war-modal');
    if (modal) modal.style.display = 'none';
    sounds.playModalWhoosh();
  }

  private render() {
    this.container.innerHTML = `
      <div class="sao-modal-backdrop" id="sao-war-modal" style="display: none;">
        <div class="sao-glass-panel sao-war-panel">
          <!-- Header Bar -->
          <div class="sao-panel-header">
            <div class="sao-title-group">
              <span class="sao-badge glow-gold">WAR ROOM</span>
              <h2>STRATEGIC COMMAND & PARALLEL CONQUEST</h2>
            </div>
            <div class="sao-war-rank-header" id="war-header-rank-badge">
              <!-- Rendered dynamically -->
            </div>
            <button class="sao-close-btn" id="sao-war-close">✕</button>
          </div>

          <!-- Navigation Sub-Tabs -->
          <div class="sao-war-tabs">
            <button class="sao-war-tab-btn active" data-tab="map">🗺️ WORLD MAP CONQUEST</button>
            <button class="sao-war-tab-btn" data-tab="army">⚔️ ARMY MOBILIZATION</button>
            <button class="sao-war-tab-btn" data-tab="diplomacy">📜 FACTIONS COUNCIL</button>
            <button class="sao-war-tab-btn" data-tab="skirmish" id="sao-tab-skirmish-btn">💥 TACTICAL SKIRMISH</button>
          </div>

          <!-- Main Tab Content Host -->
          <div class="sao-war-content-body" id="sao-war-tab-content">
            <!-- Dynamically populated per tab -->
          </div>
        </div>
      </div>
    `;

    this.bindStaticEvents();
  }

  private bindStaticEvents() {
    document.getElementById('sao-war-close')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('sao-war-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.close();
      }
    });

    const tabs = this.container.querySelectorAll('.sao-war-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const selected = target.getAttribute('data-tab') as WarRoomTab;
        if (selected) {
          sounds.playSaoSelect();
          this.switchTab(selected);
        }
      });
    });
  }

  public switchTab(tab: WarRoomTab) {
    this.activeTab = tab;
    const tabs = this.container.querySelectorAll('.sao-war-tab-btn');
    tabs.forEach(btn => {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.updateContent();
  }

  private updateContent() {
    this.updateHeaderRank();
    const content = document.getElementById('sao-war-tab-content');
    if (!content) return;

    // Update Skirmish Tab Badge if battle is live
    const skirmishBtn = document.getElementById('sao-tab-skirmish-btn');
    if (skirmishBtn) {
      if (warEngine.activeBattle && !warEngine.activeBattle.isFinished) {
        skirmishBtn.classList.add('glow-red');
        skirmishBtn.innerText = '🔥 ACTIVE BATTLE IN PROGRESS!';
      } else {
        skirmishBtn.classList.remove('glow-red');
        skirmishBtn.innerText = '💥 TACTICAL SKIRMISH';
      }
    }

    switch (this.activeTab) {
      case 'map':
        content.innerHTML = this.renderMapTab();
        this.bindMapTabEvents();
        break;
      case 'army':
        content.innerHTML = this.renderArmyTab();
        this.bindArmyTabEvents();
        break;
      case 'diplomacy':
        content.innerHTML = this.renderDiplomacyTab();
        this.bindDiplomacyTabEvents();
        break;
      case 'skirmish':
        content.innerHTML = this.renderSkirmishTab();
        this.bindSkirmishTabEvents();
        break;
    }
  }

  private updateHeaderRank() {
    const el = document.getElementById('war-header-rank-badge');
    if (!el) return;
    const rDef = warEngine.getRankDef();
    el.innerHTML = `
      <span class="war-rank-pill" style="border-color: ${rDef.color}; color: ${rDef.color}">
        ${rDef.icon} ${rDef.badge} : ${rDef.title}
      </span>
      <span class="war-cap-pill">
        🛡️ BATTALIONS: ${warEngine.battalions.length} / ${rDef.commandCapacity}
      </span>
    `;
  }

  // ==========================================
  // TAB 1: WORLD MAP CONQUEST
  // ==========================================
  private renderMapTab(): string {
    const selectedT = warEngine.territories.find(t => t.id === this.selectedTerritoryId) || warEngine.territories[0];

    // SVG Connections between territories
    const connectionsSvg = `
      <svg class="sao-map-svg-routes" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="14" y1="50" x2="38" y2="32" class="map-route-line" />
        <line x1="14" y1="50" x2="36" y2="78" class="map-route-line" />
        <line x1="38" y1="32" x2="62" y2="18" class="map-route-line" />
        <line x1="38" y1="32" x2="64" y2="70" class="map-route-line" />
        <line x1="62" y1="18" x2="78" y2="32" class="map-route-line" />
        <line x1="36" y1="78" x2="64" y2="70" class="map-route-line" />
        <line x1="78" y1="32" x2="88" y2="55" class="map-route-line" />
        <line x1="64" y1="70" x2="88" y2="55" class="map-route-line" />
      </svg>
    `;

    // Territory Nodes
    const territoryNodes = warEngine.territories.map(t => {
      const isSelected = t.id === this.selectedTerritoryId;
      let factionColor = '#94a3b8';
      let icon = '🏳️';
      if (t.controllingFaction === FactionId.PLAYER) {
        factionColor = '#00f5ff';
        icon = '👑';
      } else if (t.controllingFaction === FactionId.SYLVANS) {
        factionColor = '#22c55e';
        icon = '🍃';
      } else if (t.controllingFaction === FactionId.MOLEKIN) {
        factionColor = '#f97316';
        icon = '⛏️';
      } else if (t.controllingFaction === FactionId.DEMON_LEGION) {
        factionColor = '#ef4444';
        icon = '😈';
      }

      // Check if player battalion is stationed here
      const stationedBat = warEngine.battalions.find(b => b.stationedTerritoryId === t.id && !b.isMarching);

      return `
        <div class="sao-map-node ${isSelected ? 'selected' : ''} ${t.isUnderSiege ? 'siege-flash' : ''}"
             data-territory-id="${t.id}"
             style="left: ${t.mapCoords.x}%; top: ${t.mapCoords.y}%; border-color: ${factionColor}">
          <span class="node-icon">${icon}</span>
          <span class="node-label" style="color: ${factionColor}">${t.name}</span>
          ${stationedBat ? `<span class="stationed-tag">🛡️ ${stationedBat.name}</span>` : ''}
          ${t.isUnderSiege ? `<span class="siege-tag">🔥 UNDER SIEGE</span>` : ''}
        </div>
      `;
    }).join('');

    // Selected Territory Detail Sidebar
    const playerBatHere = warEngine.battalions.find(b => b.stationedTerritoryId === selectedT.id && !b.isMarching);
    const canAttack = selectedT.controllingFaction !== FactionId.PLAYER;
    const isPlayerControlled = selectedT.controllingFaction === FactionId.PLAYER;

    // Available battalions to march
    const marchOptions = warEngine.battalions.filter(b => b.stationedTerritoryId !== selectedT.id && !b.isMarching);

    return `
      <div class="sao-war-map-layout">
        <!-- Interactive Map Visualizer Canvas -->
        <div class="sao-tactical-map-viewport">
          <div class="sao-map-grid-overlay"></div>
          ${connectionsSvg}
          ${territoryNodes}
          <div class="sao-map-legend">
            <span><strong style="color: #00f5ff">■</strong> Player Realm</span>
            <span><strong style="color: #22c55e">■</strong> Sylvan Enclave</span>
            <span><strong style="color: #f97316">■</strong> Molekin Burrow</span>
            <span><strong style="color: #ef4444">■</strong> Demon Legion</span>
            <span><strong style="color: #94a3b8">■</strong> Neutral Buffer</span>
          </div>
        </div>

        <!-- Strategic Territory Dossier Panel -->
        <div class="sao-territory-dossier">
          <div class="dossier-header">
            <div class="dossier-title-wrap">
              <span class="dossier-badge">TERRITORY DOSSIER</span>
              <h3>${selectedT.name}</h3>
              <div class="dossier-sub">${selectedT.subtitle}</div>
            </div>
            <div class="dossier-faction-flag" style="color: ${selectedT.controllingFaction === FactionId.PLAYER ? '#00f5ff' : selectedT.controllingFaction === FactionId.DEMON_LEGION ? '#ef4444' : '#fbbf24'}">
              CONTROL: ${selectedT.controllingFaction}
            </div>
          </div>

          <p class="dossier-lore">${selectedT.lore}</p>

          <div class="dossier-metrics">
            <div class="metric-item">
              <span class="label">🏰 FORTIFICATION</span>
              <span class="val">${selectedT.fortificationLevel}%</span>
            </div>
            <div class="metric-item">
              <span class="label">🌾 DAILY YIELD</span>
              <span class="val">
                ${selectedT.dailyYield.gold ? `💰+${selectedT.dailyYield.gold} ` : ''}
                ${selectedT.dailyYield.wood ? `🌲+${selectedT.dailyYield.wood} ` : ''}
                ${selectedT.dailyYield.iron ? `⚙️+${selectedT.dailyYield.iron} ` : ''}
                ${selectedT.dailyYield.lumens ? `✨+${selectedT.dailyYield.lumens}` : ''}
              </span>
            </div>
            <div class="metric-item">
              <span class="label">🛡️ LOCAL GARRISON</span>
              <span class="val">${playerBatHere ? playerBatHere.name : 'No Royal Guard Stationed'}</span>
            </div>
          </div>

          <!-- Tactical Actions for this Territory -->
          <div class="dossier-actions">
            ${canAttack ? `
              <button class="sao-action-btn glow-red" id="btn-launch-conquest" ${warEngine.battalions.length === 0 ? 'disabled' : ''}>
                ⚔️ LAUNCH CONQUEST SKIRMISH
              </button>
            ` : `
              <div class="dossier-secure-notice">
                ✅ Territory under sovereign crown rule. Yields passive revenue daily.
              </div>
            `}

            ${marchOptions.length > 0 ? `
              <div class="march-selector-group">
                <label>DISPATCH BATTALION HERE:</label>
                <div class="march-row">
                  <select id="select-march-battalion" class="sao-select">
                    ${marchOptions.map(b => `<option value="${b.id}">${b.name} (${b.attackPower} ATK)</option>`).join('')}
                  </select>
                  <button class="sao-action-btn glow-cyan" id="btn-dispatch-march">DISPATCH</button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private bindMapTabEvents() {
    // Select territory node click
    this.container.querySelectorAll('.sao-map-node').forEach(node => {
      node.addEventListener('click', (e) => {
        const tId = (e.currentTarget as HTMLElement).getAttribute('data-territory-id');
        if (tId) {
          sounds.playSaoSelect();
          this.selectedTerritoryId = tId;
          this.updateContent();
        }
      });
    });

    // Launch conquest attack
    document.getElementById('btn-launch-conquest')?.addEventListener('click', () => {
      // Find a ready battalion
      const readyBat = warEngine.battalions[0];
      if (!readyBat) return;

      const res = warEngine.initiateSkirmish(readyBat.id, this.selectedTerritoryId);
      if (res.success) {
        sounds.playWarMarch();
        this.switchTab('skirmish');
      } else {
        alert(res.message);
      }
    });

    // Dispatch march
    document.getElementById('btn-dispatch-march')?.addEventListener('click', () => {
      const select = document.getElementById('select-march-battalion') as HTMLSelectElement;
      if (select && select.value) {
        const res = warEngine.marchBattalion(select.value, this.selectedTerritoryId);
        if (res.success) {
          sounds.playWarMarch();
          this.updateContent();
        } else {
          alert(res.message);
        }
      }
    });
  }

  // ==========================================
  // TAB 2: ARMY MOBILIZATION & BARRACKS
  // ==========================================
  private renderArmyTab(): string {
    const rankDef = warEngine.getRankDef();
    const canMusterNew = warEngine.battalions.length < rankDef.commandCapacity;

    // Unit Catalog for recruitment
    const recruitableUnits = [
      UnitType.MILITIA,
      UnitType.KNIGHT,
      UnitType.ARCANE_SORCERER,
      UnitType.AETHER_GOLEM
    ];

    const selectedBat = warEngine.battalions.find(b => b.id === this.selectedBattalionId) || warEngine.battalions[0];

    const battalionsHtml = warEngine.battalions.map(b => {
      const isSelected = selectedBat && b.id === selectedBat.id;
      const t = warEngine.territories.find(ter => ter.id === b.stationedTerritoryId);
      return `
        <div class="sao-battalion-card ${isSelected ? 'selected' : ''}" data-battalion-id="${b.id}">
          <div class="bat-card-header">
            <span class="bat-title">🛡️ ${b.name}</span>
            <span class="bat-loc">📍 ${t ? t.name : 'In Transit'}</span>
          </div>
          <div class="bat-stats-row">
            <span>❤️ HP: ${b.totalHp} / ${b.maxHp}</span>
            <span>⚔️ ATK: ${b.attackPower}</span>
            <span>🛡️ DEF: ${b.defensePower}</span>
            <span>🔥 MORALE: ${b.morale}%</span>
          </div>
          <div class="bat-units-pills">
            ${Object.entries(b.units)
              .filter(([_, count]) => count > 0)
              .map(([uType, count]) => {
                const uDef = UNIT_CATALOG[uType as UnitType];
                return `<span class="u-pill">${uDef ? uDef.icon : '⚔️'} ${count}x ${uDef ? uDef.name : uType}</span>`;
              }).join('')}
          </div>
        </div>
      `;
    }).join('');

    const recruitmentCardsHtml = recruitableUnits.map(uType => {
      const uDef = UNIT_CATALOG[uType];
      const rankRankHierarchy = [
        PlayerRank.PEASANT,
        PlayerRank.SCOUT,
        PlayerRank.MILITIA_CAPTAIN,
        PlayerRank.WARLORD,
        PlayerRank.SOVEREIGN_KING
      ];
      const isUnlocked = rankRankHierarchy.indexOf(warEngine.currentRank) >= rankRankHierarchy.indexOf(uDef.requiredRank);
      const canAfford =
        gameState.resources.gold >= uDef.cost.gold &&
        (!uDef.cost.wood || gameState.resources.wood >= uDef.cost.wood) &&
        (!uDef.cost.iron || gameState.resources.iron >= uDef.cost.iron) &&
        (!uDef.cost.lumens || gameState.resources.lumens >= uDef.cost.lumens);

      return `
        <div class="sao-recruit-card ${isUnlocked ? '' : 'locked'}">
          <div class="rc-top">
            <span class="rc-icon">${uDef.icon}</span>
            <div class="rc-info">
              <div class="rc-name">${uDef.name}</div>
              <div class="rc-req">REQ: ${PLAYER_RANKS[uDef.requiredRank].badge}</div>
            </div>
            <div class="rc-cost">
              💰${uDef.cost.gold}G
              ${uDef.cost.wood ? `🌲${uDef.cost.wood}` : ''}
              ${uDef.cost.iron ? `⚙️${uDef.cost.iron}` : ''}
              ${uDef.cost.lumens ? `✨${uDef.cost.lumens}` : ''}
            </div>
          </div>
          <p class="rc-desc">${uDef.description}</p>
          <div class="rc-stats">
            <span>❤️ ${uDef.hp} HP</span>
            <span>⚔️ ${uDef.attack} ATK</span>
            <span>🛡️ ${uDef.defense} DEF</span>
          </div>
          <button class="sao-action-btn glow-cyan btn-recruit-unit"
                  data-unit-type="${uDef.type}"
                  ${!isUnlocked || !canAfford || !selectedBat ? 'disabled' : ''}>
            ${!isUnlocked ? 'LOCKED BY RANK' : !canAfford ? 'INSUFFICIENT RESOURCES' : `RECRUIT INTO ${selectedBat ? selectedBat.name : 'BATTALION'}`}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="sao-army-layout">
        <!-- Left: Royal Rank & Standing Battalions -->
        <div class="army-roster-column">
          <div class="royal-rank-banner" style="border-color: ${rankDef.color}">
            <div class="rrb-icon">${rankDef.icon}</div>
            <div class="rrb-details">
              <div class="rrb-title" style="color: ${rankDef.color}">${rankDef.badge}: ${rankDef.title}</div>
              <div class="rrb-desc">${rankDef.description}</div>
              <div class="rrb-req">REQUIREMENTS: ${rankDef.requirementsDescription}</div>
            </div>
          </div>

          <div class="battalions-header-row">
            <h4>MOBILIZED BATTALIONS (${warEngine.battalions.length} / ${rankDef.commandCapacity})</h4>
            <button class="sao-action-btn glow-gold" id="btn-muster-battalion" ${canMusterNew && gameState.resources.gold >= 50 ? '' : 'disabled'}>
              + MUSTER BATTALION (50G)
            </button>
          </div>

          <div class="battalions-list-grid">
            ${battalionsHtml}
          </div>
        </div>

        <!-- Right: Recruitment Armory -->
        <div class="army-recruitment-column">
          <h4>ROYAL FORGE & BARRACKS RECRUITMENT</h4>
          <p class="armory-sub">Assign newly trained troops into your active battalions to strengthen battle power.</p>
          <div class="recruitment-grid">
            ${recruitmentCardsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private bindArmyTabEvents() {
    // Select battalion
    this.container.querySelectorAll('.sao-battalion-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-battalion-id');
        if (id) {
          sounds.playSaoSelect();
          this.selectedBattalionId = id;
          this.updateContent();
        }
      });
    });

    // Muster new battalion
    document.getElementById('btn-muster-battalion')?.addEventListener('click', () => {
      const res = warEngine.musterNewBattalion();
      if (res.success) {
        sounds.playWarMarch();
        this.updateContent();
      } else {
        alert(res.message);
      }
    });

    // Recruit unit
    this.container.querySelectorAll('.btn-recruit-unit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const uType = (e.currentTarget as HTMLElement).getAttribute('data-unit-type') as UnitType;
        if (uType && this.selectedBattalionId) {
          const res = warEngine.recruitUnit(this.selectedBattalionId, uType);
          if (res.success) {
            if (uType === UnitType.ARCANE_SORCERER) {
              sounds.playSpellCast();
            } else {
              sounds.playBattleClash();
            }
            this.updateContent();
          } else {
            alert(res.message);
          }
        }
      });
    });
  }

  // ==========================================
  // TAB 3: DIPLOMATIC COUNCIL
  // ==========================================
  private renderDiplomacyTab(): string {
    const s = factions.sylvans;
    const m = factions.molekin;
    const d = factions.demonLegion;

    return `
      <div class="sao-diplomacy-grid">
        <!-- 1. Native Sylvans Card -->
        <div class="sao-diplo-card sylvan-border">
          <div class="diplo-card-header">
            <span class="diplo-avatar">🍃</span>
            <div>
              <div class="diplo-title">${s.name}</div>
              <div class="diplo-leader">${s.leaderTitle} ${s.leaderName}</div>
            </div>
            <span class="diplo-status-pill status-${s.status.toLowerCase()}">${s.status}</span>
          </div>

          <p class="diplo-lore">${s.lore}</p>

          <div class="diplo-reaction-box">
            <strong>CURRENT MOOD:</strong> ${s.currentDisposition}
          </div>

          <div class="diplo-meter-wrap">
            <div class="meter-label">
              <span>RELATIONSHIP REPUTATION</span>
              <span>${s.reputation} / 100</span>
            </div>
            <div class="meter-bar-bg">
              <div class="meter-bar-fill sylvan-fill" style="width: ${Math.max(5, (s.reputation + 100) / 2)}%"></div>
            </div>
          </div>

          <div class="diplo-actions">
            <button class="sao-action-btn glow-cyan" id="btn-tribute-sylvans" ${gameState.resources.gold < 30 || gameState.resources.wood < 40 ? 'disabled' : ''}>
              🎁 DELIVER BOTANICAL SEEDS (30G, 40 Wood)
            </button>
            <button class="sao-action-btn" id="btn-recruit-rangers" ${s.status !== RelationshipStatus.ALLIED && s.status !== RelationshipStatus.FRIENDLY ? 'disabled' : ''}>
              🏹 ENLIST SYLVAN WIND-STRIDER (50G, 40 Wood)
            </button>
          </div>
        </div>

        <!-- 2. Subterranean Molekin Card -->
        <div class="sao-diplo-card molekin-border">
          <div class="diplo-card-header">
            <span class="diplo-avatar">⛏️</span>
            <div>
              <div class="diplo-title">${m.name}</div>
              <div class="diplo-leader">${m.leaderTitle} ${m.leaderName}</div>
            </div>
            <span class="diplo-status-pill status-${m.status.toLowerCase()}">${m.status}</span>
          </div>

          <p class="diplo-lore">${m.lore}</p>

          <div class="diplo-reaction-box">
            <strong>CURRENT MOOD:</strong> ${m.currentDisposition}
          </div>

          <div class="diplo-meter-wrap">
            <div class="meter-label">
              <span>RELATIONSHIP REPUTATION</span>
              <span>${m.reputation} / 100</span>
            </div>
            <div class="meter-bar-bg">
              <div class="meter-bar-fill molekin-fill" style="width: ${Math.max(5, (m.reputation + 100) / 2)}%"></div>
            </div>
          </div>

          <div class="diplo-actions">
            <button class="sao-action-btn glow-cyan" id="btn-tribute-molekin" ${gameState.resources.gold < 30 || gameState.resources.iron < 35 ? 'disabled' : ''}>
              🎁 DELIVER ALKALINE BUFFER & IRON (30G, 35 Iron)
            </button>
            <button class="sao-action-btn" id="btn-recruit-sappers" ${m.status !== RelationshipStatus.ALLIED && m.status !== RelationshipStatus.FRIENDLY ? 'disabled' : ''}>
              ⛏️ ENLIST MOLEKIN DRILL SAPPER (60G, 35 Iron)
            </button>
          </div>
        </div>

        <!-- 3. Demon King Malgok Threat Card -->
        <div class="sao-diplo-card demon-border">
          <div class="diplo-card-header">
            <span class="diplo-avatar">😈</span>
            <div>
              <div class="diplo-title">${d.name}</div>
              <div class="diplo-leader">${d.rulerTitle} ${d.rulerName}</div>
            </div>
            <span class="diplo-status-pill status-hostile">HOSTILE NEMESIS</span>
          </div>

          <p class="diplo-lore">${d.lore}</p>

          <div class="diplo-taunt-box">
            <strong>MALGOK'S WARNING:</strong> "${d.taunts[gameState.day % d.taunts.length]}"
          </div>

          <div class="diplo-meter-wrap">
            <div class="meter-label">
              <span>ABYSSAL INVASION READINESS</span>
              <span style="color: #ef4444">${d.invasionReadiness}%</span>
            </div>
            <div class="meter-bar-bg">
              <div class="meter-bar-fill demon-fill" style="width: ${d.invasionReadiness}%"></div>
            </div>
          </div>

          <div class="diplo-actions">
            <button class="sao-action-btn glow-red" id="btn-confront-malgok">
              ⚔️ CONFRONT BRIMSTONE GATE RIFT
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private bindDiplomacyTabEvents() {
    // Sylvan tribute
    document.getElementById('btn-tribute-sylvans')?.addEventListener('click', () => {
      if (gameState.resources.gold >= 30 && gameState.resources.wood >= 40) {
        gameState.resources.gold -= 30;
        gameState.resources.wood -= 40;
        const res = factions.sendSylvanTribute(30, 40);
        sounds.playSaoConfirm();
        gameState.addLog(res.message, 'positive');
        this.updateContent();
      }
    });

    // Recruit Sylvan Ranger
    document.getElementById('btn-recruit-rangers')?.addEventListener('click', () => {
      if (warEngine.battalions.length > 0) {
        const b = warEngine.battalions[0];
        if (gameState.resources.gold >= 50 && gameState.resources.wood >= 40) {
          gameState.resources.gold -= 50;
          gameState.resources.wood -= 40;
          b.units[UnitType.SYLVAN_RANGER] = (b.units[UnitType.SYLVAN_RANGER] || 0) + 1;
          warEngine.recalculateBattalionStats(b);
          sounds.playSpellCast();
          gameState.addLog(`🍃 Sylvan Wind-Strider pledged service to ${b.name}!`, 'positive');
          this.updateContent();
        }
      }
    });

    // Molekin tribute
    document.getElementById('btn-tribute-molekin')?.addEventListener('click', () => {
      if (gameState.resources.gold >= 30 && gameState.resources.iron >= 35) {
        gameState.resources.gold -= 30;
        gameState.resources.iron -= 35;
        const res = factions.sendMolekinTribute(30, 35);
        sounds.playSaoConfirm();
        gameState.addLog(res.message, 'positive');
        this.updateContent();
      }
    });

    // Recruit Molekin Sapper
    document.getElementById('btn-recruit-sappers')?.addEventListener('click', () => {
      if (warEngine.battalions.length > 0) {
        const b = warEngine.battalions[0];
        if (gameState.resources.gold >= 60 && gameState.resources.iron >= 35) {
          gameState.resources.gold -= 60;
          gameState.resources.iron -= 35;
          b.units[UnitType.MOLEKIN_SAPPER] = (b.units[UnitType.MOLEKIN_SAPPER] || 0) + 1;
          warEngine.recalculateBattalionStats(b);
          sounds.playMineHit();
          gameState.addLog(`⛏️ Molekin Drill Sapper joined forces with ${b.name}!`, 'positive');
          this.updateContent();
        }
      }
    });

    // Confront Malgok directly
    document.getElementById('btn-confront-malgok')?.addEventListener('click', () => {
      this.selectedTerritoryId = 'BRIMSTONE_GATE';
      this.switchTab('map');
    });
  }

  // ==========================================
  // TAB 4: TACTICAL SKIRMISH SIMULATOR
  // ==========================================
  private renderSkirmishTab(): string {
    const battle = warEngine.activeBattle;

    if (!battle) {
      return `
        <div class="skirmish-empty-state">
          <span class="empty-icon">🛡️</span>
          <h3>NO ACTIVE SKIRMISH ENGAGED</h3>
          <p>Deploy battalions from the World Map to liberate territories, repel Demon King Malgok's incursions, or conquer strongholds.</p>
          <button class="sao-action-btn glow-cyan" id="btn-goto-map">OPEN WORLD MAP</button>
        </div>
      `;
    }

    const b = battle.playerBattalion;
    const ef = battle.enemyForce;

    const playerHpPercent = Math.max(0, Math.round((b.totalHp / b.maxHp) * 100));
    const enemyHpPercent = Math.max(0, Math.round((ef.totalHp / ef.maxHp) * 100));

    const combatLogsHtml = battle.logs.map(log => {
      let colorClass = 'log-clash';
      if (log.type === 'spell') colorClass = 'log-spell';
      if (log.type === 'crit') colorClass = 'log-crit';
      if (log.type === 'tactics') colorClass = 'log-tactics';
      if (log.type === 'victory') colorClass = 'log-victory';
      if (log.type === 'defeat') colorClass = 'log-defeat';
      return `<div class="skirmish-log-entry ${colorClass}">[R${log.round}] ${log.text}</div>`;
    }).join('');

    return `
      <div class="sao-skirmish-layout">
        <!-- Top Arena Status Banner -->
        <div class="skirmish-arena-header">
          <div class="sah-left">
            <span class="sao-badge">BATTLEFIELD</span>
            <h4>CLASH AT ${battle.territoryName.toUpperCase()}</h4>
          </div>
          <div class="sah-center">
            <span class="round-counter">ROUND ${battle.round}</span>
            <span class="stance-badge">STANCE: ${battle.playerStance}</span>
          </div>
          <div class="sah-right">
            ${battle.isFinished
              ? `<span class="outcome-badge ${battle.winner === 'PLAYER' ? 'victory' : 'defeat'}">${battle.winner === 'PLAYER' ? '👑 VICTORY ACHIEVED' : '💀 FORCES CRUSHED'}</span>`
              : `<span class="outcome-badge active">⚔️ CLASH IN PROGRESS</span>`}
          </div>
        </div>

        <!-- Dual Battalion Clash Cards -->
        <div class="skirmish-combatants-row">
          <!-- Player Battalion -->
          <div class="combatant-box player-box">
            <div class="cb-header">
              <span class="cb-avatar">👑</span>
              <div>
                <div class="cb-title">${b.name}</div>
                <div class="cb-sub">Royal Commander Force</div>
              </div>
            </div>
            <div class="cb-bars">
              <div class="bar-label">
                <span>HEALTH</span>
                <span>${b.totalHp} / ${b.maxHp} (${playerHpPercent}%)</span>
              </div>
              <div class="meter-bar-bg">
                <div class="meter-bar-fill cyan-fill" style="width: ${playerHpPercent}%"></div>
              </div>

              <div class="bar-label" style="margin-top: 6px;">
                <span>BATTALION MORALE</span>
                <span>${b.morale}%</span>
              </div>
              <div class="meter-bar-bg">
                <div class="meter-bar-fill gold-fill" style="width: ${b.morale}%"></div>
              </div>
            </div>
            <div class="cb-stats-row">
              <span>⚔️ ${b.attackPower} ATK</span>
              <span>🛡️ ${b.defensePower} DEF</span>
            </div>
          </div>

          <div class="clash-vs-symbol">VS</div>

          <!-- Enemy Force -->
          <div class="combatant-box enemy-box ${ef.isBoss ? 'boss-glow' : ''}">
            <div class="cb-header">
              <span class="cb-avatar">${ef.isBoss ? '🔥' : '😈'}</span>
              <div>
                <div class="cb-title">${ef.name}</div>
                <div class="cb-sub">${ef.commander}</div>
              </div>
            </div>
            <div class="cb-bars">
              <div class="bar-label">
                <span>HEALTH</span>
                <span>${ef.totalHp} / ${ef.maxHp} (${enemyHpPercent}%)</span>
              </div>
              <div class="meter-bar-bg">
                <div class="meter-bar-fill red-fill" style="width: ${enemyHpPercent}%"></div>
              </div>
            </div>
            <div class="cb-stats-row">
              <span>⚔️ ${ef.attackPower} ATK</span>
              <span>🛡️ ${ef.defensePower} DEF</span>
              <span style="font-size: 10px; color: #94a3b8">${ef.unitsSummary}</span>
            </div>
          </div>
        </div>

        <!-- Tactical Commands Row -->
        <div class="skirmish-controls-panel">
          ${!battle.isFinished ? `
            <div class="stance-btn-group">
              <button class="sao-stance-btn ${battle.playerStance === 'BALANCED' ? 'active' : ''}" data-stance="BALANCED">⚖️ BALANCED</button>
              <button class="sao-stance-btn ${battle.playerStance === 'SHIELD_WALL' ? 'active' : ''}" data-stance="SHIELD_WALL">🛡️ SHIELD WALL (+50% DEF)</button>
              <button class="sao-stance-btn ${battle.playerStance === 'CHARGE' ? 'active' : ''}" data-stance="CHARGE">⚡ CAVALRY CHARGE (+45% ATK)</button>
              <button class="sao-stance-btn ${battle.playerStance === 'ARCANE_BARRAGE' ? 'active' : ''}" data-stance="ARCANE_BARRAGE">🔮 ARCANE BARRAGE</button>
            </div>

            <div class="skirmish-action-btns">
              <button class="sao-action-btn glow-gold" id="btn-next-round">⚔️ STRIKE NEXT ROUND</button>
              <button class="sao-action-btn glow-cyan" id="btn-royal-rally" ${gameState.resources.gold < 30 ? 'disabled' : ''}>🎺 ROYAL RALLY (30G)</button>
              <button class="sao-action-btn" id="btn-auto-resolve">⏩ AUTO-RESOLVE BATTLE</button>
            </div>
          ` : `
            <div class="skirmish-finished-row">
              <button class="sao-action-btn glow-cyan" id="btn-dismiss-battle">✓ RETURN TO WORLD MAP</button>
            </div>
          `}
        </div>

        <!-- Live Combat Ticker Log -->
        <div class="skirmish-log-container">
          <div class="log-title">LIVE COMBAT SIMULATOR CHRONICLE</div>
          <div class="log-scroll-area">
            ${combatLogsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private bindSkirmishTabEvents() {
    document.getElementById('btn-goto-map')?.addEventListener('click', () => {
      this.switchTab('map');
    });

    // Stance selection
    this.container.querySelectorAll('.sao-stance-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stance = (e.currentTarget as HTMLElement).getAttribute('data-stance') as any;
        if (stance && warEngine.activeBattle) {
          if (stance === 'ARCANE_BARRAGE') {
            sounds.playSpellCast();
          } else {
            sounds.playBattleClash();
          }
          warEngine.activeBattle.playerStance = stance;
          this.updateContent();
        }
      });
    });

    // Strike next round
    document.getElementById('btn-next-round')?.addEventListener('click', () => {
      if (warEngine.activeBattle?.playerStance === 'ARCANE_BARRAGE') {
        sounds.playSpellCast();
      } else {
        sounds.playBattleClash();
      }
      warEngine.stepBattleRound();
      this.updateContent();
    });

    // Royal Rally
    document.getElementById('btn-royal-rally')?.addEventListener('click', () => {
      warEngine.royalRally();
      this.updateContent();
    });

    // Auto-resolve
    document.getElementById('btn-auto-resolve')?.addEventListener('click', () => {
      warEngine.autoResolveBattle();
      this.updateContent();
    });

    // Dismiss battle
    document.getElementById('btn-dismiss-battle')?.addEventListener('click', () => {
      warEngine.activeBattle = null;
      this.switchTab('map');
    });
  }
}

export const warRoomUI = WarRoomUI.getInstance();
