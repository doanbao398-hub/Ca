import { Creature } from "./Creature.js";
import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import {
  EVOLUTION_FORMS,
  MAX_PLAYER_LEVEL,
  getExpectedEvoStageForLevel,
} from "../data/evolutionTrees.js";
import { WORLD_SIZE } from "../data/mapsConfig.js";
import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";

export function calcXpRequiredForLevel(level) {
  // Cày cấp thử thách dần từ Lv.1 -> Lv.100
  return Math.floor(180 + Math.pow(level, 1.85) * 42);
}

export class Player extends Creature {
  constructor(name, speciesKey, saveUpgrades, selectedMap, savedRun = null) {
    const cfg = SPECIES_CONFIG[speciesKey];
    const startSizeMult = 1 + (saveUpgrades.startSize || 0) * 0.08;
    const spawnX = WORLD_SIZE / 2 + (Math.random() - 0.5) * 450;
    const spawnY = WORLD_SIZE / 2 + (Math.random() - 0.5) * 450;

    super(spawnX, spawnY, 22 * startSizeMult, speciesKey, name, true);

    this.cfg = cfg;
    this.score = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = calcXpRequiredForLevel(1);

    this.maxHp = cfg.maxHp + (saveUpgrades.maxHpBonus || 0) * 25;
    this.hp = this.maxHp;
    this.hurtTimer = 0;

    this.maxStamina = cfg.maxStamina;
    this.stamina = this.maxStamina;
    this.isExhausted = false;

    this.skillCooldownTimer = 0;
    this.invincibleTimer = 3.0;
    this.dashTimer = 0;
    this.rage = 0;
    this.ultTimer = 0;

    this.speedBonus = cfg.favMap === selectedMap ? 0.15 : 0;
    this.cdrMult = 1.0;
    this.magnetRadius = 35 + (saveUpgrades.gemMagnet || 0) * 30;
    this.bitePower = 1.0;
    this.lifeSteal = 3;
    this.evoStage = 1;
    this.adminSizeBonus = 0;

    if (savedRun && typeof savedRun.score === "number") {
      this.score = savedRun.score;
      this.level = Math.min(MAX_PLAYER_LEVEL, Math.max(1, savedRun.level || 1));
      this.xp = savedRun.xp || 0;
      this.xpNext = savedRun.xpNext || calcXpRequiredForLevel(this.level);
      this.baseRadius = Math.max(
        this.baseRadius,
        savedRun.baseRadius || this.baseRadius,
      );
      this.maxHp = Math.max(this.maxHp, savedRun.maxHp || this.maxHp);
      this.hp = Math.min(this.maxHp, Math.max(20, savedRun.hp || this.maxHp));
      this.cdrMult = savedRun.cdrMult || 1.0;
      this.magnetRadius = Math.max(
        this.magnetRadius,
        savedRun.magnetRadius || this.magnetRadius,
      );
      this.bitePower = Math.max(1.0, savedRun.bitePower || 1.0);
      this.lifeSteal = Math.max(3, savedRun.lifeSteal || 3);
      this.bounty = savedRun.bounty || 0;

      const extraSpeed = Math.max(0, (savedRun.speedBonus || 0) - 0.15);
      this.speedBonus = (cfg.favMap === selectedMap ? 0.15 : 0) + extraSpeed;

      const stage = Math.min(
        EVOLUTION_FORMS.length,
        Math.max(1, savedRun.evoStage || 1),
      );
      this.applyEvoAppearance(stage);
      this.recalculateRadius();
    }
  }

  useUltimate(particleSystem, camera) {
    if (this.rage < 100 || this.ultTimer > 0) return;
    this.rage = 0;
    this.ultTimer = 6.5;
    sound.playEvolution();
    camera.shake = 18;
    eventBus.emit("HIT_STOP", 0.05);

    particleSystem.addShockwave(this.x, this.y, this.radius * 6, "#ff006e");
    particleSystem.addFloatingText(
      this.x,
      this.y - this.radius - 30,
      "🔥 HÓA THẦN NỘ KHÍ! 🔥",
      "#ff006e",
    );
    this.recalculateRadius();
    eventBus.emit("FORCE_SYNC_PLAYER");
  }

