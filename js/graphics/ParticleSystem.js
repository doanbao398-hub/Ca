import { settings } from "../core/SettingsManager.js";
import { renderCreatureBody } from "./CreatureRenderer.js";

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.remoteEffects = [];
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.remoteEffects = [];
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

  addRemoteSkillVisual(sk) {
    if (!sk) return;
    const type = sk.type || "wave";
    const maxR = sk.maxR || 180;
    const color = sk.color || "#00f5d4";

    this.addShockwave(sk.x, sk.y, maxR, color);

    if (
      type === "space_domain" ||
      type === "time_domain" ||
      type === "space_semi_domain" ||
      type === "time_cage"
    ) {
      this.remoteEffects.push({
        type,
        x: sk.x,
        y: sk.y,
        radius: maxR,
        life: Math.min(18, Math.max(1.3, sk.duration || 6.0)),
        maxLife: Math.min(18, Math.max(1.3, sk.duration || 6.0)),
        color,
      });
    } else if (type === "space_slash" || type === "time_stasis_orb") {
      this.remoteEffects.push({
        type,
        x: sk.x,
        y: sk.y,
        angle: sk.angle || 0,
        size: sk.size || 60,
        traveled: 0,
        maxRange: sk.maxRange || 700,
        speed: 14,
        life: 1.4,
        color,
      });
    } else if (type === "space_rift" || type === "space_crush" || type === "time_paradox_burst") {
      this.remoteEffects.push({
        type,
        x: sk.x,
        y: sk.y,
        radius: maxR,
        angle: sk.angle || 0,
        life: 0.75,
        color,
      });
    } else if (type === "space_teleport" || type === "time_rewind") {
      this.remoteEffects.push({
        type,
        fromX: sk.fromX ?? sk.x,
        fromY: sk.fromY ?? sk.y,
        x: sk.x,
        y: sk.y,
        radius: maxR,
        life: 0.75,
        color,
      });
    } else if (type === "time_clones") {
      this.remoteEffects.push({
        type,
        x: sk.x,
        y: sk.y,
        clones: Array.isArray(sk.clones) ? sk.clones : [],
        life: Math.min(14, Math.max(3.0, sk.duration || 6.5)),
        color,
      });
    }
  }

  updateAndDraw(ctx) {
    const now = Date.now();

    for (let i = this.remoteEffects.length - 1; i >= 0; i--) {
      const ef = this.remoteEffects[i];
      ef.life -= 0.016;

      ctx.save();
      if (
        ef.type === "space_domain" ||
        ef.type === "time_domain" ||
        ef.type === "space_semi_domain" ||
        ef.type === "time_cage"
      ) {
        const isSpace =
          ef.type === "space_domain" || ef.type === "space_semi_domain";
        const grad = ctx.createRadialGradient(
          ef.x,
          ef.y,
          ef.radius * 0.1,
          ef.x,
          ef.y,
          ef.radius,
        );
        if (isSpace) {
          grad.addColorStop(0, "rgba(16, 0, 43, 0.28)");
          grad.addColorStop(0.7, "rgba(60, 9, 108, 0.38)");
          grad.addColorStop(1, "rgba(157, 78, 221, 0.62)");
        } else {
          grad.addColorStop(0, "rgba(15, 23, 42, 0.22)");
          grad.addColorStop(0.65, "rgba(245, 158, 11, 0.24)");
          grad.addColorStop(1, "rgba(45, 212, 191, 0.58)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(ef.x, ef.y);
        ctx.rotate(now * (isSpace ? 0.0012 : 0.0008));
        ctx.strokeStyle = isSpace ? "#e0aaff" : "#fbbf24";
        ctx.lineWidth = 4;
        ctx.setLineDash([22, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, ef.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ef.type === "space_slash" || ef.type === "time_stasis_orb") {
        ef.x += Math.cos(ef.angle) * ef.speed;
        ef.y += Math.sin(ef.angle) * ef.speed;
        ef.traveled += ef.speed;
        ctx.translate(ef.x, ef.y);
        ctx.rotate(ef.angle);
        ctx.strokeStyle = ef.color;
        ctx.fillStyle = "rgba(157, 78, 221, 0.45)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, ef.size, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.fill();
        ctx.stroke();
        if (ef.traveled >= ef.maxRange) ef.life = 0;
      } else if (
        ef.type === "space_rift" ||
        ef.type === "space_crush" ||
        ef.type === "time_paradox_burst"
      ) {
        ctx.globalAlpha = Math.min(1, ef.life * 2);
        ctx.strokeStyle = ef.color;
        ctx.fillStyle = "rgba(255, 0, 110, 0.25)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (ef.type === "space_teleport" || ef.type === "time_rewind") {
        ctx.globalAlpha = Math.min(1, ef.life * 1.8);
        ctx.strokeStyle = ef.color;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.moveTo(ef.fromX, ef.fromY);
        ctx.lineTo(ef.x, ef.y);
        ctx.stroke();
      } else if (ef.type === "time_clones") {
        ef.clones.forEach((c) => {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.globalAlpha = 0.78;
          const cloneColors =
            c.type === "past"
              ? { primary: "#f59e0b", secondary: "#78350f", accent: "#fef08a" }
              : { primary: "#2dd4bf", secondary: "#115e59", accent: "#ccfbf1" };
          renderCreatureBody(
            ctx,
            { species: "time", evoStage: c.type === "future" ? 8 : 3 },
            c.r || 30,
            Math.sin(now * 0.01) * 6,
            cloneColors,
          );
          ctx.restore();
        });
      }
      ctx.restore();

      if (ef.life <= 0) this.remoteEffects.splice(i, 1);
    }

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
