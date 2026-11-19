import { WORLD_SIZE } from "../data/mapsConfig.js";

export class Camera {
  constructor() {
    this.x = WORLD_SIZE / 2;
    this.y = WORLD_SIZE / 2;
    this.zoom = 1;
    this.shake = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.shake = 0;
  }

  follow(player, width, height, selectedMap) {
    if (!player) return;
    this.x += (player.x - this.x) * 0.08;
    this.y += (player.y - this.y) * 0.08;

    const isMobile = width <= 820;
    const mobileZoomAdjust = isMobile ? -0.18 : 0;
    const visionBonus =
      selectedMap === "abyss" && player.species === "diver" ? 0.12 : 0;

    const targetZoom = Math.max(
      0.42,
      1.05 + mobileZoomAdjust + visionBonus - (player.radius - 21) * 0.0036
    );
    this.zoom += (targetZoom - this.zoom) * 0.05;
  }

  applyTransform(ctx, width, height) {
    if (this.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
      this.shake *= 0.85;
      if (this.shake < 0.5) this.shake = 0;
    }
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}