  takeDamage(dmg, sourceX, sourceY, attackerName, particleSystem, camera) {
    if (this.hurtTimer > 0 || this.invincibleTimer > 0 || this.ultTimer > 0) {
      return;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtTimer = 0.65;
    sound.playHurt();
    camera.shake = 14;

    const pushAng = Math.atan2(this.y - sourceY, this.x - sourceX);
    this.x += Math.cos(pushAng) * 65;
    this.y += Math.sin(pushAng) * 65;

    particleSystem.addFloatingText(
      this.x,
      this.y - this.radius - 15,
      `-${Math.round(dmg)} HP`,
      "#ff4d6d",
    );

    eventBus.emit("FORCE_SYNC_PLAYER");

    if (this.hp <= 0) {
      eventBus.emit("PLAYER_DIED", attackerName);
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  setEvoStage(targetStage, particleSystem, camera, silent = false) {
    const maxStage = EVOLUTION_FORMS.length;
    const clamped = Math.min(maxStage, Math.max(1, targetStage));
    if (clamped === this.evoStage && !silent) return;

    this.evoStage = clamped;
    const evo = EVOLUTION_FORMS[this.evoStage - 1];
    this.applyEvoAppearance(this.evoStage);
    this.recalculateRadius();

    if (!silent && particleSystem && camera) {
      this.maxHp += 35;
      this.heal(this.maxHp * 0.65);
      this.bitePower += 0.15;

      sound.playEvolution();
      camera.shake = 16;

      particleSystem.addShockwave(this.x, this.y, this.radius * 4.5, "#fee440");
      for (let i = 0; i < 35; i++) {
        particleSystem.addParticle(
          this.x,
          this.y,
          this.colors.primary,
          Math.random() * 7 + 2,
          5,
        );
      }
      particleSystem.addFloatingText(
        this.x,
        this.y - this.radius - 35,
        `✨ TIẾN HÓA: ${evo.title.toUpperCase()}! ✨`,
        "#fee440",
      );
    }

    eventBus.emit("PLAYER_EVOLVED", { stage: this.evoStage, title: evo.title });
    eventBus.emit("FORCE_SYNC_PLAYER");
  }

  evolveNextStage(particleSystem, camera) {
    if (this.evoStage >= EVOLUTION_FORMS.length) return;
    this.setEvoStage(this.evoStage + 1, particleSystem, camera, false);
  }

  setLevel(targetLevel, particleSystem, camera) {
    const clamped = Math.min(
      MAX_PLAYER_LEVEL,
      Math.max(1, Math.round(targetLevel)),
    );
    this.level = clamped;
    this.xp = 0;
    this.xpNext = calcXpRequiredForLevel(this.level);

    // Cập nhật chỉ số nền tương ứng cấp độ
    this.baseRadius = Math.min(135, 22 + (this.level - 1) * 0.95);
    this.maxHp = this.cfg.maxHp + (this.level - 1) * 14;
    this.hp = this.maxHp;
    this.bitePower = 1.0 + (this.level - 1) * 0.03;

    const expectedStage = getExpectedEvoStageForLevel(this.level);
    if (expectedStage > this.evoStage) {
      this.setEvoStage(expectedStage, particleSystem, camera, false);
    } else {
      this.recalculateRadius();
      eventBus.emit("FORCE_SYNC_PLAYER");
    }
  }

  recalculateRadius() {
    const evo =
      EVOLUTION_FORMS[this.evoStage - 1] ||
      EVOLUTION_FORMS[EVOLUTION_FORMS.length - 1];
    const ultMult = this.ultTimer > 0 ? 1.18 : 1.0;

    // Điểm số càng cao -> Kích thước tăng tiến liên tục (lên tới +95px từ điểm)
    const scoreGrowthBonus = Math.min(
      95,
      Math.sqrt(Math.max(0, this.score)) * 0.22,
    );
    const rawRadius =
      (this.baseRadius + scoreGrowthBonus + this.adminSizeBonus) *
      evo.scaleBonus *
      ultMult;

    // Giới hạn kích cỡ khổng lồ lên tới 320px bán kính (đường kính 640px)
    this.radius = Math.min(320, Math.max(18, rawRadius));
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
    if (this.chatBubbleTimer > 0)
      this.chatBubbleTimer = Math.max(0, this.chatBubbleTimer - dt);

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
        this.radius < 85
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
          true,
        );
      }
    } else {
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + this.cfg.staminaRegen * dt,
      );
      if (this.isExhausted && this.stamina >= this.maxStamina * 0.28) {
        this.isExhausted = false;
      }
      this.animPhase += 0.16;
    }

    const maxSpeed = this.cfg.baseSpeed * speedMult;
    const moveSpeed =
      this.dashTimer > 0 ? maxSpeed : Math.min(dist * 0.052, maxSpeed);

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
        this.y - WORLD_SIZE / 2,
      );
      if (distFromCenter > zoneRadius) {
        this.hp -= 12 * dt;
        if (this.hp <= 0) eventBus.emit("PLAYER_DIED", "Vòng Bo Độc");
      }
    }

    if (this.eatAnim > 0) this.eatAnim = Math.max(0, this.eatAnim - 0.06);
  }

  addScore(pts, worldEvent, selectedMap, particleSystem = null, camera = null) {
    const eventMult = worldEvent && worldEvent.type === "bloodmoon" ? 2.0 : 1.0;
    const mapBonus =
      selectedMap === "swamp" && this.species === "croc" ? 1.2 : 1.0;
    const gained = Math.round(pts * this.cfg.scoreMult * eventMult * mapBonus);

    this.score += gained;
    this.xp += gained;
    this.rage = Math.min(100, this.rage + 6);
    this.eatAnim = 1;

    // Cập nhật kích thước liên tục theo điểm số
    this.recalculateRadius();

    // Lên cấp (tối đa Lv.100)
    let leveledUp = false;
    while (this.xp >= this.xpNext && this.level < MAX_PLAYER_LEVEL) {
      this.level++;
      this.xp -= this.xpNext;
      this.xpNext = calcXpRequiredForLevel(this.level);

      this.baseRadius = Math.min(135, this.baseRadius + 0.95);
      this.maxHp += 12;
      this.heal(25);
      this.bitePower += 0.025;
      leveledUp = true;

      // Tự động mở khóa chuẩn tiến hóa mới khi đạt mốc cấp độ tương ứng
      const expectedStage = getExpectedEvoStageForLevel(this.level);
      if (expectedStage > this.evoStage) {
        this.setEvoStage(expectedStage, particleSystem, camera, false);
      }
    }

    if (this.level >= MAX_PLAYER_LEVEL) {
      this.xp = this.xpNext;
    }

    if (leveledUp) {
      this.recalculateRadius();
      eventBus.emit("PLAYER_LEVEL_UP", this.level);
    }
  }
}
