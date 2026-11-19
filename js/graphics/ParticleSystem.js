import { settings } from "../core/SettingsManager.js";

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  addParticle(x, y, color, speed, size, isBubble = false) {
    const q = settings.data.particleQuality || "high";
    if (q === "low" && Math.random() > 0.25) return;
    if (q === "medium" && Math.random() > 0.6) return;

    const ang = Math.random() * Math.PI * 2;
    this.particles.push({
      x,
      y,
      vx: isBubble ? (Math.random() - 0.5) * 0.6 : Math.cos(ang) * speed,
      vy: isBubble ? -(Math.random() * 1.5 + 0.8) : Math.sin(ang) * speed,
      color,
      size,
      alpha: 1,
      isBubble,
    });
  }

  addFloatingText(x, y, text, color = "#fff") {
    if (!settings.data.showFloatingText) return;
    this.floatingTexts.push({ x, y, text, color, alpha: 1, vy: -1.4 });
  }

  addShockwave(x, y, maxR, color) {
    this.shockwaves.push({ x, y, r: 10, maxR, color, alpha: 0.9 });
  }

  updateAndDraw(ctx) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.r += (sw.maxR - sw.r) * 0.14;
      sw.alpha -= 0.035;
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.isBubble ? 0.014 : 0.032;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.isBubble) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.018;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = "900 15px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
      if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }
}
