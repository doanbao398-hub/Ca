class SoundSystem {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.muted = false;
    this.ambientStarted = false;
    this.ambientGain = null;
  }

  resume() {
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    if (!this.ambientStarted) {
      this.startOceanAmbient();
    }
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.muted ? 0 : 0.035;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.muted ? 0 : 0.035;
    }
    return this.muted;
  }

  startOceanAmbient() {
    try {
      this.ambientStarted = true;
      const bufferSize = this.ctx.sampleRate * 3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 180;

      const gain = this.ctx.createGain();
      gain.gain.value = this.muted ? 0 : 0.035;
      this.ambientGain = gain;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {
      this.ambientStarted = false;
    }
  }

  playEat(combo = 1) {
    if (this.muted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    const pitchBoost = Math.min(400, combo * 35);
    osc.frequency.setValueAtTime(300 + pitchBoost, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      650 + pitchBoost,
      this.ctx.currentTime + 0.12
    );
    gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playHurt() {
    if (this.muted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playSkill() {
    if (this.muted) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playEvolution() {
    if (this.muted) return;
    this.resume();
    const chord = [440, 554.37, 659.25, 880, 1108.73];
    chord.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx.currentTime + idx * 0.08 + 0.45
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.45);
    });
  }
}

export const sound = new SoundSystem();
