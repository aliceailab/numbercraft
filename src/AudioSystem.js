export class AudioSystem {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.musicStarted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensureReady() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }

    if (!this.context) {
      this.context = new AudioContextClass();
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 20;
      this.compressor.ratio.value = 10;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.18;
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.34;
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }

    return true;
  }

  unlock() {
    if (!this.ensureReady()) {
      return;
    }

    if (this.context.state !== 'running') {
      this.context.resume().catch(() => {
        // Ignore resume failures and keep gameplay running.
      });
    }
  }

  pauseAll() {
    if (!this.context || this.context.state !== 'running') {
      return;
    }

    this.context.suspend().catch(() => {
      // Ignore suspend failures and keep gameplay running.
    });
  }

  resumeAll() {
    if (!this.ensureReady()) {
      return;
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {
        // Ignore resume failures and keep gameplay running.
      });
    }
  }

  createNoiseBuffer() {
    const length = this.context.sampleRate * 0.6;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2) - 1;
    }

    return buffer;
  }

  playTone({
    start = 0,
    duration = 0.08,
    type = 'sine',
    frequency = 440,
    endFrequency = frequency,
    gain = 0.05,
    endGain = 0.0001,
    attack = 0.004,
  }) {
    if (!this.ensureReady()) {
      return;
    }

    this.unlock();

    const now = this.context.currentTime + 0.02 + start;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + attack);
    amp.gain.exponentialRampToValueAtTime(endGain, now + duration);

    osc.connect(amp);
    amp.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoise({
    start = 0,
    duration = 0.14,
    gain = 0.04,
    filterFrequency = 500,
  }) {
    if (!this.ensureReady()) {
      return;
    }

    this.unlock();

    const now = this.context.currentTime + 0.02 + start;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFrequency, now);
    filter.Q.value = 1.3;

    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.masterGain);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.musicStarted = false;
  }

  startMusic() {
    if (!this.ensureReady() || this.musicStarted) {
      return;
    }

    this.unlock();
    this.musicStarted = true;
    this.scheduleMusicPhrase();
    this.musicTimer = window.setInterval(() => {
      if (this.context?.state === 'running') {
        this.scheduleMusicPhrase();
      }
    }, 2400);
  }

  scheduleMusicPhrase() {
    const phrases = [
      {
        bass: [130.81, 130.81, 164.81, 196.0],
        lead: [523.25, 659.25, 783.99, 659.25, 698.46, 783.99, 880.0, 783.99],
        arp: [1046.5, 1318.51, 1567.98, 1318.51, 1174.66, 1318.51, 1567.98, 1318.51],
      },
      {
        bass: [146.83, 146.83, 174.61, 220.0],
        lead: [587.33, 698.46, 880.0, 698.46, 659.25, 698.46, 783.99, 698.46],
        arp: [1174.66, 1396.91, 1760.0, 1396.91, 1318.51, 1396.91, 1567.98, 1396.91],
      },
      {
        bass: [110.0, 110.0, 146.83, 196.0],
        lead: [493.88, 587.33, 783.99, 659.25, 523.25, 659.25, 783.99, 659.25],
        arp: [987.77, 1174.66, 1567.98, 1318.51, 1046.5, 1318.51, 1567.98, 1318.51],
      },
      {
        bass: [123.47, 123.47, 164.81, 207.65],
        lead: [523.25, 622.25, 830.61, 698.46, 554.37, 698.46, 830.61, 932.33],
        arp: [1046.5, 1244.51, 1661.22, 1396.91, 1108.73, 1396.91, 1661.22, 1864.66],
      },
    ];
    const phrase = phrases[this.musicStep % phrases.length];
    this.musicStep += 1;

    phrase.lead.forEach((frequency, index) => {
      this.playTone({
        start: index * 0.3,
        duration: 0.23,
        type: 'square',
        frequency,
        endFrequency: frequency * 0.985,
        gain: index % 2 === 0 ? 0.04 : 0.035,
        endGain: 0.0002,
        attack: 0.004,
      });
    });

    phrase.arp.forEach((frequency, index) => {
      this.playTone({
        start: 0.15 + index * 0.3,
        duration: 0.14,
        type: 'triangle',
        frequency,
        endFrequency: frequency * 1.01,
        gain: 0.014,
        endGain: 0.0002,
        attack: 0.003,
      });
    });

    phrase.bass.forEach((frequency, index) => {
      this.playTone({
        start: index * 0.6,
        duration: 0.24,
        type: 'sawtooth',
        frequency: frequency / 2,
        endFrequency: (frequency / 2) * 0.95,
        gain: 0.028,
        endGain: 0.0002,
        attack: 0.005,
      });
    });

    [0, 0.6, 1.2, 1.8].forEach((start) => {
      this.playTone({
        start,
        duration: 0.09,
        type: 'triangle',
        frequency: 92,
        endFrequency: 48,
        gain: 0.035,
        endGain: 0.0002,
        attack: 0.001,
      });
      this.playNoise({
        start,
        duration: 0.06,
        gain: 0.02,
        filterFrequency: 140,
      });
    });

    [0.3, 0.9, 1.5, 2.1].forEach((start) => {
      this.playNoise({
        start,
        duration: 0.08,
        gain: 0.009,
        filterFrequency: 2200,
      });
    });

    [0.45, 1.05, 1.65, 2.25].forEach((start) => {
      this.playNoise({
        start,
        duration: 0.04,
        gain: 0.006,
        filterFrequency: 5600,
      });
    });
  }

  click() {
    this.playTone({
      type: 'square',
      frequency: 720,
      endFrequency: 980,
      gain: 0.06,
      duration: 0.06,
      attack: 0.001,
    });
  }

  swap(mode) {
    const base = mode === 'gcd' ? 260 : mode === 'factor' ? 380 : 520;
    this.playTone({
      type: 'triangle',
      frequency: base,
      endFrequency: base * 1.45,
      gain: 0.07,
      duration: 0.1,
    });
    this.playTone({
      start: 0.04,
      type: 'triangle',
      frequency: base * 1.25,
      endFrequency: base * 1.7,
      gain: 0.05,
      duration: 0.09,
    });
  }

  footstep() {
    this.playNoise({
      duration: 0.05,
      gain: 0.018,
      filterFrequency: 220,
    });
    this.playTone({
      type: 'triangle',
      frequency: 110,
      endFrequency: 72,
      gain: 0.02,
      duration: 0.06,
      attack: 0.001,
    });
  }

  jump() {
    this.playTone({
      type: 'square',
      frequency: 280,
      endFrequency: 430,
      gain: 0.05,
      duration: 0.12,
      attack: 0.002,
    });
    this.playNoise({
      start: 0.01,
      duration: 0.05,
      gain: 0.012,
      filterFrequency: 1200,
    });
  }

  land() {
    this.playNoise({
      duration: 0.08,
      gain: 0.025,
      filterFrequency: 180,
    });
    this.playTone({
      type: 'triangle',
      frequency: 150,
      endFrequency: 70,
      gain: 0.03,
      duration: 0.08,
      attack: 0.001,
    });
  }

  fire(mode, value) {
    if (mode === 'standard') {
      this.playTone({
        type: 'square',
        frequency: 390,
        endFrequency: 180,
        gain: 0.11,
        duration: 0.12,
        attack: 0.002,
      });
      return;
    }

    if (mode === 'factor') {
      this.playTone({
        type: 'sawtooth',
        frequency: 260 + (value * 20),
        endFrequency: 130,
        gain: 0.1,
        duration: 0.12,
        attack: 0.002,
      });
      return;
    }

    this.playTone({
      type: 'triangle',
      frequency: 170 + (value * 10),
      endFrequency: 90,
      gain: 0.12,
      duration: 0.15,
      attack: 0.002,
    });
  }

  impact(mode, strong = false) {
    const filterFrequency = mode === 'gcd' ? 180 : mode === 'factor' ? 300 : 520;
    this.playNoise({
      duration: strong ? 0.28 : 0.12,
      gain: strong ? 0.16 : 0.08,
      filterFrequency,
    });

    if (strong) {
      this.playTone({
        type: 'triangle',
        frequency: 140,
        endFrequency: 60,
        gain: 0.08,
        duration: 0.26,
        attack: 0.001,
      });
    }
  }

  reject() {
    this.playTone({
      type: 'sawtooth',
      frequency: 240,
      endFrequency: 110,
      gain: 0.06,
      duration: 0.09,
      attack: 0.001,
    });
  }

  levelAdvance() {
    this.playTone({
      type: 'triangle',
      frequency: 440,
      endFrequency: 520,
      gain: 0.06,
      duration: 0.1,
    });
    this.playTone({
      start: 0.07,
      type: 'triangle',
      frequency: 550,
      endFrequency: 660,
      gain: 0.05,
      duration: 0.1,
    });
    this.playTone({
      start: 0.14,
      type: 'triangle',
      frequency: 660,
      endFrequency: 840,
      gain: 0.07,
      duration: 0.14,
    });
  }

  hurt() {
    this.playTone({
      type: 'square',
      frequency: 620,
      endFrequency: 420,
      gain: 0.045,
      duration: 0.08,
      attack: 0.001,
    });
    this.playTone({
      start: 0.02,
      type: 'sine',
      frequency: 760,
      endFrequency: 520,
      gain: 0.032,
      duration: 0.1,
      attack: 0.001,
    });
  }

  failure() {
    this.stopMusic();

    const notes = [659.25, 523.25, 415.3, 329.63];
    notes.forEach((frequency, index) => {
      this.playTone({
        start: index * 0.18,
        duration: 0.22,
        type: 'square',
        frequency,
        endFrequency: frequency * 0.94,
        gain: 0.08,
        endGain: 0.0002,
        attack: 0.002,
      });
      this.playTone({
        start: index * 0.18,
        duration: 0.26,
        type: 'triangle',
        frequency: frequency / 2,
        endFrequency: (frequency / 2) * 0.93,
        gain: 0.045,
        endGain: 0.0002,
        attack: 0.003,
      });
    });

    this.playNoise({
      start: 0.02,
      duration: 0.28,
      gain: 0.045,
      filterFrequency: 240,
    });
  }
}
