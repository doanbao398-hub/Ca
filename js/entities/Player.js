import { Creature } from "./Creature.js";
import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import {
  EVOLUTION_FORMS,
  MAX_PLAYER_LEVEL,
  getExpectedEvoStageForLevel,
} from "../data/evolutionTrees.js";
import {
  MAX_SUPER_AUGMENTS,
  SUPER_AUGMENTS,
  COMMON_AUGMENTS,
  getSynergyCounts,
} from "../data/augmentsData.js";
import { TACTICAL_ITEMS } from "../data/itemsData.js";
import { getWorldSize } from "../data/mapsConfig.js";
import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { settings } from "../core/SettingsManager.js";

export function calcXpRequiredForLevel(level) {
  return Math.floor(180 + Math.pow(level, 1.85) * 42);
}

export class Player extends Creature {
  constructor(name, speciesKey, saveUpgrades, selectedMap, savedRun = null) {
    const cfg = SPECIES_CONFIG[speciesKey];
    const worldSize = getWorldSize(selectedMap);
    const startSizeMult = 1 + (saveUpgrades.startSize || 0) * 0.08;
    const spawnX = worldSize / 2 + (Math.random() - 0.5) * 450;
    const spawnY = worldSize / 2 + (Math.random() - 0.5) * 450;

    super(spawnX, spawnY, 22 * startSizeMult, speciesKey, name, true);

    this.cfg = cfg;
    this.selectedMap = selectedMap;
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

    this.speedBonus = (cfg.favMap === selectedMap || selectedMap === "hybrid") ? 0.15 : 0;
    this.loneHunterBonus = 0;
    this.cdrMult = 1.0;
    this.magnetRadius = 35 + (saveUpgrades.gemMagnet || 0) * 30;
    this.bitePower = 1.0;
    this.lifeSteal = 3;
    this.evoStage = 1;
    this.adminSizeBonus = 0;

    this.superAugments = [];
    this.commonAugments = [];
    this.inventory = [null, null, null];
    this.augmentScaleMult = 1.0;
    this.damageReduction = 0;
    this.rageGainMult = 1.0;
    this.boostFreeTimer = 0;

    this.passiveState = {
      highSpeedTime: 0,
      fishPiercingReady: false,
      lowSpeedTime: 0,
      turtleShieldReady: false,
      turtleShieldCd: 0,
      turtleUndyingCd: 0,
      crocAmbushReady: false,
      outOfCombatTime: 0,
      diverNanoShield: false,
      thunderTimer: 0,
      magmaTimer: 0,
      empShockTimer: 0,
      droneTimer: 0,
      radarTimer: 0,
      orbitalTimer: 0,
      crocJawsTimer: 0,
      turtleQuakeCd: 0,
      ultOrbTimer: 0,
    };

    if (savedRun && typeof savedRun.score === "number") {
      this.score = savedRun.score;
      this.level = Math.min(MAX_PLAYER_LEVEL, Math.max(1, savedRun.level || 1));
      this.xp = savedRun.xp || 0;
      this.xpNext = savedRun.xpNext || calcXpRequiredForLevel(this.level);
      this.baseRadius = Math.max(this.baseRadius, savedRun.baseRadius || this.baseRadius);
      this.maxHp = Math.max(this.maxHp, savedRun.maxHp || this.maxHp);
      this.hp = Math.min(this.maxHp, Math.max(20, savedRun.hp || this.maxHp));
      this.cdrMult = savedRun.cdrMult || 1.0;
      this.magnetRadius = Math.max(this.magnetRadius, savedRun.magnetRadius || this.magnetRadius);
      this.bitePower = Math.max(1.0, savedRun.bitePower || 1.0);
      this.lifeSteal = Math.max(3, savedRun.lifeSteal || 3);
      this.bounty = savedRun.bounty || 0;

      if (Array.isArray(savedRun.superAugments)) {
        savedRun.superAugments.slice(0, MAX_SUPER_AUGMENTS).forEach((id) => {
          const aug = SUPER_AUGMENTS.find((a) => a.id === id);
          if (aug) {
            this.superAugments.push(id);
            if (aug.onEquip) aug.onEquip(this);
          }
        });
      }
      if (Array.isArray(savedRun.commonAugments)) {
        savedRun.commonAugments.forEach((id) => {
          const aug = COMMON_AUGMENTS.find((a) => a.id === id);
          if (aug) {
            this.commonAugments.push(id);
            if (aug.apply) aug.apply(this);
          }
        });
      }
      if (Array.isArray(savedRun.inventory)) {
        this.inventory = [
          savedRun.inventory[0] || null,
          savedRun.inventory[1] || null,
          savedRun.inventory[2] || null,
        ];
      }

      const stage = Math.min(EVOLUTION_FORMS.length, Math.max(1, savedRun.evoStage || 1));
      this.applyEvoAppearance(stage);
      this.recalculateRadius();
    }
  }

