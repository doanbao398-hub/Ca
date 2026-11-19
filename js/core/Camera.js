import { getWorldSize } from "../data/mapsConfig.js";
import { settings } from "./SettingsManager.js";

export class Camera {
  constructor() {
    this.x = 2250;
    this.y = 2250;
    this.zoom = 1;
    this.shake = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.zoom = 1;
    this.shake = 0;
  }

  follow(player, width, height, selectedMap) {
    const worldSize = getWorldSize(selectedMap);
    this.x += (player.x - this.x) * 0.08;
    this.y += (player.y - this.y) * 0.08;

    const visionBonus =
      (selectedMap === "abyss" || selectedMap === "hybrid") &&
      player.species === "diver"
        ? 0.14
        : 0;
    const minScreenDim = Math.min(width, height);
    const mobileScale = minScreenDim < 650 ? 0.72 : 1.0;

    const baseZoom =
      Math.max(0.32, 1.08 - (player.radius - 20) * 0.0032 - visionBonus) *
      mobileScale;
    this.zoom += (baseZoom - this.zoom) * 0.05;

    const halfW = width / (2 * this.zoom);
    const halfH = height / (2 * this.zoom);
    if (worldSize > halfW * 2) {
      this.x = Math.max(halfW * 0.4, Math.min(worldSize - halfW * 0.4, this.x));
    }
    if (worldSize > halfH * 2) {
      this.y = Math.max(halfH * 0.4, Math.min(worldSize - halfH * 0.4, this.y));
    }

    if (this.shake > 0) {
      this.shake *= 0.88;
      if (this.shake < 0.3) this.shake = 0;
    }
  }

  applyTransform(ctx, width, height) {
    const canShake = settings.data.screenShake !== false;
    const shakeX =
      canShake && this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY =
      canShake && this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;

    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
}
