import { Creature } from "./Creature.js";
import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";
import { WORLD_SIZE } from "../data/mapsConfig.js";
import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";

export class Player extends Creature {
  constructor(name, speciesKey, saveUpgrades, selectedMap) {
    const cfg = SPECIES_CONFIG[speciesKey];
    const startSizeMult = 1 + (saveUpgrades.startSize || 0) * 0.08;
    const spawnX = WORLD_SIZE / 2 + (Math.random() - 0.5) * 450;
    const spawnY = WORLD_SIZE / 2 + (Math.random() - 0.5) * 450;

    super(spawnX, spawnY, 22 * startSizeMult, speciesKey, name, true);

    this.cfg = cfg;
    this.score = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 110;

    this.maxHp = cfg.maxHp + (saveUpgrades.maxHpBonus || 0) * 20;
    this.hp = this.maxHp;
    this.hurtTimer = 0;

    // FIX LỖI THANH THỂ LỰC / NỘ KHI GIỮ CHUỘT BƠI NHANH:
    // Thêm trạng thái isExhausted: khi cạn sạch stamina (<= 0), người chơi bắt buộc
    // phải đợi hồi tối thiểu 25% thanh thể lực mới được boost tiếp (tránh nhấp nháy 0->0.4->0 liên tục).
    this.maxStamina = cfg.maxStamina;
    this.stamina = this.maxStamina;
    this.isExhausted = false;

    this.skillCooldownTimer = 0;
    this.invincibleTimer = 0;
    this.dashTimer = 0;
    this.rage = 0;
    this.ultTimer = 0;

    this.speedBonus = cfg.favMap === selectedMap ? 0.15 : 0;
    this.cdrMult = 1.0;
    this.magnetRadius = 35 + (saveUpgrades.gemMagnet || 0) * 25;
    this.bitePower = 1.0;
    this.lifeSteal = 3;
    this.evoStage = 1;
  }

  useUltimate(particleSystem, camera) {
    if (this.rage < 100 || this.ultTimer > 0) return;
    this.rage = 0;
    this.ultTimer = 6.0;
    sound.playEvolution();
    camera.shake = 18;
    eventBus.emit("HIT_STOP", 0.05);

    particleSystem.addShockwave(this.x, this.y, this.radius * 8, "#ff006e");
    particleSystem.addFloatingText(
      this.x,
      this.y - this.radius - 30,
      "🔥 HÓA THẦN NỘ KHÍ! 🔥",
      "#ff006e"
    );
    this.recalculateRadius();
  }

