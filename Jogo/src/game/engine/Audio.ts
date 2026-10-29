/**
 * Áudio 100% sintetizado (WebAudio) — sem arquivos externos.
 * Navegadores só liberam som após um gesto do usuário: `unlock()` é chamado ao tocar em "Explorar".
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private siren: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  private _muted = false;

  get muted() {
    return this._muted;
  }

  setMuted(m: boolean) {
    this._muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* sem áudio disponível */
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, vol: number, cutoff: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  blip() {
    this.tone(660, 0.07, 'square', 0.08);
  }
  pop() {
    this.tone(520, 0.1, 'sine', 0.2, 180);
  }
  thud() {
    this.tone(130, 0.18, 'triangle', 0.35, 55);
    this.noise(0.08, 0.15, 500);
  }
  whoosh() {
    this.noise(0.18, 0.18, 2400);
  }
  raspberry() {
    this.tone(120, 0.4, 'sawtooth', 0.18, 70);
    this.noise(0.35, 0.12, 700);
  }
  beep() {
    this.tone(980, 0.09, 'square', 0.12);
  }
  spotted() {
    this.tone(420, 0.12, 'sawtooth', 0.14, 900);
    this.tone(900, 0.2, 'sawtooth', 0.12, 300, 0.12);
  }
  sting() {
    this.tone(440, 0.25, 'sawtooth', 0.2, 220);
    this.tone(330, 0.25, 'sawtooth', 0.2, 110, 0.2);
    this.tone(180, 0.6, 'sawtooth', 0.22, 60, 0.4);
  }
  /** Passos (alternância leve de pitch). */
  step(alt = false) {
    this.noise(0.05, 0.1, alt ? 900 : 700);
  }
  /** Abrir armário/gaveta. */
  open() {
    this.tone(180, 0.16, 'triangle', 0.2, 420);
    this.noise(0.1, 0.08, 1800, 0.05);
  }
  /** Fabricação concluída. */
  craft() {
    this.tone(520, 0.1, 'square', 0.12);
    this.tone(660, 0.1, 'square', 0.12, undefined, 0.09);
    this.tone(880, 0.18, 'square', 0.12, undefined, 0.18);
  }
  /** Captura pelo Gil. */
  capture() {
    this.tone(300, 0.3, 'sawtooth', 0.22, 90);
    this.tone(150, 0.5, 'square', 0.18, 50, 0.25);
    this.noise(0.4, 0.12, 400, 0.1);
  }
  /** Fanfarra de vitória. */
  victory() {
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.22, 'square', 0.12, undefined, i * 0.16));
  }

  // ------------------------------------------------------------ música procedural
  private musicTimer: number | null = null;
  private musicMode: 'explore' | 'chase' | null = null;
  private musicStep = 0;
  private musicOn = true;

  setMusicEnabled(on: boolean) {
    this.musicOn = on;
    if (!on) this.stopMusic();
  }

  /** Troca a trilha (ou desliga com null). Idempotente. */
  startMusic(mode: 'explore' | 'chase') {
    if (this.musicMode === mode && this.musicTimer !== null) return;
    this.stopMusic();
    if (!this.musicOn) return;
    this.musicMode = mode;
    this.musicStep = 0;
    const interval = mode === 'chase' ? 175 : 300;
    const tick = () => {
      if (!this.ctx || !this.master || this._muted || !this.musicOn) return;
      const seq =
        mode === 'chase'
          ? [110, 110, 131, 98, 110, 110, 147, 131]
          : [220, 277, 330, 277, 294, 330, 294, 247];
      const f = seq[this.musicStep % seq.length];
      this.tone(f, mode === 'chase' ? 0.14 : 0.26, mode === 'chase' ? 'sawtooth' : 'sine', mode === 'chase' ? 0.05 : 0.045);
      if (mode === 'explore' && this.musicStep % 4 === 0) this.tone(f * 2, 0.2, 'sine', 0.02);
      this.musicStep++;
    };
    this.musicTimer = window.setInterval(tick, interval);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicMode = null;
  }
  growl() {
    this.tone(90, 0.9, 'sawtooth', 0.28, 45);
    this.tone(94, 0.9, 'square', 0.12, 48);
    this.noise(0.7, 0.14, 300);
  }

  /** Sirene do protocolo (dois tons alternando). */
  alarmStart() {
    if (!this.ctx || !this.master || this.siren) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 760;
    lfo.type = 'square';
    lfo.frequency.value = 1.5;
    lfoGain.gain.value = 190;
    gain.gain.value = 0.12;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.siren = { osc, lfo, gain };
  }

  alarmStop() {
    if (!this.siren || !this.ctx) return;
    const { osc, lfo, gain } = this.siren;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0.0001, t, 0.08);
    osc.stop(t + 0.4);
    lfo.stop(t + 0.4);
    this.siren = null;
  }
}
