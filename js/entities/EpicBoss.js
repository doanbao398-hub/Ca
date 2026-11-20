import { Creature } from "./Creature.js";
import { getWorldSize } from "../data/mapsConfig.js";

export class EpicBoss extends Creature {
  constructor(bossType = "space", mapKey = "coral", spawnData = null) {
    const ws = getWorldSize(mapKey);
    const isSpace = bossType === "space";
    const x = spawnData?.x ?? ws * (0.28 + Math.random() * 0.44);
    const y = spawnData?.y ?? ws * (0.28 + Math.random() * 0.44);
    const radius = isSpace ? 132 : 148;

    super(
      x,
      y,
      radius,
      isSpace ? "space" : "time",
      isSpace
        ? "🌌 BOSS SỬ THI: KHÔNG GIAN [Lv.50]"
        : "⏳ BOSS SỬ THI: THỜI GIAN [Lv.75]",
      false,
    );

    this.bossType = bossType;
    this.mapKey = mapKey;
    this.isEpicBoss = true;
    this.level = isSpace ? 50 : 75;
    this.evoStage = isSpace ? 6 : 7;
    this.maxHp = isSpace ? 3600 : 5000;
    this.hp = this.maxHp;

    this.colors = isSpace
      ? { primary: "#9d4edd", secondary: "#240046", accent: "#ff006e" }
      : { primary: "#f59e0b", secondary: "#0f172a", accent: "#2dd4bf" };

    this.damageByLocal = 0;
    this.aggroRange = 1200;
    this.angle = Math.random() * Math.PI * 2;
    this.wanderOffset = Math.random() * 100;
    this.lungeTimer = 0;
    this.lungeCd = 4.5;
    this.meleeCd = 0;
    this.rewindUsed = false;

    this.skillCds = {
      s1: 4.0,
      s2: 2.5,
      s3: 7.0,
      teleport: 3.0,
    };

    this.historySnapshots = [];
    this.recordTimer = 0;
  }

  recordDamage(amount) {
    if (amount > 0) {
      this.damageByLocal = Math.min(this.maxHp, this.damageByLocal + amount);
    }
  }

  getLocalDamageRatio() {
    return this.maxHp > 0 ? this.damageByLocal / this.maxHp : 0;
  }

  updateAI(dt, player, bossSystem, particleSystem, camera) {
    const ws = getWorldSize(this.mapKey);
    const frameScale = dt * 60;

    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.meleeCd > 0) this.meleeCd = Math.max(0, this.meleeCd - dt);
    if (this.lungeTimer > 0)
      this.lungeTimer = Math.max(0, this.lungeTimer - dt);
    if (this.lungeCd > 0) this.lungeCd = Math.max(0, this.lungeCd - dt);

    Object.keys(this.skillCds).forEach((k) => {
      if (this.skillCds[k] > 0) {
        this.skillCds[k] = Math.max(0, this.skillCds[k] - dt);
      }
    });

    if (this.bossType === "time") {
      this.recordTimer += dt;
      if (this.recordTimer >= 0.1) {
        this.recordTimer = 0;
        this.historySnapshots.push({
          ts: performance.now(),
          x: this.x,
          y: this.y,
          hp: this.hp,
        });
        while (
          this.historySnapshots.length > 0 &&
          performance.now() - this.historySnapshots[0].ts > 3500
        ) {
          this.historySnapshots.shift();
        }
      }
    }

    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      return;
    }

    const distToPlayer = player
      ? Math.hypot(player.x - this.x, player.y - this.y)
      : Infinity;
    const isAggro =
      player &&
      player.hp > 0 &&
      !player.isStealthed &&
      distToPlayer <= this.aggroRange;

    let speed = this.bossType === "space" ? 3.25 : 3.1;
    let targetAngle = this.angle;

    if (isAggro) {
      targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
      if (this.lungeCd <= 0 && distToPlayer > this.radius + 90) {
        this.lungeTimer = 0.55;
        this.lungeCd = 5.5;
      }
      if (this.lungeTimer > 0) {
        speed *= 2.15;
      } else {
        speed *= 1.18;
      }

      bossSystem.runBossSkillsAI(this, player, particleSystem, camera);
    } else {
      this.wanderOffset += dt * 1.1;
      targetAngle += Math.sin(this.wanderOffset) * 0.03;
    }

    if (this.x < 260) targetAngle = 0;
    if (this.x > ws - 260) targetAngle = Math.PI;
    if (this.y < 260) targetAngle = Math.PI / 2;
    if (this.y > ws - 260) targetAngle = -Math.PI / 2;

    let diff = targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * (isAggro ? 0.08 : 0.04);

    this.x += Math.cos(this.angle) * speed * frameScale;
    this.y += Math.sin(this.angle) * speed * frameScale;
    this.x = Math.max(this.radius, Math.min(ws - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(ws - this.radius, this.y));
    this.animPhase += 0.16;
  }

  drawBossBar(ctx) {
    ctx.save();
    const barW = 240;
    const yTop = this.y - this.radius - 58;
    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.beginPath();
    ctx.roundRect(this.x - barW / 2, yTop, barW, 16, 6);
    ctx.fill();

    const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));
    ctx.fillStyle = this.bossType === "space" ? "#c77dff" : "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(
      this.x - barW / 2 + 2,
      yTop + 2,
      Math.max(0, (barW - 4) * pct),
      12,
      5,
    );
    ctx.fill();

    ctx.font = "900 10px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    const dmgPct = Math.round(this.getLocalDamageRatio() * 100);
    ctx.fillText(
      `HP: ${Math.ceil(this.hp)}/${this.maxHp} • Sát thương bạn: ${dmgPct}% (≥15% nhận thưởng)`,
      this.x,
      yTop - 5,
    );
    ctx.restore();
  }
}