  takeDamage(dmg, sourceX, sourceY, attackerName, particleSystem, camera) {
    if (this.hurtTimer > 0 || this.invincibleTimer > 0 || this.ultTimer > 0) {
      return;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtTimer = 1.1;
    sound.playHurt();
    camera.shake = 14;

    const pushAng = Math.atan2(this.y - sourceY, this.x - sourceX);
    this.x += Math.cos(pushAng) * 80;
    this.y += Math.sin(pushAng) * 80;

    particleSystem.addFloatingText(
      this.x,
      this.y - this.radius - 15,
      `-${Math.round(dmg)} HP`,
      "#ff4d6d"
    );

    if (this.hp <= 0) {
      eventBus.emit("PLAYER_DIED", attackerName);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  evolveNextStage(particleSystem, camera) {
    if (this.evoStage >= 4) return;
    this.evoStage++;
    const evo = EVOLUTION_FORMS[this.evoStage - 1];
    this.recalculateRadius();
    if (evo.tint) this.colors = { ...evo.tint };

    this.heal(this.maxHp * 0.5);
    sound.playEvolution();
    camera.shake = 16;

    particleSystem.addShockwave(this.x, this.y, this.radius * 6, "#fee440");
    for (let i = 0; i < 35; i++) {
      particleSystem.addParticle(
        this.x,
        this.y,
        this.colors.primary,
        Math.random() * 7 + 2,
        5
      );
    }
    particleSystem.addFloatingText(
      this.x,
      this.y - this.radius - 35,
      `✨ TIẾN HÓA: ${evo.title.toUpperCase()}! ✨`,
      "#fee440"
    );

    eventBus.emit("PLAYER_EVOLVED", { stage: this.evoStage, title: evo.title });
  }

  recalculateRadius() {
    const evoMult = EVOLUTION_FORMS[this.evoStage - 1].scaleBonus;
    const ultMult = this.ultTimer > 0 ? 1.25 : 1.0;
    this.radius = Math.min(155, this.baseRadius * evoMult * ultMult);
  }

  update(dt, context) {
    const {
      input,
      camera,
      width,
      height,
      mapProps,
      worldEvent,
      selectedGameMode,
      selectedMap,
      zoneRadius,
      particleSystem,
    } = context;

    if (this.skillCooldownTimer > 0)
      this.skillCooldownTimer = Math.max(0, this.skillCooldownTimer - dt);
    if (this.invincibleTimer > 0)
      this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - dt);
    if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.emoteTimer > 0)
      this.emoteTimer = Math.max(0, this.emoteTimer - dt);
    if (this.ultTimer > 0) {
      this.ultTimer = Math.max(0, this.ultTimer - dt);
      if (this.ultTimer === 0) this.recalculateRadius();
    }

    this.isStealthed = false;
    mapProps.forEach((p) => {
      const d = Math.hypot(this.x - p.x, this.y - p.y);
      if (
        (p.kind === "seaweed_cluster" || p.kind === "mangrove_root") &&
        d < p.size * 0.85 &&
        this.radius < 65
      ) {
        this.isStealthed = true;
      }
      if (p.kind === "shipwreck" || p.kind === "ancient_pillar") {
        const colR = p.kind === "shipwreck" ? p.size * 0.65 : 28;
        if (d < this.radius + colR && d > 0) {
          const pushAng = Math.atan2(this.y - p.y, this.x - p.x);
          const overlap = this.radius + colR - d;
          this.x += Math.cos(pushAng) * overlap;
          this.y += Math.sin(pushAng) * overlap;
        }
      }
    });

    const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
    const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;
    const dx = worldMouseX - this.x;
    const dy = worldMouseY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * 0.14;
    }

    // XỬ LÝ BƠI NHANH (BOOST) & THỂ LỰC CHUẨN XÁC THEO DT
    const canBoost = !this.isExhausted && this.stamina > 0;
    const isBoosting = input.wantsBoost && canBoost && dist > 15;
    let speedMult = 1 + this.speedBonus + (this.ultTimer > 0 ? 0.3 : 0);

    if (this.dashTimer > 0) {
      speedMult = 3.2;
      this.animPhase += 0.5;
    } else if (isBoosting) {
      speedMult *= this.cfg.boostMult;
      this.stamina = Math.max(0, this.stamina - this.cfg.staminaDrain * dt);
      if (this.stamina <= 0) {
        this.isExhausted = true;
      }
      this.animPhase += 0.34;
      if (Math.random() < 0.35) {
        particleSystem.addParticle(
          this.x,
          this.y,
          "#fff",
          1,
          Math.random() * 4 + 2,
          true
        );
      }
    } else {
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + this.cfg.staminaRegen * dt
      );
      if (this.isExhausted && this.stamina >= this.maxStamina * 0.28) {
        this.isExhausted = false;
      }
      this.animPhase += 0.16;
    }

    const maxSpeed = this.cfg.baseSpeed * speedMult;
    const moveSpeed =
      this.dashTimer > 0 ? maxSpeed : Math.min(dist * 0.052, maxSpeed);

    // Chuẩn hóa vận tốc theo 60fps (dt * 60) để tốc độ ổn định trên mọi màn hình 60Hz/120Hz/144Hz
    const frameScale = dt * 60;
    this.x += Math.cos(this.angle) * moveSpeed * frameScale;
    this.y += Math.sin(this.angle) * moveSpeed * frameScale;

    if (worldEvent && worldEvent.type === "storm") {
      this.x += 1.2 * frameScale;
    }

    this.x = Math.max(this.radius, Math.min(WORLD_SIZE - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(WORLD_SIZE - this.radius, this.y));

    if (selectedGameMode === "royale") {
      const distFromCenter = Math.hypot(
        this.x - WORLD_SIZE / 2,
        this.y - WORLD_SIZE / 2
      );
      if (distFromCenter > zoneRadius) {
        this.hp -= 12 * dt;
        if (this.hp <= 0) eventBus.emit("PLAYER_DIED", "Vòng Bo Độc");
      }
    }

    if (this.eatAnim > 0) this.eatAnim = Math.max(0, this.eatAnim - 0.06);
  }

  addScore(pts, worldEvent, selectedMap) {
    const eventMult = worldEvent && worldEvent.type === "bloodmoon" ? 2.0 : 1.0;
    const mapBonus =
      selectedMap === "swamp" && this.species === "croc" ? 1.2 : 1.0;
    const gained = Math.round(pts * this.cfg.scoreMult * eventMult * mapBonus);

    this.score += gained;
    this.xp += gained;
    this.rage = Math.min(100, this.rage + 7);
    this.eatAnim = 1;

    if (this.xp >= this.xpNext) {
      this.level++;
      this.xp -= this.xpNext;
      this.xpNext = Math.floor(this.xpNext * 1.42);
      this.baseRadius = Math.min(82, this.baseRadius + 3.2);
      this.recalculateRadius();
      eventBus.emit("PLAYER_LEVEL_UP", this.level);
    }
  }
}