  addItemToBag(itemId) {
    const emptyIdx = this.inventory.findIndex((x) => !x);
    if (emptyIdx === -1) return false;
    this.inventory[emptyIdx] = itemId;
    eventBus.emit("BAG_UPDATED", this.inventory);
    return true;
  }

  useBagSlot(slotIdx, context) {
    const itemId = this.inventory[slotIdx];
    if (!itemId || !TACTICAL_ITEMS[itemId]) return false;
    this.inventory[slotIdx] = null;
    sound.playSkill();
    TACTICAL_ITEMS[itemId].use(this, context);
    eventBus.emit("BAG_UPDATED", this.inventory);
    return true;
  }

  hasSuperAugment(id) {
    return this.superAugments.includes(id);
  }

  getSynergies() {
    return getSynergyCounts(this.superAugments);
  }

  equipSuperAugment(augId, particleSystem) {
    if (
      this.superAugments.length >= MAX_SUPER_AUGMENTS ||
      this.superAugments.includes(augId)
    ) {
      return false;
    }
    const aug = SUPER_AUGMENTS.find((a) => a.id === augId);
    if (!aug) return false;

    this.superAugments.push(augId);
    if (aug.onEquip) aug.onEquip(this);

    const syn = this.getSynergies();
    if (syn.empowerment === 4 || syn.elemental === 4) {
      this.recalculateRadius();
    }

    if (particleSystem) {
      particleSystem.addShockwave(this.x, this.y, this.radius * 3.5, "#fee440");
      particleSystem.addFloatingText(
        this.x,
        this.y - this.radius - 30,
        `🌟 LÕI SIÊU CẤP: ${aug.name.toUpperCase()}!`,
        "#fee440",
      );
    }
    eventBus.emit("AUGMENTS_UPDATED", this);
    eventBus.emit("FORCE_SYNC_PLAYER");
    return true;
  }

