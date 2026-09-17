import { gameState } from '../state/GameState';
import { SHOP_ITEMS } from '../data/shopItems';
import { GameMode } from '../types';
import { sounds } from '../audio/SoundEffects';
import { CityShowcase3D } from '../showcase/CityShowcase3D';
import { warRoomUI, WarRoomTab } from './WarRoomUI';

export class SaoHoloUI {
  private container: HTMLElement;
  private showcase3D: CityShowcase3D | null = null;
  private isStoreOpen: boolean = false;
  private isShowcaseOpen: boolean = false;
  private isSnapshotOpen: boolean = false;
  private currentSnapshotUrl: string = '';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'sao-holo-root';
    document.body.appendChild(this.container);

    this.hookWarRoom();
    this.render();
    gameState.subscribe(() => this.updateHUD());
  }

  public isAnyModalOpen(): boolean {
    return this.isStoreOpen || this.isShowcaseOpen || this.isSnapshotOpen || warRoomUI.isOpened;
  }

  private hookWarRoom() {
    const origOpen = warRoomUI.open.bind(warRoomUI);
    warRoomUI.open = (defaultTab?: WarRoomTab) => {
      const kb = window.phaserGameInstance?.input?.keyboard;
      if (kb) kb.enabled = false;
      origOpen(defaultTab);
    };

    const origClose = warRoomUI.close.bind(warRoomUI);
    warRoomUI.close = () => {
      origClose();
      if (!this.isAnyModalOpen()) {
        const kb = window.phaserGameInstance?.input?.keyboard;
        if (kb) kb.enabled = true;
      }
    };
  }

  private render() {
    this.container.innerHTML = `
      <!-- SAO Floating Hexagonal Quick Navigation -->
      <nav class="sao-nav" aria-label="SAO Quick Navigation">
        <button class="sao-hex-btn" id="sao-btn-town" title="Surface Town">
          <span class="hex-icon">🏛️</span>
          <span class="hex-label">TOWN</span>
        </button>
        <button class="sao-hex-btn" id="sao-btn-cavern" title="Cavern Mine">
          <span class="hex-icon">⛏️</span>
          <span class="hex-label">MINE</span>
        </button>
        <button class="sao-hex-btn glow-cyan" id="sao-btn-store" title="City Stores">
          <span class="hex-icon">🛍️</span>
          <span class="hex-label">STORES</span>
        </button>
        <button class="sao-hex-btn glow-gold" id="sao-btn-war" title="War Room & World Conquest">
          <span class="hex-icon">⚔️</span>
          <span class="hex-label">WAR</span>
        </button>
        <button class="sao-hex-btn glow-gold" id="sao-btn-showcase" title="3D City Brag Showcase">
          <span class="hex-icon">👑</span>
          <span class="hex-label">3D BRAG</span>
        </button>
        <button class="sao-hex-btn glow-cyan" id="sao-btn-demo" title="Replay Opening Prologue & Theme Demo">
          <span class="hex-icon">🎬</span>
          <span class="hex-label">PROLOGUE</span>
        </button>
        <button class="sao-hex-btn" id="sao-btn-rest" title="Pass Day">
          <span class="hex-icon">💤</span>
          <span class="hex-label">REST</span>
        </button>
        <button class="sao-hex-btn" id="sao-btn-audio" title="Toggle Sound (Mute / Unmute)">
          <span class="hex-icon" id="sao-audio-icon">${sounds.isMuted ? '🔇' : '🔊'}</span>
          <span class="hex-label" id="sao-audio-label">${sounds.isMuted ? 'MUTED' : 'AUDIO'}</span>
        </button>
      </nav>

      <!-- SAO Holographic Stores Modal -->
      <div class="sao-modal-backdrop" id="sao-store-modal" style="display: none;">
        <div class="sao-glass-panel">
          <div class="sao-panel-header">
            <div class="sao-title-group">
              <span class="sao-badge">CITY SHOPS</span>
              <h2>APOTHECARY & BLACKSMITH</h2>
            </div>
            <button class="sao-close-btn" id="sao-store-close">✕</button>
          </div>

          <div class="sao-panel-sub">
            💡 <strong>Science & Engineering:</strong> Purchase alkaline reagents to neutralize acid, hydraulic jacks to hold ceilings, and bio-nutrients for roots!
          </div>

          <div class="sao-cards-grid" id="sao-shop-items-container">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>

      <!-- SAO 3D City & Castle Brag Showcase Overlay -->
      <div class="sao-showcase-overlay" id="sao-showcase-modal" style="display: none;">
        <div id="threejs-canvas-host"></div>
        <button class="sao-showcase-exit-btn" id="sao-showcase-exit-btn" title="Exit 3D Showcase (Esc)">✕ EXIT 3D SHOWCASE</button>

        <!-- Floating SAO Brag Card Overlay -->
        <div class="sao-brag-card">
          <div class="brag-header">
            <span class="brag-avatar">👑</span>
            <div>
              <div class="brag-player-title">ARCHITECT OF STRATA</div>
              <div class="brag-rank-badge" id="brag-rank-display">RANK: SSS - AETHER CITADEL</div>
            </div>
          </div>

          <div class="brag-metrics-grid">
            <div class="brag-metric-box">
              <span class="bm-label">👥 POPULATION</span>
              <span class="bm-val" id="brag-pop-val">--</span>
            </div>
            <div class="brag-metric-box">
              <span class="bm-label">🏰 PRESTIGE</span>
              <span class="bm-val" id="brag-prestige-val">--</span>
            </div>
            <div class="brag-metric-box">
              <span class="bm-label">🧪 DISASTERS SOLVED</span>
              <span class="bm-val" id="brag-solved-val">--</span>
            </div>
            <div class="brag-metric-box">
              <span class="bm-label">⚖️ STABILITY</span>
              <span class="bm-val" id="brag-stability-val">--</span>
            </div>
          </div>

          <div class="brag-actions">
            <button class="sao-action-btn" id="brag-toggle-orbit">🔄 AUTO-ORBIT: ON</button>
            <button class="sao-action-btn glow-gold" id="brag-capture-btn">📸 CAPTURE BRAG CARD</button>
            <button class="sao-action-btn" id="brag-close-btn">✕ RETURN TO GAME</button>
          </div>
        </div>
      </div>

      <!-- SAO Snapshot Preview Modal -->
      <div class="sao-modal-backdrop sao-snapshot-modal" id="sao-snapshot-modal" style="display: none;">
        <div class="sao-glass-panel sao-snapshot-panel">
          <div class="sao-panel-header">
            <div class="sao-title-group">
              <span class="sao-badge" style="border-color: var(--sao-gold); color: var(--sao-gold); background: rgba(245, 158, 11, 0.15);">👑 SAO SNAPSHOT</span>
              <h2>KINGDOM BRAG CARD PREVIEW</h2>
            </div>
            <button class="sao-close-btn" id="sao-snapshot-close" title="Close Preview">✕</button>
          </div>

          <div class="sao-snapshot-body">
            <div class="sao-snapshot-img-wrap">
              <img id="sao-snapshot-img" src="" alt="Kingdom Snapshot Preview" />
            </div>
          </div>

          <div class="sao-snapshot-actions">
            <button class="sao-action-btn glow-gold" id="sao-snapshot-download">
              💾 DOWNLOAD PNG
            </button>
            <button class="sao-action-btn glow-cyan" id="sao-snapshot-copy">
              📋 COPY TO CLIPBOARD
            </button>
            <button class="sao-action-btn sao-btn-return" id="sao-snapshot-return">
              ✕ CLOSE / RETURN
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderStoreItems();
  }

  private bindEvents() {
    // Nav buttons
    document.getElementById('sao-btn-town')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeStore();
      this.closeShowcase();
      if (warRoomUI.isOpened) warRoomUI.close();
      const phaserGame = (window as unknown as { phaserGameInstance?: Phaser.Game }).phaserGameInstance;
      if (phaserGame) {
        phaserGame.scene.sleep('CavernScene');
        phaserGame.scene.wake('SurfaceScene');
        gameState.currentMode = GameMode.SURFACE;
      }
    });

    document.getElementById('sao-btn-cavern')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeStore();
      this.closeShowcase();
      if (warRoomUI.isOpened) warRoomUI.close();
      const phaserGame = (window as unknown as { phaserGameInstance?: Phaser.Game }).phaserGameInstance;
      if (phaserGame) {
        const surface = phaserGame.scene.getScene('SurfaceScene') as unknown as { transitionToCavern: () => void };
        if (surface) surface.transitionToCavern();
      }
    });

    document.getElementById('sao-btn-store')?.addEventListener('click', () => {
      sounds.playSaoOpen();
      this.openStore();
    });

    document.getElementById('sao-btn-war')?.addEventListener('click', () => {
      sounds.playSaoOpen();
      this.closeStore();
      this.closeShowcase();
      warRoomUI.open();
    });

    document.getElementById('sao-btn-showcase')?.addEventListener('click', () => {
      sounds.playSaoOpen();
      this.openShowcase();
    });

    document.getElementById('sao-btn-demo')?.addEventListener('click', () => {
      sounds.playSaoOpen();
      this.closeStore();
      this.closeShowcase();
      if (warRoomUI.isOpened) warRoomUI.close();
      this.hideNav();

      const phaserGame = (window as unknown as { phaserGameInstance?: Phaser.Game }).phaserGameInstance;
      if (phaserGame) {
        phaserGame.scene.stop('SurfaceScene');
        phaserGame.scene.stop('CavernScene');
        phaserGame.scene.stop('UIScene');
        phaserGame.scene.start('OpeningDemoScene');
      }
    });

    document.getElementById('sao-btn-rest')?.addEventListener('click', () => {
      sounds.playSaoConfirm();
      gameState.endDayCycle();
    });

    // Audio Mute/Unmute Toggle
    document.getElementById('sao-btn-audio')?.addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      const icon = document.getElementById('sao-audio-icon');
      const label = document.getElementById('sao-audio-label');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
      if (label) label.textContent = isMuted ? 'MUTED' : 'AUDIO';
      if (!isMuted) {
        sounds.playHexClick();
      }
    });

    // Subtle Hex Hover Sounds on all navigation buttons
    this.container.querySelectorAll('.sao-hex-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        sounds.playHexHover();
      });
    });

    // Store Modal Light Dismiss & Close
    document.getElementById('sao-store-close')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeStore();
    });

    document.getElementById('sao-store-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        sounds.playSaoSelect();
        this.closeStore();
      }
    });

    // 3D Showcase Exit & Controls
    document.getElementById('sao-showcase-exit-btn')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeShowcase();
    });

    document.getElementById('brag-close-btn')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeShowcase();
    });

    document.getElementById('brag-toggle-orbit')?.addEventListener('click', () => {
      if (this.showcase3D) {
        this.showcase3D.toggleAutoRotate();
      }
    });

    // Prevent drag on brag card from starting 3D orbit
    document.querySelector('.sao-brag-card')?.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Capture Brag Card Snapshot
    document.getElementById('brag-capture-btn')?.addEventListener('click', () => {
      if (this.showcase3D) {
        const imgData = this.showcase3D.captureSnapshot();
        this.openSnapshotModal(imgData);
      }
    });

    // Snapshot Modal Light Dismiss & Actions
    document.getElementById('sao-snapshot-close')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeSnapshotModal();
    });

    document.getElementById('sao-snapshot-return')?.addEventListener('click', () => {
      sounds.playSaoSelect();
      this.closeSnapshotModal();
    });

    document.getElementById('sao-snapshot-download')?.addEventListener('click', () => {
      this.downloadSnapshot();
    });

    document.getElementById('sao-snapshot-copy')?.addEventListener('click', () => {
      this.copySnapshotToClipboard();
    });

    document.getElementById('sao-snapshot-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        sounds.playSaoSelect();
        this.closeSnapshotModal();
      }
    });

    // Global Escape Key Listener
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        let handled = false;
        if (this.isSnapshotOpen) {
          this.closeSnapshotModal();
          handled = true;
        }
        if (this.isShowcaseOpen) {
          this.closeShowcase();
          handled = true;
        }
        if (this.isStoreOpen) {
          this.closeStore();
          handled = true;
        }
        if (warRoomUI.isOpened) {
          warRoomUI.close();
          handled = true;
        }
        if (handled) {
          sounds.playSaoSelect();
        }
      }
    });
  }

  public openSnapshotModal(imgDataUrl: string) {
    this.isSnapshotOpen = true;
    this.currentSnapshotUrl = imgDataUrl;
    const kb = window.phaserGameInstance?.input?.keyboard;
    if (kb) kb.enabled = false;
    const modal = document.getElementById('sao-snapshot-modal');
    const img = document.getElementById('sao-snapshot-img') as HTMLImageElement;
    if (img) img.src = imgDataUrl;
    if (modal) modal.style.display = 'flex';
    sounds.playModalWhoosh();
  }

  public closeSnapshotModal() {
    this.isSnapshotOpen = false;
    this.currentSnapshotUrl = '';
    const modal = document.getElementById('sao-snapshot-modal');
    if (modal) modal.style.display = 'none';
    sounds.playModalWhoosh();
    if (!this.isAnyModalOpen()) {
      const kb = window.phaserGameInstance?.input?.keyboard;
      if (kb) kb.enabled = true;
    }
  }

  private downloadSnapshot() {
    if (!this.currentSnapshotUrl) return;
    sounds.playSaoConfirm();
    const link = document.createElement('a');
    link.download = 'kingdom-brag-card.png';
    link.href = this.currentSnapshotUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async copySnapshotToClipboard() {
    if (!this.currentSnapshotUrl) return;
    const copyBtn = document.getElementById('sao-snapshot-copy');
    try {
      const res = await fetch(this.currentSnapshotUrl);
      const blob = await res.blob();
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        sounds.playSaoConfirm();
        if (copyBtn) {
          const originalText = copyBtn.innerText;
          copyBtn.innerText = '✅ COPIED TO CLIPBOARD!';
          copyBtn.classList.add('glow-green');
          setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.classList.remove('glow-green');
          }, 2500);
        }
      } else {
        throw new Error('ClipboardItem not supported');
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
      if (copyBtn) {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = '⚠️ USE DOWNLOAD PNG';
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2500);
      }
    }
  }

  private renderStoreItems() {
    const grid = document.getElementById('sao-shop-items-container');
    if (!grid) return;

    grid.innerHTML = SHOP_ITEMS.map(item => {
      const canAfford = gameState.canAfford({ gold: item.costGold, ...item.costMaterials });
      const matCosts: string[] = [];
      if (item.costMaterials?.iron) matCosts.push(`⚙️ ${item.costMaterials.iron} Fe`);
      if (item.costMaterials?.stone) matCosts.push(`🪨 ${item.costMaterials.stone} St`);
      if (item.costMaterials?.lumens) matCosts.push(`✨ ${item.costMaterials.lumens} Lu`);
      if (item.costMaterials?.mana) matCosts.push(`🔮 ${item.costMaterials.mana} Mana`);
      if (item.costMaterials?.food) matCosts.push(`🌾 ${item.costMaterials.food} Food`);
      if (item.costMaterials?.troops) matCosts.push(`⚔️ ${item.costMaterials.troops} Trp`);
      if (item.costMaterials?.demonShards) matCosts.push(`💜 ${item.costMaterials.demonShards} Shard`);
      const costStr = [`💰 ${item.costGold}G`, ...matCosts].join(' | ');

      return `
        <div class="sao-item-card ${canAfford ? 'affordable' : 'unaffordable'}">
          <div class="sao-card-top">
            <span class="sao-item-icon">${item.icon}</span>
            <div class="sao-card-meta">
              <div class="sao-item-title">${item.name}</div>
              <div class="sao-item-tagline">${item.tagline}</div>
            </div>
            <div class="sao-item-price">${costStr}</div>
          </div>

          <div class="sao-logic-badge">
            <strong>🧪 LOGIC:</strong> ${item.scientificLogic}
          </div>

          <div class="sao-item-desc">${item.description}</div>

          <button class="sao-buy-btn ${canAfford ? 'glow-cyan' : ''}" data-item-id="${item.id}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? 'PURCHASE & DEPLOY' : 'LACK RESOURCES'}
          </button>
        </div>
      `;
    }).join('');

    // Bind buy click handlers
    grid.querySelectorAll('.sao-buy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-item-id');
        if (id) {
          gameState.buyShopItem(id);
          this.renderStoreItems();
          this.updateHUD();
        }
      });
    });
  }

  public openStore() {
    if (this.isShowcaseOpen) this.closeShowcase();
    this.isStoreOpen = true;
    const kb = window.phaserGameInstance?.input?.keyboard;
    if (kb) kb.enabled = false;
    const modal = document.getElementById('sao-store-modal');
    if (modal) modal.style.display = 'flex';
    sounds.playModalWhoosh();
    this.renderStoreItems();
  }

  public closeStore() {
    this.isStoreOpen = false;
    const modal = document.getElementById('sao-store-modal');
    if (modal) modal.style.display = 'none';
    sounds.playModalWhoosh();
    if (!this.isAnyModalOpen()) {
      const kb = window.phaserGameInstance?.input?.keyboard;
      if (kb) kb.enabled = true;
    }
  }

  public openShowcase() {
    if (this.isStoreOpen) this.closeStore();
    this.isShowcaseOpen = true;
    const kb = window.phaserGameInstance?.input?.keyboard;
    if (kb) kb.enabled = false;
    const modal = document.getElementById('sao-showcase-modal');
    if (modal) modal.style.display = 'flex';
    sounds.playModalWhoosh();

    const host = document.getElementById('threejs-canvas-host');
    if (host && !this.showcase3D) {
      this.showcase3D = new CityShowcase3D(host);
      this.showcase3D.onAutoRotateChange = (rotating) => {
        const btn = document.getElementById('brag-toggle-orbit');
        if (btn) btn.innerText = rotating ? '🔄 AUTO-ORBIT: ON' : '🔄 AUTO-ORBIT: OFF';
      };
      this.showcase3D.init();
    } else if (this.showcase3D) {
      this.showcase3D.resetCamera();
      this.showcase3D.rebuildCityMeshes();
      this.showcase3D.handleResize();
      this.showcase3D.resume();
    }

    const orbitBtn = document.getElementById('brag-toggle-orbit');
    if (orbitBtn) orbitBtn.innerText = '🔄 AUTO-ORBIT: ON';

    this.updateBragStats();
  }

  public closeShowcase() {
    this.isShowcaseOpen = false;
    if (this.isSnapshotOpen) {
      this.closeSnapshotModal();
    }
    const modal = document.getElementById('sao-showcase-modal');
    if (modal) modal.style.display = 'none';
    sounds.playModalWhoosh();

    if (this.showcase3D) {
      this.showcase3D.resetCamera();
      this.showcase3D.pause();
    }
    if (!this.isAnyModalOpen()) {
      const kb = window.phaserGameInstance?.input?.keyboard;
      if (kb) kb.enabled = true;
    }
  }

  private updateBragStats() {
    const rank = gameState.getCityRank();
    const rankElem = document.getElementById('brag-rank-display');
    if (rankElem) {
      rankElem.innerText = `RANK: ${rank.tier} - ${rank.title}`;
      rankElem.style.borderColor = rank.color;
      rankElem.style.color = rank.color;
    }

    const popElem = document.getElementById('brag-pop-val');
    if (popElem) popElem.innerText = `${gameState.resources.population} / ${gameState.resources.maxPopulation}`;

    const presElem = document.getElementById('brag-prestige-val');
    if (presElem) presElem.innerText = `${gameState.cityPrestige} PTS`;

    const solvedElem = document.getElementById('brag-solved-val');
    if (solvedElem) solvedElem.innerText = `${gameState.solvedDisastersCount} CRISES`;

    const stabElem = document.getElementById('brag-stability-val');
    if (stabElem) {
      const avgStability = Math.round((gameState.metrics.rootIntegrity + (100 - gameState.metrics.tectonicWeight) + (100 - gameState.metrics.toxicityLevel)) / 3);
      stabElem.innerText = `${avgStability}%`;
    }
  }

  private updateHUD() {
    if (this.isStoreOpen) {
      this.renderStoreItems();
    }
    if (this.isShowcaseOpen) {
      this.updateBragStats();
      if (this.showcase3D) this.showcase3D.rebuildCityMeshes();
    }
  }

  public hideNav() {
    const nav = this.container.querySelector('.sao-nav') as HTMLElement;
    if (nav) nav.style.display = 'none';
  }

  public showNav() {
    const nav = this.container.querySelector('.sao-nav') as HTMLElement;
    if (nav) nav.style.display = 'flex';
  }
}
