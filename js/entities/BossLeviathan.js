import { Creature } from "./Creature.js";
import { getWorldSize } from "../data/mapsConfig.js";

export class BossLeviathan extends Creature {
  constructor(playerRadius = 60, mapKey = "coral") {
    const worldSize = getWorldSize(mapKey);
    const bossRadius = Math.min(260, Math.max(150, playerRadius * 1.45));
    super(
      worldSize * 0.35,
      worldSize * 0.35,
      bossRadius,
      "croc",
      "👑 LEVIATHAN CHÚA TỂ",
      false,
    );
    this.colors = {
      primary: "#ff006e",
      secondary: "#240046",
      accent: "#fee440",
    };
    this.maxHp = 1200;
    this.hp = this.maxHp;
    this.dashCooldown = 5;
  }

  update(player, dt) {
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      return;
    }
    this.dashCooldown -= dt;
    let speed = 2.6;
    if (this.dashCooldown <= 0) {
      speed = 6.5;
      if (this.dashCooldown <= -0.6) this.dashCooldown = 5.5;
    }
    const targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
    this.angle += (targetAngle - this.angle) * 0.04;
    const frameScale = dt * 60;
    this.x += Math.cos(this.angle) * speed * frameScale;
    this.y += Math.sin(this.angle) * speed * frameScale;
    this.animPhase += 0.14;
  }

  drawBossBar(ctx) {
    ctx.save();
    const barW = 200;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 46, barW, 14);
    ctx.fillStyle = "#ff006e";
    ctx.fillRect(
      this.x - barW / 2 + 2,
      this.y - this.radius - 44,
      (barW - 4) * Math.max(0, this.hp / this.maxHp),
      10,
    );
    ctx.restore();
  }
}