  equipCommonAugment(augObj, particleSystem) {
    if (!augObj) return;
    this.commonAugments.push(augObj.id);
    if (augObj.apply) augObj.apply(this);
    if (particleSystem) {
      particleSystem.addFloatingText(
        this.x,
        this.y - this.radius - 22,
        `✨ ${augObj.name} (${augObj.desc})`,
        "#00f5d4",
      );
    }
    eventBus.emit("AUGMENTS_UPDATED", this);
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

    this.passiveState.outOfCombatTime = 0;
    this.passiveState.diverNanoShield = false;

    if (
      this.species === "turtle" &&
      this.evoStage >= 2 &&
      this.passiveState.turtleShieldReady
    ) {
      this.passiveState.turtleShieldReady = false;
      this.passiveState.turtleShieldCd = 12;
      this.hurtTimer = 0.5;
      sound.playSkill();
      particleSystem.addShockwave(this.x, this.y, this.radius * 2.5, "#00f5d4");
      particleSystem.addFloatingText(
        this.x,
        this.y - this.radius - 20,
        "🛡️ MAI GIÁP HẤP THỤ!",
        "#00f5d4",
      );
      return;
    }

    const syn = this.getSynergies();
    const synDr = syn.empowerment >= 2 ? 0.1 : 0;
    const totalDr = Math.min(0.75, (this.damageReduction || 0) + synDr);
    const finalDmg = Math.max(1, dmg * (1 - totalDr));

    this.hp = Math.max(0, this.hp - finalDmg);
    this.hurtTimer = 0.65;
    sound.playHurt();
    camera.shake = 14;

    const pushAng = Math.atan2(this.y - sourceY, this.x - sourceX);
    this.x += Math.cos(pushAng) * 65;
    this.y += Math.sin(pushAng) * 65;

    particleSystem.addFloatingText(
      this.x,
      this.y - this.radius - 15,
      `-${Math.round(finalDmg)} HP`,
      "#ff4d6d",
    );

    if (
      this.species === "turtle" &&
      this.evoStage >= 8 &&
      this.hp > 0 &&
      this.hp <= this.maxHp * 0.18 &&
      this.passiveState.turtleUndyingCd <= 0
    ) {
      this.passiveState.turtleUndyingCd = 45;
      this.invincibleTimer = 3.5;
      this.heal(this.maxHp * 0.4);
      sound.playEvolution();
      particleSystem.addShockwave(this.x, this.y, this.radius * 4, "#06d6a0");
      particleSystem.addFloatingText(
        this.x,
        this.y - this.radius - 35,
        "🐢 BẤT TỬ HUYỀN VŨ (+40% HP)!",
        "#06d6a0",
      );
    }

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
      camera.shake = clamped >= 8 ? 24 : 16;

      if (clamped >= 8) {
        const rainbowColors = ["#ff006e", "#ffbe0b", "#06d6a0", "#00bbf9", "#8338ec"];
        rainbowColors.forEach((col, idx) => {
          particleSystem.addShockwave(this.x, this.y, this.radius * (2.5 + idx * 0.9), col);
        });
        for (let i = 0; i < 65; i++) {
          particleSystem.addParticle(
            this.x,
            this.y,
            rainbowColors[i % rainbowColors.length],
            Math.random() * 9 + 3,
            6,
          );
        }
      } else {
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
    const syn = this.getSynergies();
    const synScale = syn.empowerment >= 4 ? 1.2 : 1.0;

    const scoreGrowthBonus = Math.min(
      95,
      Math.sqrt(Math.max(0, this.score)) * 0.22,
    );
    const rawRadius =
      (this.baseRadius + scoreGrowthBonus + this.adminSizeBonus) *
      evo.scaleBonus *
      (this.augmentScaleMult || 1.0) *
      synScale *
      ultMult;

    this.radius = Math.min(320, Math.max(18, rawRadius));
  }

  update(dt, context) {
    const {
      input,
      camera,
      width,
      height,
      mapProps,
      shrines,
      worldEvent,
      selectedGameMode,
      selectedMap,
      zoneRadius,
      particleSystem,
    } = context;

    const worldSize = getWorldSize(selectedMap);

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

    // Chiếm Đền Thờ (Domination / Hybrid)
    if (Array.isArray(shrines) && (selectedGameMode === "domination" || selectedMap === "hybrid")) {
      shrines.forEach((sh) => {
        const d = Math.hypot(this.x - sh.x, this.y - sh.y);
        if (d < sh.radius) {
          if (!sh.captured) {
            sh.progress = Math.min(100, sh.progress + 18 * dt);
            if (sh.progress >= 100) {
              sh.captured = true;
              sound.playEvolution();
              particleSystem.addShockwave(sh.x, sh.y, sh.radius, "#06d6a0");
              eventBus.emit("SHOW_BANNER", `⛩️ BẠN ĐÃ CHIẾM ĐƯỢC ${sh.name.toUpperCase()}!`);
            }
          } else {
            this.addScore(35 * dt, worldEvent, selectedMap, particleSystem, camera);
          }
        }
      });
    }

    const wasStealthed = this.isStealthed;
    this.isStealthed = false;
    const stealthRadiusLimit =
      this.species === "croc" && this.evoStage >= 2 ? 160 : 85;

    mapProps.forEach((p) => {
      const d = Math.hypot(this.x - p.x, this.y - p.y);
      if (
        (p.kind === "seaweed_cluster" || p.kind === "mangrove_root") &&
        d < p.size * 0.85 &&
        this.radius < stealthRadiusLimit
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

    if (this.species === "croc" && this.evoStage >= 2) {
      if (this.isStealthed || (wasStealthed && !this.isStealthed)) {
        this.passiveState.crocAmbushReady = true;
      }
    }

    let hasMoveInput = false;
    let moveIntensity = 1.0;
    const sens = settings.data.mouseSensitivity || 1.0;

    // TÁCH BIỆT HOÀN TOÀN 2 CHẾ ĐỘ ĐIỀU KHIỂN: JOYSTICK vs CLICK
    if (input.isJoystickModeActive) {
      if (input.joystick && input.joystick.active && input.joystick.force > 0.05) {
        const targetAngle = Math.atan2(input.joystick.dy, input.joystick.dx);
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.angle += diff * Math.min(1, 0.22 * sens);
        hasMoveInput = true;
        moveIntensity = Math.max(0.35, input.joystick.force);
      }
    } else {
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
        this.angle += diff * Math.min(1, 0.14 * sens);
        hasMoveInput = true;
        moveIntensity = Math.min(1, dist / 95);
      }
    }

    const canBoost = !this.isExhausted && this.stamina > 0;
    const isBoosting =
      input.wantsBoost && canBoost && (hasMoveInput || this.dashTimer > 0);
    let speedMult =
      1 +
      this.speedBonus +
      (this.loneHunterBonus || 0) +
      (this.ultTimer > 0 ? 0.3 : 0);

    if (this.dashTimer > 0) {
      speedMult = 3.2;
      this.animPhase += 0.5;
    } else if (isBoosting) {
      this.boostFreeTimer += dt;
      speedMult *= this.cfg.boostMult;
      const isFreeStamina =
        this.hasSuperAugment("s_jet_engine") && this.boostFreeTimer <= 2.0;
      if (!isFreeStamina) {
        this.stamina = Math.max(0, this.stamina - this.cfg.staminaDrain * dt);
      }
      if (this.stamina <= 0) {
        this.isExhausted = true;
      }
      this.animPhase += 0.34;
      if (Math.random() < 0.35) {
        particleSystem.addParticle(
          this.x,
          this.y,
          this.evoStage >= 8 ? `hsl(${(Date.now() * 0.2) % 360}, 100%, 60%)` : "#fff",
          1,
          Math.random() * 4 + 2,
          true,
        );
      }
    } else {
      this.boostFreeTimer = 0;
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + this.cfg.staminaRegen * dt,
      );
      if (this.isExhausted && this.stamina >= this.maxStamina * 0.28) {
        this.isExhausted = false;
      }
      this.animPhase += 0.16;
    }

    // Hạt hào quang cầu vồng rơi phía sau khi đạt Dạng 8
    if (this.evoStage >= 8 && Math.random() < 0.45) {
      const rainbowHue = (Date.now() * 0.22 + Math.random() * 60) % 360;
      particleSystem.addParticle(
        this.x - Math.cos(this.angle) * this.radius * 0.8 + (Math.random() - 0.5) * this.radius,
        this.y - Math.sin(this.angle) * this.radius * 0.8 + (Math.random() - 0.5) * this.radius,
        `hsl(${rainbowHue}, 100%, 62%)`,
        1.5,
        Math.random() * 4 + 2.5,
        false,
      );
    }

    const maxSpeed = this.cfg.baseSpeed * speedMult;
    const moveSpeed =
      this.dashTimer > 0
        ? maxSpeed
        : hasMoveInput
          ? maxSpeed * (isBoosting ? 1.0 : moveIntensity)
          : 0;

    const frameScale = dt * 60;
    this.x += Math.cos(this.angle) * moveSpeed * frameScale;
    this.y += Math.sin(this.angle) * moveSpeed * frameScale;

    if (worldEvent && worldEvent.type === "storm") {
      this.x += 1.2 * frameScale;
    }

    this.x = Math.max(this.radius, Math.min(worldSize - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldSize - this.radius, this.y));

    if (selectedGameMode === "royale") {
      const distFromCenter = Math.hypot(
        this.x - worldSize / 2,
        this.y - worldSize / 2,
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
      (selectedMap === "swamp" || selectedMap === "hybrid") &&
      this.species === "croc"
        ? 1.2
        : 1.0;
    const gained = Math.round(pts * this.cfg.scoreMult * eventMult * mapBonus);

    const syn = this.getSynergies();
    const synRageBonus = syn.elemental >= 2 ? 1.25 : 1.0;

    this.score += gained;
    this.xp += gained;
    this.rage = Math.min(
      100,
      this.rage + 6 * (this.rageGainMult || 1) * synRageBonus,
    );
    this.eatAnim = 1;

    this.recalculateRadius();

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
