/** Restrained generated soundscape: machinery hum tied to the RF extractor,
 * radio clicks, warning tones, UI blips. No assets — pure WebAudio. */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private started = false;
  volume = 0.6;
  ambient = true;

  /** Browsers require a user gesture before audio; call from the first click. */
  ensure(): void {
    if (this.started) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    this.started = true;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    // machinery hum: detuned low pair through a lowpass, gain driven by sim
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0;
    this.humOsc = this.ctx.createOscillator();
    this.humOsc.type = 'sawtooth';
    this.humOsc.frequency.value = 54;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 54.7;
    this.humOsc.connect(lp);
    osc2.connect(lp);
    lp.connect(this.humGain);
    this.humGain.connect(this.master);
    this.humOsc.start();
    osc2.start();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /** Drive ambience each frame from sim state. */
  setHum(extractorRunning: boolean, brownout: boolean): void {
    if (!this.humGain || !this.ctx) return;
    const target = !this.ambient ? 0 : extractorRunning ? (brownout ? 0.02 : 0.05) : 0.008;
    this.humGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number, when = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  uiClick(): void { this.blip(880, 0.05, 'square', 0.05); }
  radioClick(): void {
    // squelch click + brief noise burst
    this.blip(1400, 0.03, 'square', 0.06);
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const len = 0.07;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.04;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t + 0.03);
  }
  warn(): void { this.blip(620, 0.12, 'triangle', 0.09); this.blip(470, 0.14, 'triangle', 0.09, 0.16); }
  danger(): void {
    for (let i = 0; i < 3; i++) this.blip(740, 0.1, 'square', 0.08, i * 0.18);
  }
  chime(): void { this.blip(660, 0.3, 'sine', 0.08); this.blip(990, 0.45, 'sine', 0.07, 0.12); }
  airlock(): void { this.blip(180, 0.4, 'sawtooth', 0.03); }
}

export const audio = new GameAudio();
