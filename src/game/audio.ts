// Tiny synthesized sound effects. No audio files.
export type SfxName = 'jump' | 'gem' | 'unlock' | 'bump' | 'break' | 'stomp' | 'hurt' | 'flag' | 'end' | 'fall';

const KEY = 'kp-quest-muted';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted: boolean;

  constructor() {
    let m = false;
    try { m = localStorage.getItem(KEY) === '1'; } catch { /* storage blocked */ }
    this.muted = m;
  }

  /** Must run inside a user gesture on iOS/Safari. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.13;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.13;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', to?: number, at = 0, vol = 1) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, at = 0, vol = 0.6) {
    if (!this.ctx || !this.master || this.muted) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(g).connect(this.master);
    src.start(this.ctx.currentTime + at);
  }

  play(name: SfxName) {
    switch (name) {
      case 'jump': this.tone(260, 0.14, 'square', 560, 0, 0.5); break;
      case 'gem': this.tone(988, 0.07, 'square', undefined, 0, 0.5); this.tone(1319, 0.14, 'square', undefined, 0.07, 0.5); break;
      case 'unlock': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', undefined, i * 0.06, 0.9)); break;
      case 'bump': this.tone(140, 0.08, 'square', 90, 0, 0.5); break;
      case 'break': this.noise(0.18, 0, 0.5); this.tone(180, 0.1, 'square', 60, 0, 0.3); break;
      case 'stomp': this.tone(200, 0.1, 'square', 60, 0, 0.6); break;
      case 'hurt': this.tone(320, 0.25, 'sawtooth', 90, 0, 0.4); break;
      case 'fall': this.tone(500, 0.5, 'triangle', 80, 0, 0.6); break;
      case 'flag': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.16, 'square', undefined, i * 0.09, 0.45)); this.tone(1047, 0.4, 'triangle', undefined, 0.36, 0.8); break;
      case 'end': [523, 523, 523, 698, 880, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'square', undefined, i * 0.13, 0.45)); break;
    }
  }
}
