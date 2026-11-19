import { WORLD_SIZE } from "../data/mapsConfig.js";

export class Pearl {
  constructor(x, y, id = null) {
    this.id = id || "p_" + Math.random().toString(36).substring(2, 9);
    this.x = x ?? Math.random() * (WORLD_SIZE - 300) + 150;
    this.y = y ?? Math.random() * (WORLD_SIZE - 300) + 150;
    this.radius = 13;
    this.pulse = Math.random() * Math.PI * 2;
  }

  draw(ctx) {
    this.pulse += 0.06;
    const glow = 18 + Math.sin(this.pulse) * 6;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#ff758f";
    ctx.beginPath();
    ctx.ellipse(0, 7, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, glow);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.5, "#fee440");
    grad.addColorStop(1, "rgba(254, 228, 64, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glow, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff3b0";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class MeatChunk {
  constructor(x, y, pts) {
    this.x = x + (Math.random() - 0.5) * 40;
    this.y = y + (Math.random() - 0.5) * 40;
    this.pts = pts;
    this.radius = 10;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-6, 0, 3, 0, Math.PI * 2);
    ctx.arc(6, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
