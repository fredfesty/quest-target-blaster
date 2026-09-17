// Procedural Web Audio Sound Generator
// Generates dynamic sound effects without external audio file dependencies.

class SoundManager {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.generateNoiseBuffer();
    this.initialized = true;
  }

  ensureRunning() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  generateNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  // Laser blaster shot
  playBlasterFire(pan = 0) {
    this.ensureRunning();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    // Rapid laser pitch dive
    osc.frequency.setValueAtTime(850, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(this.ctx.destination);
    }

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Target hit chime
  playTargetHit() {
    this.ensureRunning();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.08);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Deep boom explosion
  playTargetExplosion() {
    this.ensureRunning();
    if (!this.ctx || !this.noiseBuffer) return;

    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.46);
  }

  // Ascending musical combo streak notes
  playComboSound(streak = 1) {
    this.ensureRunning();
    if (!this.ctx) return;

    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 to C6
    const freq = pentatonic[Math.min(streak - 1, pentatonic.length - 1)];

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Futuristic power-up when round starts
  playGameStart() {
    this.ensureRunning();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.56);
  }
}

export const sounds = new SoundManager();
