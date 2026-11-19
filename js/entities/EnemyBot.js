import { Creature } from "./Creature.js";
import { WORLD_SIZE } from "../data/mapsConfig.js";

const PALETTES = [
  { primary: "#ff6b6b", secondary: "#c92a2a", accent: "#ffe066" },
  { primary: "#4dabf7", secondary: "#1864ab", accent: "#a5d8ff" },
  { primary: "#51cf66", secondary: "#2b8a3e", accent: "#b2f2bb" },
  { primary: "#fcc419", secondary: "#e67700", accent: "#fff3bf" },
  { primary: "#cc5de8", secondary: "#862e9c", accent: "#f3d9fa" },
];

const DANGER_NAMES = [
  "Cá Mập Trắng",
  "Thủy Quái",
  "Sấu Khổng Lồ",
  "Rùa Cổ Đại",
  "Cá Kiếm Đen",
];

export class EnemyBot extends Creature {
  constructor(playerRadius) {
    const x = Math.random() * (WORLD_SIZE - 250) + 125;
    const y = Math.random() * (WORLD_SIZE - 250) + 125;
    const roll = Math.random();
    let radius;
    if (roll < 0.62) {
      radius = Math.max(10, playerRadius * (0.4 + Math.random() * 0.48));
    } else if (roll < 0.88) {
      radius = playerRadius * (1.15 + Math.random() * 0.5);
    } else {
      radius = playerRadius * (1.75 + Math.random() * 0.65);
    }
    radius = Math.min(radius, 130);

    const types = ["fish", "turtle", "croc", "puffer"];
    const type = types[Math.floor(Math.random() * types.length)];
    if (type === "puffer") radius = Math.min(26, radius);

    const label =
      radius > playerRadius * 1.05
        ? `⚠️ ${DANGER_NAMES[Math.floor(Math.random() * DANGER_NAMES.length)]}`
        : "";

    super(x, y, radius, type, label, false);
    this.colors = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    this.baseSpeed = Math.max(1.1, 2.7 - radius / 68) + Math.random() * 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.wanderOffset = Math.random() * 100;
    this.puffed = false;
  }

  update(player, dt, gameState, worldEvent) {
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      return;
    }
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (this.species === "puffer") this.puffed = dist < 130;

    const aggroRange = 240 + this.radius;
    const rageSpeedMult =
      worldEvent && worldEvent.type === "bloodmoon" ? 1.3 : 1.0;
    let speed = this.baseSpeed * rageSpeedMult;
    let targetAngle = this.angle;

    if (gameState === "PLAYING" && dist < aggroRange && !player.isStealthed) {
      if (this.radius > player.radius * 1.06 && player.ultTimer <= 0) {
        targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
        speed *= 1.15;
        if (dist < this.radius + player.radius + 35) this.eatAnim = 0.8;
      } else if (this.radius < player.radius * 0.94 || player.ultTimer > 0) {
        targetAngle = Math.atan2(this.y - player.y, this.x - player.x);
        speed *= 1.22;
      }
    } else {
      this.wanderOffset += 0.02;
      targetAngle += Math.sin(this.wanderOffset) * 0.015;
    }

    if (this.x < 160) targetAngle = 0;
    if (this.x > WORLD_SIZE - 160) targetAngle = Math.PI;
    if (this.y < 160) targetAngle = Math.PI / 2;
    if (this.y > WORLD_SIZE - 160) targetAngle = -Math.PI / 2;

    let diff = targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * 0.045;

    const frameScale = dt * 60;
    this.x += Math.cos(this.angle) * speed * frameScale;
    this.y += Math.sin(this.angle) * speed * frameScale;
    this.animPhase += 0.14;
    if (this.eatAnim > 0) this.eatAnim = Math.max(0, this.eatAnim - 0.05);
  }
}
