import { settings } from "./SettingsManager.js";

class SoundSystem {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  get muted() {
    return !!settings.data.muted;
  }

  toggleMute() {
    const next = !settings.data.muted;
    settings.set("muted", next);
    return next;
  }

  playTone(freq, type, duration, vol = 0.08, slideFreq = null) {
    if (this.muted) return;
    const masterVol = settings.data.sfxVolume ?? 0.8;
    if (masterVol <= 0) return;

    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        slideFreq,
        this.ctx.currentTime + duration,
      );
    }
    const finalVol = Math.max(0.001, vol * masterVol);
    gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.ctx.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playEat(combo = 1) {
    const pitch = Math.min(800, 320 + combo * 40);
    this.playTone(pitch, "sine", 0.14, 0.08, pitch * 1.45);
  }

  playSkill() {
    this.playTone(220, "triangle", 0.28, 0.1, 680);
  }

  playEvolution() {
    [440, 554, 659, 880].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, "triangle", 0.35, 0.09), idx * 90);
    });
  }

  playHurt() {
    this.playTone(180, "sawtooth", 0.25, 0.12, 65);
  }
}

export const sound = new SoundSystem();
