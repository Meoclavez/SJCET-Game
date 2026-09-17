/**
 * OVERBURDEN: TALES FROM THE UNDER-TOWN
 * Comprehensive Procedural & Synthesized Web Audio Engine
 * Zero external asset dependencies, zero-latency playback, authentic anime/retro feel.
 */

export class SoundController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public isMuted: boolean = false;
  public masterVolume: number = 0.5;
  private isUnlocked: boolean = false;

  constructor() {
    // Restore persistent audio preferences
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedMuted = localStorage.getItem('sjcet_game_muted');
        if (storedMuted !== null) {
          this.isMuted = storedMuted === 'true';
        }
        const storedVol = localStorage.getItem('sjcet_game_volume');
        if (storedVol !== null) {
          const parsed = parseFloat(storedVol);
          if (!isNaN(parsed)) {
            this.masterVolume = Math.max(0, Math.min(1, parsed));
          }
        }
      }
    } catch {
      // Ignore storage errors in restricted iframe environments
    }

    // Smooth zero-friction AudioContext unlocking on first user interaction
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.resumeContext();
        if (this.ctx && this.ctx.state === 'running') {
          this.isUnlocked = true;
          window.removeEventListener('pointerdown', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        }
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  /**
   * Resumes and unlocks the Web Audio Context if suspended.
   */
  public resumeContext(): void {
    const ctx = this.initCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateMasterGain();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOut(): { ctx: AudioContext; out: AudioNode } | null {
    if (this.isMuted) return null;
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain) return null;
    return { ctx, out: this.masterGain };
  }

  private updateMasterGain(): void {
    if (this.masterGain && this.ctx) {
      const effectiveVol = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(effectiveVol, this.ctx.currentTime);
    }
  }

  /**
   * Toggles mute state and saves preference to localStorage.
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sjcet_game_muted', String(this.isMuted));
      }
    } catch {}
    this.updateMasterGain();
    return this.isMuted;
  }

  /**
   * Sets the master volume (0.0 to 1.0) and saves preference to localStorage.
   */
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('sjcet_game_volume', String(this.masterVolume));
      }
    } catch {}
    this.updateMasterGain();
  }

  /**
   * Helper to generate a procedural white-noise audio buffer.
   */
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ==========================================
  // 1. OPENING & FANFARE
  // ==========================================

  /**
   * Cyber anime frequency sweep + layered resonant synth chord (SAO "Link Start" audio cue).
   */
  public playLinkStart(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // 1. Frequency sweep (Cyber sci-fi dive)
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();

    sweepOsc.type = 'sawtooth';
    sweepFilter.type = 'bandpass';
    sweepFilter.Q.setValueAtTime(6, t);
    sweepFilter.frequency.setValueAtTime(200, t);
    sweepFilter.frequency.exponentialRampToValueAtTime(3200, t + 0.24);

    sweepOsc.frequency.setValueAtTime(140, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(2400, t + 0.24);

    sweepGain.gain.setValueAtTime(0.01, t);
    sweepGain.gain.linearRampToValueAtTime(0.2, t + 0.12);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    sweepOsc.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(out);

    sweepOsc.start(t);
    sweepOsc.stop(t + 0.28);

    // 2. Layered resonant synth chord (D Major 9th Shimmer)
    const chordNotes = [293.66, 440.00, 587.33, 739.99, 1174.66, 1760.00];
    const chordTime = t + 0.16;

    chordNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (idx % 2 === 0 ? -1.5 : 1.5), chordTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, chordTime);
      filter.frequency.exponentialRampToValueAtTime(800, chordTime + 0.8);

      gain.gain.setValueAtTime(0.001, chordTime);
      gain.gain.linearRampToValueAtTime(0.12, chordTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      osc.start(chordTime);
      osc.stop(chordTime + 0.85);
    });

    // 3. Sub-bass swell
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(73.42, chordTime); // D2
    subGain.gain.setValueAtTime(0.18, chordTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.7);

    subOsc.connect(subGain);
    subGain.connect(out);
    subOsc.start(chordTime);
    subOsc.stop(chordTime + 0.7);
  }

  /**
   * Multi-oscillator triumphant brass chord progression for coronations and victories.
   */
  public playRoyalFanfare(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Grand 4-part brass progression: [Fmaj -> Gmaj -> Amaj -> Dmaj Grand Resolution]
    const chords = [
      { notes: [349.23, 440.00, 523.25], start: 0, dur: 0.22 },       // F4, A4, C5
      { notes: [392.00, 493.88, 587.33], start: 0.22, dur: 0.22 },    // G4, B4, D5
      { notes: [440.00, 554.37, 659.25], start: 0.44, dur: 0.28 },    // A4, C#5, E5
      { notes: [293.66, 369.99, 440.00, 587.33, 739.99], start: 0.72, dur: 1.1 } // D4, F#4, A4, D5, F#5
    ];

    chords.forEach(c => {
      const stepTime = t + c.start;
      c.notes.forEach(noteFreq => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const brassFilter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(noteFreq, stepTime);
        osc2.frequency.setValueAtTime(noteFreq * 1.003, stepTime);

        brassFilter.type = 'lowpass';
        brassFilter.frequency.setValueAtTime(900, stepTime);
        brassFilter.frequency.exponentialRampToValueAtTime(3200, stepTime + 0.06);
        brassFilter.frequency.exponentialRampToValueAtTime(1400, stepTime + c.dur);

        const targetVol = c.dur > 0.5 ? 0.16 : 0.12;
        gain.gain.setValueAtTime(0.001, stepTime);
        gain.gain.linearRampToValueAtTime(targetVol, stepTime + 0.03);
        gain.gain.setValueAtTime(targetVol * 0.9, stepTime + c.dur * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + c.dur);

        osc1.connect(brassFilter);
        osc2.connect(brassFilter);
        brassFilter.connect(gain);
        gain.connect(out);

        osc1.start(stepTime);
        osc1.stop(stepTime + c.dur);
        osc2.start(stepTime);
        osc2.stop(stepTime + c.dur);
      });
    });
  }

  // ==========================================
  // 2. MINING & SUBTERRANEAN
  // ==========================================

  /**
   * Realistic metallic strike with tailored pitch based on ore material:
   * - Coal: dull heavy crunch
   * - Iron: crisp ringing metal clink
   * - Lumens: high-frequency crystal bell chime
   * - Aether Core: ethereal cosmic pulse
   */
  public playPickaxeClink(oreType?: string): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;
    const ore = (oreType || 'iron').toLowerCase();

    if (ore.includes('coal')) {
      // Coal: Dull heavy crunch with rapid earthy crumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t);
      osc.stop(t + 0.12);

      // Crumble noise burst
      const noiseBuffer = this.createNoiseBuffer(0.1);
      if (noiseBuffer) {
        const noise = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        noise.buffer = noiseBuffer;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, t);
        filter.Q.setValueAtTime(1.5, t);

        noiseGain.gain.setValueAtTime(0.2, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(out);
        noise.start(t);
        noise.stop(t + 0.1);
      }
    } else if (ore.includes('lumen') || ore.includes('quartz')) {
      // Lumens: High-frequency crystal bell chime
      const freqs = [2093.00, 3135.96, 4186.01]; // C7, G7, C8
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        const vol = idx === 0 ? 0.18 : 0.1;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        osc.connect(gain);
        gain.connect(out);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    } else if (ore.includes('aether')) {
      // Aether Core: Ethereal cosmic pulse
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      carrier.type = 'sine';
      modulator.type = 'sine';

      carrier.frequency.setValueAtTime(220, t);
      carrier.frequency.exponentialRampToValueAtTime(440, t + 0.3);

      modulator.frequency.setValueAtTime(32, t);
      modGain.gain.setValueAtTime(120, t);

      modulator.connect(carrier.frequency);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      carrier.connect(gain);
      gain.connect(out);

      carrier.start(t);
      modulator.start(t);
      carrier.stop(t + 0.6);
      modulator.stop(t + 0.6);

      // High sparkle overtone
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.type = 'triangle';
      sparkle.frequency.setValueAtTime(1760, t);
      sparkle.frequency.exponentialRampToValueAtTime(2637, t + 0.4);
      sparkleGain.gain.setValueAtTime(0.12, t);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      sparkle.connect(sparkleGain);
      sparkleGain.connect(out);
      sparkle.start(t);
      sparkle.stop(t + 0.6);
    } else {
      // Iron / Stone / Default: Crisp ringing metal clink
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(1680 + (Math.random() * 80 - 40), t);
      osc1.frequency.exponentialRampToValueAtTime(320, t + 0.08);

      osc2.frequency.setValueAtTime(3360, t);
      osc2.frequency.exponentialRampToValueAtTime(980, t + 0.18);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(out);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.22);
      osc2.stop(t + 0.22);
    }
  }

  /**
   * Multi-tone fracturing crunch when stone platforms crumble or fractures spread.
   */
  public playRockCrack(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Dual descending fracture tones
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(380, t);
    osc1.frequency.exponentialRampToValueAtTime(75, t + 0.25);

    osc2.frequency.setValueAtTime(220, t);
    osc2.frequency.exponentialRampToValueAtTime(45, t + 0.3);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);

    // Staccato crackle noise
    const noiseBuffer = this.createNoiseBuffer(0.22);
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const nGain = ctx.createGain();

      noise.buffer = noiseBuffer;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, t);

      nGain.gain.setValueAtTime(0.18, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(out);
      noise.start(t);
      noise.stop(t + 0.22);
    }
  }

  /**
   * Low-frequency mechanical gear whirring pulse for the mine elevator.
   */
  public playElevatorDrone(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Mechanical gear rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.3);
    osc.frequency.linearRampToValueAtTime(55, t + 0.65);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);

    // Modulated whirr (pulsing gear teeth)
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.65);

    // Cable tension sine
    const cable = ctx.createOscillator();
    const cableGain = ctx.createGain();
    cable.type = 'sine';
    cable.frequency.setValueAtTime(220, t);
    cable.frequency.exponentialRampToValueAtTime(440, t + 0.4);

    cableGain.gain.setValueAtTime(0.1, t);
    cableGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    cable.connect(cableGain);
    cableGain.connect(out);
    cable.start(t);
    cable.stop(t + 0.5);
  }

  /**
   * Pulsing cyber-alert siren for toxic leaks or seismic destabilization.
   */
  public playHazardAlarm(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // 3 sharp alternating emergency pulses
    for (let i = 0; i < 3; i++) {
      const pTime = t + i * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, pTime);
      osc.frequency.exponentialRampToValueAtTime(620, pTime + 0.12);

      gain.gain.setValueAtTime(0.18, pTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pTime + 0.14);

      osc.connect(gain);
      gain.connect(out);

      osc.start(pTime);
      osc.stop(pTime + 0.14);
    }
  }

  // ==========================================
  // 3. SURFACE & CONSTRUCTION
  // ==========================================

  /**
   * Rhythmic wooden hammer taps followed by a solid stone masonry thud.
   */
  public playBuildPlace(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Tap 1 (wood tap)
    const tap1 = ctx.createOscillator();
    const tap1Gain = ctx.createGain();
    tap1.type = 'triangle';
    tap1.frequency.setValueAtTime(520, t);
    tap1.frequency.exponentialRampToValueAtTime(280, t + 0.04);
    tap1Gain.gain.setValueAtTime(0.16, t);
    tap1Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    tap1.connect(tap1Gain);
    tap1Gain.connect(out);
    tap1.start(t);
    tap1.stop(t + 0.045);

    // Tap 2 (wood tap)
    const tap2 = ctx.createOscillator();
    const tap2Gain = ctx.createGain();
    tap2.type = 'triangle';
    tap2.frequency.setValueAtTime(640, t + 0.08);
    tap2.frequency.exponentialRampToValueAtTime(320, t + 0.12);
    tap2Gain.gain.setValueAtTime(0.16, t + 0.08);
    tap2Gain.gain.exponentialRampToValueAtTime(0.001, t + 0.125);
    tap2.connect(tap2Gain);
    tap2Gain.connect(out);
    tap2.start(t + 0.08);
    tap2.stop(t + 0.125);

    // Solid Stone Masonry Thud at t + 0.16
    const thudTime = t + 0.16;
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(140, thudTime);
    thud.frequency.exponentialRampToValueAtTime(38, thudTime + 0.22);
    thudGain.gain.setValueAtTime(0.26, thudTime);
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.28);
    thud.connect(thudGain);
    thudGain.connect(out);
    thud.start(thudTime);
    thud.stop(thudTime + 0.28);

    // Low masonry gravel click
    const nBuf = this.createNoiseBuffer(0.15);
    if (nBuf) {
      const nSrc = ctx.createBufferSource();
      const nFilter = ctx.createBiquadFilter();
      const nG = ctx.createGain();
      nSrc.buffer = nBuf;
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(450, thudTime);
      nG.gain.setValueAtTime(0.2, thudTime);
      nG.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.15);
      nSrc.connect(nFilter);
      nFilter.connect(nG);
      nG.connect(out);
      nSrc.start(thudTime);
      nSrc.stop(thudTime + 0.15);
    }
  }

  /**
   * Debris collapse with falling gravel noise when demolishing structures.
   */
  public playDemolish(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Structural snap
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(110, t);
    snap.frequency.exponentialRampToValueAtTime(32, t + 0.35);
    snapGain.gain.setValueAtTime(0.24, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    snap.connect(snapGain);
    snapGain.connect(out);
    snap.start(t);
    snap.stop(t + 0.35);

    // Falling gravel noise
    const nBuf = this.createNoiseBuffer(0.5);
    if (nBuf) {
      const nSrc = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      nSrc.buffer = nBuf;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(250, t + 0.5);
      filter.Q.setValueAtTime(1.2, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      nSrc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      nSrc.start(t);
      nSrc.stop(t + 0.5);
    }
  }

  /**
   * Gentle wind chime or harp strum transitioning the day.
   */
  public playPassDay(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Peaceful pentatonic harp sequence: D5, F#5, A5, B5, D6, F#6
    const harpNotes = [587.33, 739.99, 880.00, 987.77, 1174.66, 1479.98];
    harpNotes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.9);

      osc.connect(gain);
      gain.connect(out);

      osc.start(noteTime);
      osc.stop(noteTime + 0.9);
    });
  }

  // ==========================================
  // 4. CHEMISTRY & SCIENCE NEUTRALIZATION
  // ==========================================

  /**
   * White-noise sizzling burn when contacting industrial chemical acid.
   */
  public playAcidSizzle(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const nBuf = this.createNoiseBuffer(0.35);
    if (nBuf) {
      const nSrc = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      nSrc.buffer = nBuf;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2600, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      nSrc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      nSrc.start(t);
      nSrc.stop(t + 0.35);
    }
  }

  /**
   * Bubbling fizz settling into a peaceful pure harmonic bell chime.
   */
  public playNeutralizeSuccess(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // 1. Bubbling effervescence
    const nBuf = this.createNoiseBuffer(0.25);
    if (nBuf) {
      const nSrc = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      nSrc.buffer = nBuf;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      nSrc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      nSrc.start(t);
      nSrc.stop(t + 0.25);
    }

    // 2. Pure harmonious resolution chime: A5, E6, A6
    const chimeTime = t + 0.16;
    const chimes = [880.00, 1318.51, 1760.00];
    chimes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, chimeTime);

      const vol = i === 0 ? 0.16 : 0.1;
      gain.gain.setValueAtTime(vol, chimeTime);
      gain.gain.exponentialRampToValueAtTime(0.001, chimeTime + 0.7);

      osc.connect(gain);
      gain.connect(out);
      osc.start(chimeTime);
      osc.stop(chimeTime + 0.7);
    });
  }

  // ==========================================
  // 5. WAR ROOM & PARALLEL CONQUEST
  // ==========================================

  /**
   * Rhythmic military snare cadence for army mobilization and marches.
   */
  public playWarMarch(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Snare cadence strokes: 0s, 0.14s, 0.21s, 0.35s
    const strokes = [0, 0.14, 0.21, 0.35];
    strokes.forEach((offset, idx) => {
      const sTime = t + offset;
      const isAccent = idx === 3;
      const dur = isAccent ? 0.25 : 0.08;

      // Drum body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 210 : 180, sTime);
      osc.frequency.exponentialRampToValueAtTime(60, sTime + dur);

      oscGain.gain.setValueAtTime(isAccent ? 0.24 : 0.15, sTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, sTime + dur);

      osc.connect(oscGain);
      oscGain.connect(out);
      osc.start(sTime);
      osc.stop(sTime + dur);

      // Snare wire rattle
      const nBuf = this.createNoiseBuffer(dur);
      if (nBuf) {
        const nSrc = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const nGain = ctx.createGain();

        nSrc.buffer = nBuf;
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, sTime);

        nGain.gain.setValueAtTime(isAccent ? 0.22 : 0.12, sTime);
        nGain.gain.exponentialRampToValueAtTime(0.001, sTime + dur);

        nSrc.connect(filter);
        filter.connect(nGain);
        nGain.connect(out);
        nSrc.start(sTime);
        nSrc.stop(sTime + dur);
      }
    });
  }

  /**
   * Steel sword strikes and shield deflection.
   */
  public playBattleClash(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Clashing steel tones
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(1480, t);
    osc1.frequency.exponentialRampToValueAtTime(260, t + 0.14);

    osc2.frequency.setValueAtTime(2220, t);
    osc2.frequency.exponentialRampToValueAtTime(420, t + 0.12);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.16);
    osc2.stop(t + 0.16);

    // Shield deflection thump at t + 0.04
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110, t + 0.04);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.2);

    thumpGain.gain.setValueAtTime(0.2, t + 0.04);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    thump.connect(thumpGain);
    thumpGain.connect(out);
    thump.start(t + 0.04);
    thump.stop(t + 0.2);
  }

  /**
   * Ethereal energy projectile whoosh when casting spells.
   */
  public playSpellCast(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.28);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.28);
    filter.Q.setValueAtTime(4, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(t);
    osc.stop(t + 0.36);

    // Harmonic sparkle
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    sparkle.type = 'triangle';
    sparkle.frequency.setValueAtTime(1318.5, t + 0.08); // E6
    sparkle.frequency.exponentialRampToValueAtTime(2637.0, t + 0.32); // E7
    sparkleGain.gain.setValueAtTime(0.12, t + 0.08);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    sparkle.connect(sparkleGain);
    sparkleGain.connect(out);
    sparkle.start(t + 0.08);
    sparkle.stop(t + 0.4);
  }

  /**
   * Deep pitched frequency-modulated beast growl for Demon King Malgok.
   */
  public playDemonRoar(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    // Carrier & Modulator for guttural FM growl
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const mainGain = ctx.createGain();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(95, t);
    carrier.frequency.exponentialRampToValueAtTime(34, t + 0.65);

    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(26, t);
    modGain.gain.setValueAtTime(80, t);
    modGain.gain.linearRampToValueAtTime(20, t + 0.65);

    modulator.connect(carrier.frequency);

    mainGain.gain.setValueAtTime(0.3, t);
    mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.68);

    carrier.connect(mainGain);
    mainGain.connect(out);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + 0.68);
    modulator.stop(t + 0.68);

    // Sub-bass earthquake rumble
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(45, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.65);
    subGain.gain.setValueAtTime(0.24, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.68);

    sub.connect(subGain);
    subGain.connect(out);
    sub.start(t);
    sub.stop(t + 0.68);
  }

  // ==========================================
  // 6. SAO HOLOGRAPHIC UI
  // ==========================================

  /**
   * Subtle high-frequency blip (50ms) on hover over holographic hex buttons.
   */
  public playHexHover(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2100, t);

    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  /**
   * Crisp glassmorphic chirp on hex button click.
   */
  public playHexClick(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(2800, t + 0.05);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  /**
   * Low-pass filtered air swoosh on modal open/close.
   */
  public playModalWhoosh(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const nBuf = this.createNoiseBuffer(0.18);
    if (!nBuf) return;

    const nSrc = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    nSrc.buffer = nBuf;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + 0.18);
    filter.Q.setValueAtTime(1.8, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    nSrc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    nSrc.start(t);
    nSrc.stop(t + 0.18);
  }

  // ==========================================
  // BACKWARD-COMPATIBLE ADAPTERS
  // ==========================================

  public playSaoOpen(): void {
    this.playModalWhoosh();
    this.playHexClick();
  }

  public playSaoSelect(): void {
    this.playHexClick();
  }

  public playSaoConfirm(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t); // D5
    osc2.frequency.setValueAtTime(880.00, t + 0.06); // A5

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start(t);
    osc1.stop(t + 0.2);
    osc2.start(t + 0.06);
    osc2.stop(t + 0.3);
  }

  public playChemicalReact(): void {
    this.playNeutralizeSuccess();
  }

  public playCastleHorn(): void {
    this.playRoyalFanfare();
  }

  public playJump(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.12);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playMineHit(oreType?: string): void {
    this.playPickaxeClink(oreType);
  }

  public playOreBreak(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.05);

      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.3);
    });
  }

  public playTremor(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(35, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playAcidDamage(): void {
    this.playAcidSizzle();
  }

  public playBuild(): void {
    this.playBuildPlace();
  }

  public playElevator(): void {
    this.playElevatorDrone();
  }

  public playVictory(): void {
    this.playRoyalFanfare();
  }

  public playAlert(): void {
    this.playHazardAlarm();
  }

  public playSwordClash(): void {
    this.playBattleClash();
  }

  public playWarHorn(): void {
    const audio = this.getOut();
    if (!audio) return;
    const { ctx, out } = audio;
    const t = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(146.83, t);
    osc1.frequency.linearRampToValueAtTime(185.00, t + 0.4);
    osc2.frequency.setValueAtTime(220.00, t);
    osc2.frequency.linearRampToValueAtTime(277.18, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start(t);
    osc1.stop(t + 0.6);
    osc2.start(t);
    osc2.stop(t + 0.6);
  }

  public playConquestFanfare(): void {
    this.playRoyalFanfare();
  }
}

export const sounds = new SoundController();
