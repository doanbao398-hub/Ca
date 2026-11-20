import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { getCounterMultiplier } from "../data/speciesConfig.js";
import { renderCreatureBody } from "../graphics/CreatureRenderer.js";
import { getWorldSize } from "../data/mapsConfig.js";

function smoothRotate(currentAngle, targetAngle, turnRate) {
  let diff = targetAngle - currentAngle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return currentAngle + diff * Math.min(1, turnRate);
}

function calcLevelProgress(level) {
  const lvl = Math.min(100, Math.max(1, level || 1));
  return (lvl - 1) / 99; // 0.0 tại Lv.1 -> 1.0 tại Lv.100
}

export class TimeFishSystem {
  constructor() {
    this.historyBuffer = [];
    this.clones = [];
    this.futureMarks = [];
    this.stasisOrbs = [];
    this.stasisCages = [];
    this.domain = null;
    this.rewindEffects = [];
    this.recordTimer = 0;
  }

  clear() {
    this.historyBuffer = [];
    this.clones = [];
    this.futureMarks = [];
    this.stasisOrbs = [];
    this.stasisCages = [];
    this.domain = null;
    this.rewindEffects = [];
    this.recordTimer = 0;
  }

  isInsideDomain(entity) {
    if (!this.domain || !entity) return false;
    return (
      Math.hypot(entity.x - this.domain.x, entity.y - this.domain.y) <=
      this.domain.radius
    );
  }

  isEntityFrozenInCage(entity) {
    if (!entity) return false;
    return this.stasisCages.some(
      (cage) =>
        Math.hypot(entity.x - cage.x, entity.y - cage.y) <=
        cage.radius + (entity.radius || 20) * 0.5,
    );
  }

  triggerTimePulseSteal(player, target, particleSystem) {
    if (!player || player.species !== "time" || !target) return;

    player.skillCooldownTimer = Math.max(0, player.skillCooldownTimer - 1.0);
    player.skill2CooldownTimer = Math.max(0, player.skill2CooldownTimer - 1.0);
    player.skill3CooldownTimer = Math.max(0, player.skill3CooldownTimer - 1.0);

    if (typeof target.stunTimer === "number") {
      target.stunTimer = Math.max(target.stunTimer, 0.45);
    }

    if (particleSystem && Math.random() < 0.65) {
      particleSystem.addFloatingText(
        target.x,
        target.y - (target.radius || 20) - 10,
        "⏳ -1s THỜI GIAN!",
        "#fbbf24",
      );
    }
  }

  damageBossIfHit(boss, cx, cy, hitRadius, dmg, player, particleSystem, camera) {
    if (!boss || boss.hp <= 0) return false;
    if (Math.hypot(boss.x - cx, boss.y - cy) <= hitRadius + boss.radius) {
      boss.hp -= dmg;
      boss.stunTimer = Math.max(boss.stunTimer || 0, 0.8);
      this.triggerTimePulseSteal(player, boss, particleSystem);
      particleSystem.addFloatingText(
        boss.x,
        boss.y - boss.radius - 14,
        `⏳ -${Math.round(dmg)} BOSS!`,
        "#fef08a",
      );
      if (boss.hp <= 0) {
        player.addScore(
          2500,
          null,
          player.selectedMap,
          particleSystem,
          camera,
        );
        sound.playEvolution();
        particleSystem.addShockwave(boss.x, boss.y, 450, "#ff006e");
        eventBus.emit(
          "SHOW_BANNER",
          "🏆 BẠN ĐÃ HẠ GỤC LEVIATHAN BẰNG NGHỊCH LÝ THỜI GIAN (+2500 XP)!",
        );
        eventBus.emit("BOSS_KILLED");
      }
      return true;
    }
    return false;
  }

  accumulateParadoxDamage(targetId, targetObj, rawDmg) {
    let absorbed = false;
    this.stasisCages.forEach((cage) => {
      if (
        Math.hypot(targetObj.x - cage.x, targetObj.y - cage.y) <=
        cage.radius + (targetObj.radius || 20)
      ) {
        const prev = cage.storedDamage.get(targetId) || {
          target: targetObj,
          dmg: 0,
        };
        prev.dmg += rawDmg;
        cage.storedDamage.set(targetId, prev);
        absorbed = true;
      }
    });
    return absorbed;
  }

  // SKILL 1 [E]: DÒNG CHẢY ĐA CHIỀU (Bản Thể Quá Khứ 0.5x & Bản Thể Tương Lai 2.0x)
  triggerSkill1(player, context) {
    if (!player || player.skillCooldownTimer > 0) return;
    const { enemies, remotePlayers, boss, particleSystem, camera } = context;

    const inside = this.isInsideDomain(player);
    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
    const domainCdr = inside ? 0.5 : 1.0;

    player.skillCooldownTimer =
      player.cfg.skillCooldown * player.cdrMult * synCdr * domainCdr;

    const lvl = Math.min(100, Math.max(1, player.level));
    const t = calcLevelProgress(lvl);
    const passiveBonus = player.evoStage >= 4 ? 1.5 : 0;
    const duration = Number((6.5 + t * 7.5 + passiveBonus).toFixed(1));
    const domainBoost = inside ? 1.25 : 1.0;

    const pairCount = lvl >= 60 ? 2 : 1;

    this.clones = [];
    for (let p = 0; p < pairCount; p++) {
      const sideSign = p === 0 ? 1 : -1;
      const spreadAngle = sideSign * 0.95;

      const pastScale = 0.5;
      this.clones.push({
        uid: `past_${p}`,
        type: "past",
        scaleMult: pastScale,
        sideSign: -sideSign,
        isRealEntity: inside,
        x:
          player.x +
          Math.cos(player.angle - spreadAngle) * (player.radius * 1.6),
        y:
          player.y +
          Math.sin(player.angle - spreadAngle) * (player.radius * 1.6),
        vx: 0,
        vy: 0,
        angle: player.angle,
        radius: Math.max(16, player.radius * pastScale),
        timer: duration,
        maxTimer: duration,
        damageRatio: pastScale * domainBoost,
        biteCd: 0,
        skillCd: 0.6,
        backOffTimer: 0,
        animPhase: 0,
      });

      const futureScale = 2.0;
      this.clones.push({
        uid: `future_${p}`,
        type: "future",
        scaleMult: futureScale,
        sideSign: sideSign,
        isRealEntity: inside,
        x:
          player.x +
          Math.cos(player.angle + spreadAngle) * (player.radius * 2.2),
        y:
          player.y +
          Math.sin(player.angle + spreadAngle) * (player.radius * 2.2),
        vx: 0,
        vy: 0,
        angle: player.angle,
        radius: Math.min(340, player.radius * futureScale),
        timer: duration,
        maxTimer: duration,
        damageRatio: futureScale * domainBoost,
        markCd: 0.8 + p * 0.4,
        biteCd: 0,
        skillCd: 0.4,
        backOffTimer: 0,
        animPhase: Math.PI,
      });
    }

    const auraRadius = Math.round(240 + t * 560);
    this.clones.forEach((c) => {
      particleSystem.addShockwave(
        c.x,
        c.y,
        c.radius * 3.0 + t * 220,
        c.type === "past" ? "#f59e0b" : "#2dd4bf",
      );
    });

    if (inside) {
      this.pulseCloneEchoAttack(
        player,
        enemies,
        remotePlayers,
        boss,
        particleSystem,
        camera,
      );
    }

    sound.playSkill();
    camera.shake = 12;
    particleSystem.addShockwave(player.x, player.y, auraRadius, "#f59e0b");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 26,
      `⏳ QUÁ KHỨ (0.5x) & TƯƠNG LAI KHỔNG LỒ (2.0x)!`,
      "#fef08a",
    );

    // Đồng bộ hiệu ứng phân thân & xung chấn thời gian cho toàn phòng Online
    eventBus.emit("SKILL_BROADCAST", {
      type: "time_clones",
      x: player.x,
      y: player.y,
      maxR: auraRadius,
      duration,
      clones: this.clones.map((c) => ({
        x: Math.round(c.x),
        y: Math.round(c.y),
        r: Math.round(c.radius),
        type: c.type,
      })),
      color: "#f59e0b",
    });
    eventBus.emit("SKILL_USED_FOR_QUEST");
  }

  pulseCloneEchoAttack(
    player,
    enemies,
    remotePlayers,
    boss,
    particleSystem,
    camera,
  ) {
    const t = calcLevelProgress(player.level);
    this.clones.forEach((c) => {
      const blastR = Math.round(c.radius * 3.2 + t * 260);
      const dmg = Math.round(36 * player.bitePower * c.damageRatio);

      this.damageBossIfHit(
        boss,
        c.x,
        c.y,
        blastR,
        dmg * 1.4,
        player,
        particleSystem,
        camera,
      );

      for (let k = enemies.length - 1; k >= 0; k--) {
        const e = enemies[k];
        if (Math.hypot(e.x - c.x, e.y - c.y) <= blastR + e.radius) {
          if (c.radius >= e.radius * 0.9 || c.type === "future") {
            const pts = Math.ceil(e.radius * 1.5 * c.scaleMult);
            player.addScore(
              pts,
              null,
              player.selectedMap,
              particleSystem,
              camera,
            );
            enemies.splice(k, 1);
          } else {
            e.radius = Math.max(10, e.radius * 0.75);
            e.stunTimer = 0.9;
          }
          this.triggerTimePulseSteal(player, e, particleSystem);
        }
      }

      Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
        if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
        if (Math.hypot(rp.x - c.x, rp.y - c.y) <= blastR + rp.radius) {
          const mult = getCounterMultiplier(player.species, rp.species);
          const finalDmg = Math.round(dmg * mult);
          this.triggerTimePulseSteal(player, rp, particleSystem);
          if (!this.accumulateParadoxDamage(id, rp, finalDmg)) {
            eventBus.emit("PVP_ATTACK", {
              targetId: id,
              dmg: finalDmg,
              isCrit: true,
              fromX: c.x,
              fromY: c.y,
              attackerName: `${player.name} (${c.type === "past" ? "Quá Khứ 0.5x" : "Tương Lai 2x"})`,
              targetX: rp.x,
              targetY: rp.y,
            });
          }
        }
      });
    });
  }

  castCloneStasisSkill(clone, player, targetEntity, particleSystem) {
    const t = calcLevelProgress(player.level);
    const aimAngle = Math.atan2(
      targetEntity.y - clone.y,
      targetEntity.x - clone.x,
    );
    const scale = clone.scaleMult;

    // Phạm vi Lồng Giam tăng theo cấp độ (Lv.1 = 210px -> Lv.100 = 760px)
    const baseCageR = 210 + t * 550;
    const baseDuration = 3.0 + t * 2.4;
    const maxRange = Math.round((520 + t * 950) * (scale === 2.0 ? 1.3 : 0.85));

    this.stasisOrbs.push({
      x: clone.x + Math.cos(aimAngle) * (clone.radius + 10),
      y: clone.y + Math.sin(aimAngle) * (clone.radius + 10),
      angle: aimAngle,
      speed: 13.5,
      r: Math.max(10, Math.round(18 * scale)),
      traveled: 0,
      maxRange,
      cageRadius: Math.round(baseCageR * scale),
      cageDuration: Number(
        (baseDuration * (scale === 2.0 ? 1.2 : 0.85)).toFixed(1),
      ),
      ownerTag: clone.type,
    });

    particleSystem.addFloatingText(
      clone.x,
      clone.y - clone.radius - 14,
      clone.type === "future"
        ? "⌛ LỒNG GIAM KHỔNG LỒ (2x)!"
        : "⏳ Lồng Giam Mini (0.5x)",
      clone.type === "future" ? "#2dd4bf" : "#f59e0b",
    );
  }

  findBestTargetForClone(
    clone,
    player,
    enemies,
    remotePlayers,
    boss,
    reservedTargets,
  ) {
    const t = calcLevelProgress(player.level);
    const searchRange = (clone.type === "future" ? 1350 : 900) + t * 650;
    let bestTarget = null;
    let bestScore = Infinity;

    if (boss && boss.hp > 0) {
      const distBoss = Math.hypot(boss.x - clone.x, boss.y - clone.y);
      if (distBoss <= searchRange) {
        bestScore = distBoss * 0.7 - (clone.type === "future" ? 420 : 120);
        bestTarget = { kind: "boss", id: "boss", entity: boss };
      }
    }

    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
      const distFromClone = Math.hypot(rp.x - clone.x, rp.y - clone.y);
      const distFromPlayer = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (distFromPlayer > searchRange && distFromClone > searchRange) return;

      const penalty = reservedTargets.has(`p_${id}`) ? 280 : 0;
      const priorityBonus = clone.type === "future" ? -380 : -150;
      const score =
        distFromClone * 0.8 + distFromPlayer * 0.2 + priorityBonus + penalty;
      if (score < bestScore) {
        bestScore = score;
        bestTarget = { kind: "player", id, entity: rp };
      }
    });

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || e.radius <= 8) continue;
      const distFromClone = Math.hypot(e.x - clone.x, e.y - clone.y);
      const distFromPlayer = Math.hypot(e.x - player.x, e.y - player.y);
      if (distFromPlayer > searchRange && distFromClone > searchRange) continue;

      const penalty = reservedTargets.has(e) ? 260 : 0;
      const sizePreference =
        clone.type === "future" ? -e.radius * 2.2 : e.radius * 0.8;
      const score =
        distFromClone * 0.85 + distFromPlayer * 0.15 + sizePreference + penalty;

      if (score < bestScore) {
        bestScore = score;
        bestTarget = { kind: "bot", id: null, entity: e };
      }
    }

    if (bestTarget) {
      reservedTargets.add(
        bestTarget.kind === "player" ? `p_${bestTarget.id}` : bestTarget.entity,
      );
    }
    return bestTarget;
  }

  // SKILL 2 [Q]: CẦU NGƯNG ĐỌNG & LỒNG GIAM THỜI GIAN (Phạm vi tăng theo cấp Lv.1 -> Lv.100)
  triggerSkill2(player, context) {
    if (!player || player.skill2CooldownTimer > 0) return;
    const { particleSystem, camera, input, width, height } = context;

    const inside = this.isInsideDomain(player);
    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
    const domainCdr = inside ? 0.5 : 1.0;

    player.skill2CooldownTimer = 8.5 * player.cdrMult * synCdr * domainCdr;

    const t = calcLevelProgress(player.level);
    const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
    const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;
    const aimAngle = input.isJoystickModeActive
      ? player.angle
      : Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

    // Tầm bay & bán kính Lồng Giam tăng theo cấp: Lv.1 = 220px -> Lv.100 = 820px
    const maxRange = Math.round(540 + t * 1100);
    const cageRadius = Math.round(220 + t * 600);
    const cageDuration = Number((3.4 + t * 2.6).toFixed(1));

    this.stasisOrbs.push({
      x: player.x + Math.cos(aimAngle) * (player.radius + 14),
      y: player.y + Math.sin(aimAngle) * (player.radius + 14),
      angle: aimAngle,
      speed: 12.5,
      r: Math.round(18 + t * 16),
      traveled: 0,
      maxRange,
      cageRadius,
      cageDuration,
      ownerTag: "main",
    });

    this.clones.forEach((c) => {
      this.stasisOrbs.push({
        x: c.x,
        y: c.y,
        angle: aimAngle,
        speed: 12.5,
        r: Math.max(10, Math.round(16 * c.scaleMult)),
        traveled: 0,
        maxRange: Math.round(maxRange * (c.scaleMult === 2.0 ? 1.25 : 0.85)),
        cageRadius: Math.round(cageRadius * c.scaleMult),
        cageDuration: Number(
          (cageDuration * (c.scaleMult === 2.0 ? 1.15 : 0.85)).toFixed(1),
        ),
        ownerTag: c.type,
      });
    });

    sound.playSkill();
    camera.shake = 8;
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 22,
      this.clones.length > 0
        ? `⌛ ĐỒNG LOẠT LỒNG GIAM ĐA CHIỀU (R=${cageRadius})!`
        : `⌛ CẦU NGƯNG ĐỌNG THỜI GIAN (R=${cageRadius})!`,
      "#2dd4bf",
    );

    eventBus.emit("SKILL_BROADCAST", {
      type: "time_stasis_orb",
      x: player.x,
      y: player.y,
      angle: aimAngle,
      maxRange,
      maxR: cageRadius,
      duration: cageDuration,
      color: "#2dd4bf",
    });
  }

  // SKILL 3 [R]: BÀNH TRƯỚNG LÃNH ĐỊA: TRƯỜNG THỜI GIAN (Cấp 100 đạt 1/2 Map!) / TUA NGƯỢC 3S
  triggerSkill3(player, context) {
    if (!player) return;
    const { particleSystem, camera } = context;

    if (this.domain && !this.domain.rewindUsed) {
      this.executeTimeRewind(player, particleSystem, camera);
      return;
    }

    if (player.skill3CooldownTimer > 0) return;

    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
    player.skill3CooldownTimer = 16.0 * player.cdrMult * synCdr;

    // Quy luật tỷ lệ theo cấp độ: Lv.1 = 380px -> Lv.100 = 1/2 Map (worldSize * 0.5)
    const worldSize = getWorldSize(player.selectedMap);
    const maxHalfMapRadius = worldSize * 0.5;
    const minDomainRadius = 380;
    const t = calcLevelProgress(player.level);
    const domainRadius = Math.round(
      minDomainRadius + (maxHalfMapRadius - minDomainRadius) * t,
    );
    const domainDuration = Number((8.0 + t * 9.0).toFixed(1));

    this.domain = {
      x: player.x,
      y: player.y,
      radius: domainRadius,
      timer: domainDuration,
      maxTimer: domainDuration,
      rewindUsed: false,
    };

    player.skillCooldownTimer *= 0.5;
    player.skill2CooldownTimer *= 0.5;

    sound.playEvolution();
    camera.shake = 18;
    eventBus.emit("HIT_STOP", 0.045);
    particleSystem.addShockwave(player.x, player.y, domainRadius, "#f59e0b");
    particleSystem.addShockwave(
      player.x,
      player.y,
      domainRadius * 0.65,
      "#2dd4bf",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 30,
      `🕰️ TRƯỜNG THỜI GIAN R=${domainRadius} (${domainDuration}s)!`,
      "#fef08a",
    );

    // Đồng bộ Lãnh Địa Trường Thời Gian sang toàn bộ người chơi Online
    eventBus.emit("SKILL_BROADCAST", {
      type: "time_domain",
      x: player.x,
      y: player.y,
      maxR: domainRadius,
      duration: domainDuration,
      color: "#f59e0b",
    });
  }

  executeTimeRewind(player, particleSystem, camera) {
    if (!this.domain || this.domain.rewindUsed) return;
    this.domain.rewindUsed = true;

    const pastSnap = this.getSnapshotSecondsAgo(3.0) || {
      x: player.x,
      y: player.y,
      hp: player.maxHp,
      stamina: player.maxStamina,
    };

    const oldX = player.x;
    const oldY = player.y;
    const restoredHp = Math.max(player.hp, pastSnap.hp);
    const healedAmt = Math.max(0, Math.round(restoredHp - player.hp));

    player.x = pastSnap.x;
    player.y = pastSnap.y;
    player.hp = Math.min(player.maxHp, restoredHp);
    player.stamina = player.maxStamina;
    player.stunTimer = 0;
    player.hurtTimer = 0;
    player.invincibleTimer = Math.max(player.invincibleTimer, 1.2);

    this.rewindEffects.push({
      fromX: oldX,
      fromY: oldY,
      toX: player.x,
      toY: player.y,
      life: 0.75,
    });

    sound.playEvolution();
    camera.shake = 14;
    particleSystem.addShockwave(oldX, oldY, player.radius * 3, "#2dd4bf");
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 4,
      "#fef08a",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 28,
      `⏪ TUA NGƯỢC 3 GIÂY (+${healedAmt} HP & XÓA BẤT LỢI)!`,
      "#2dd4bf",
    );

    eventBus.emit("SKILL_BROADCAST", {
      type: "time_rewind",
      fromX: oldX,
      fromY: oldY,
      x: player.x,
      y: player.y,
      maxR: player.radius * 4,
      color: "#2dd4bf",
    });
    eventBus.emit("FORCE_SYNC_PLAYER");
  }

  getSnapshotSecondsAgo(secondsAgo) {
    if (!this.historyBuffer.length) return null;
    const targetTime = performance.now() - secondsAgo * 1000;
    let closest = this.historyBuffer[0];
    for (let i = 0; i < this.historyBuffer.length; i++) {
      if (this.historyBuffer[i].ts <= targetTime) {
        closest = this.historyBuffer[i];
      } else {
        break;
      }
    }
    return closest;
  }

  update(dt, state) {
    const { player, enemies, remotePlayers, boss, particleSystem, camera } =
      state;
    if (!player || player.species !== "time") return;

    const frameScale = dt * 60;
    const now = performance.now();

    this.recordTimer += dt;
    if (this.recordTimer >= 0.05) {
      this.recordTimer = 0;
      this.historyBuffer.push({
        ts: now,
        x: player.x,
        y: player.y,
        angle: player.angle,
        hp: player.hp,
        stamina: player.stamina,
        radius: player.radius,
      });
      while (
        this.historyBuffer.length > 0 &&
        now - this.historyBuffer[0].ts > 4200
      ) {
        this.historyBuffer.shift();
      }
    }

    const insideDomain = this.isInsideDomain(player);
    player.timeDomainActive = insideDomain;
    if (insideDomain) {
      player.stunTimer = 0;
    }

    if (this.domain) {
      this.domain.timer -= dt;

      if (
        !this.domain.rewindUsed &&
        player.hp > 0 &&
        player.hp <= player.maxHp * 0.22
      ) {
        this.executeTimeRewind(player, particleSystem, camera);
      }

      if (
        boss &&
        boss.hp > 0 &&
        Math.hypot(boss.x - this.domain.x, boss.y - this.domain.y) <=
          this.domain.radius + boss.radius
      ) {
        boss.x -= Math.cos(boss.angle) * 1.4 * frameScale;
        boss.y -= Math.sin(boss.angle) * 1.4 * frameScale;
      }

      enemies.forEach((e) => {
        if (
          Math.hypot(e.x - this.domain.x, e.y - this.domain.y) <=
          this.domain.radius + e.radius
        ) {
          e.x -= Math.cos(e.angle) * e.baseSpeed * 0.55 * frameScale;
          e.y -= Math.sin(e.angle) * e.baseSpeed * 0.55 * frameScale;
        }
      });

      if (this.domain.timer <= 0) {
        this.domain = null;
        particleSystem.addFloatingText(
          player.x,
          player.y - player.radius - 20,
          "🕰️ TRƯỜNG THỜI GIAN KẾT THÚC",
          "#fbbf24",
        );
      }
    }

    const reservedTargets = new Set();
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      c.timer -= dt;
      if (c.biteCd > 0) c.biteCd -= dt;
      if (c.skillCd > 0) c.skillCd -= dt;
      if (c.backOffTimer > 0) c.backOffTimer -= dt;

      c.radius =
        c.type === "past"
          ? Math.max(16, player.radius * 0.5)
          : Math.min(340, player.radius * 2.0);

      const targetInfo = this.findBestTargetForClone(
        c,
        player,
        enemies,
        remotePlayers,
        boss,
        reservedTargets,
      );

      let desiredVx = 0;
      let desiredVy = 0;

      if (targetInfo && targetInfo.entity) {
        const tgt = targetInfo.entity;
        const distToTgt = Math.hypot(tgt.x - c.x, tgt.y - c.y);

        if (c.skillCd <= 0 && distToTgt <= 620) {
          c.skillCd = c.type === "future" ? 3.8 : 4.6;
          this.castCloneStasisSkill(c, player, tgt, particleSystem);
        }

        if (c.backOffTimer > 0) {
          const awayAngle = Math.atan2(c.y - tgt.y, c.x - tgt.x);
          c.angle = smoothRotate(c.angle, awayAngle, 0.25);
          const retreatSpeed = 6.5;
          desiredVx = Math.cos(c.angle) * retreatSpeed;
          desiredVy = Math.sin(c.angle) * retreatSpeed;
        } else {
          const leadX =
            tgt.x +
            Math.cos(tgt.angle || 0) * Math.min(28, (tgt.radius || 20) * 0.5);
          const leadY =
            tgt.y +
            Math.sin(tgt.angle || 0) * Math.min(28, (tgt.radius || 20) * 0.5);
          const attackAngle = Math.atan2(leadY - c.y, leadX - c.x);

          c.angle = smoothRotate(c.angle, attackAngle, 0.32);
          const speed = c.type === "future" ? 9.2 : 8.6;
          desiredVx = Math.cos(c.angle) * speed;
          desiredVy = Math.sin(c.angle) * speed;
        }

        c.animPhase += 0.36;

        if (c.type === "future") {
          c.markCd -= dt;
          if (c.markCd <= 0) {
            c.markCd = 1.6;
            this.futureMarks.push({
              x: c.x,
              y: c.y,
              r: Math.max(28, player.radius * 0.85),
              life: 3.5,
            });
          }
        }
      } else {
        const wingAngle = player.angle + c.sideSign * 1.15;
        const wingDist = player.radius * (c.type === "future" ? 2.8 : 2.1);
        const guardX = player.x + Math.cos(wingAngle) * wingDist;
        const guardY = player.y + Math.sin(wingAngle) * wingDist;

        const dx = guardX - c.x;
        const dy = guardY - c.y;
        const distGuard = Math.hypot(dx, dy);

        if (distGuard > 16) {
          const followAngle = Math.atan2(dy, dx);
          c.angle = smoothRotate(c.angle, followAngle, 0.2);
          const followSpeed = Math.min(8.5, distGuard * 0.15);
          desiredVx = Math.cos(c.angle) * followSpeed;
          desiredVy = Math.sin(c.angle) * followSpeed;
        } else {
          c.angle = smoothRotate(c.angle, player.angle, 0.18);
          desiredVx = 0;
          desiredVy = 0;
        }
        c.animPhase += 0.22;
      }

      c.vx += (desiredVx - c.vx) * 0.3;
      c.vy += (desiredVy - c.vy) * 0.3;
      c.x += c.vx * frameScale;
      c.y += c.vy * frameScale;

      const eatReach = c.radius * 1.12;
      let hitSomeone = false;

      // 0. Tấn công Boss Leviathan
      if (
        c.biteCd <= 0 &&
        boss &&
        boss.hp > 0 &&
        Math.hypot(boss.x - c.x, boss.y - c.y) <= eatReach + boss.radius * 0.85
      ) {
        c.biteCd = 0.55;
        c.backOffTimer = 0.26;
        hitSomeone = true;
        const bossDmg = Math.round(38 * player.bitePower * c.damageRatio);
        this.damageBossIfHit(
          boss,
          c.x,
          c.y,
          eatReach + 30,
          bossDmg,
          player,
          particleSystem,
          camera,
        );
      }

      // 1. Tấn công Người Chơi đối địch
      if (!hitSomeone && c.biteCd <= 0) {
        for (const [id, rp] of Object.entries(remotePlayers || {})) {
          if (!rp || rp.isStealthed || rp.invincibleTimer > 0) continue;
          if (
            Math.hypot(rp.x - c.x, rp.y - c.y) <=
            eatReach + rp.radius * 0.85
          ) {
            c.biteCd = 0.55;
            c.backOffTimer = 0.26;
            hitSomeone = true;

            const mult = getCounterMultiplier(player.species, rp.species);
            const finalDmg = Math.round(
              32 * player.bitePower * c.damageRatio * mult,
            );
            this.triggerTimePulseSteal(player, rp, particleSystem);

            if (!this.accumulateParadoxDamage(id, rp, finalDmg)) {
              eventBus.emit("PVP_ATTACK", {
                targetId: id,
                dmg: finalDmg,
                isCrit: c.type === "future" || c.isRealEntity,
                fromX: c.x,
                fromY: c.y,
                attackerName: `${player.name} (${c.type === "past" ? "Quá Khứ 0.5x" : "Tương Lai 2x"})`,
                targetX: rp.x,
                targetY: rp.y,
              });
            }
            break;
          }
        }
      }

      // 2. Nuốt chửng hoặc cắn Bot / Cá hoang dã
      if (!hitSomeone) {
        for (let k = enemies.length - 1; k >= 0; k--) {
          const e = enemies[k];
          if (!e) continue;
          if (Math.hypot(e.x - c.x, e.y - c.y) <= eatReach + e.radius * 0.85) {
            if (c.radius >= e.radius * 0.88) {
              const pts = Math.max(8, Math.ceil(e.radius * 1.6 * c.scaleMult));
              player.addScore(
                pts,
                null,
                player.selectedMap,
                particleSystem,
                camera,
              );
              player.heal(player.lifeSteal * c.scaleMult);
              this.triggerTimePulseSteal(player, e, particleSystem);

              sound.playEat(c.type === "future" ? 2 : 1);
              particleSystem.addFloatingText(
                e.x,
                e.y - 10,
                `+${pts} (${c.type === "future" ? "Tương Lai 2x" : "Quá Khứ 0.5x"})`,
                c.type === "future" ? "#2dd4bf" : "#f59e0b",
              );
              enemies.splice(k, 1);
            } else if (c.biteCd <= 0) {
              c.biteCd = 0.5;
              c.backOffTimer = 0.25;
              const damageRadius = Math.max(
                6,
                16 * player.bitePower * c.damageRatio,
              );
              e.radius -= damageRadius;
              e.stunTimer = Math.max(e.stunTimer || 0, 0.5);
              this.triggerTimePulseSteal(player, e, particleSystem);

              if (e.radius <= 11) {
                const pts = Math.ceil(28 * c.scaleMult);
                player.addScore(
                  pts,
                  null,
                  player.selectedMap,
                  particleSystem,
                  camera,
                );
                enemies.splice(k, 1);
              } else {
                particleSystem.addFloatingText(
                  e.x,
                  e.y - 12,
                  c.type === "future"
                    ? "⚡ TƯƠNG LAI TRẢM (2x)!"
                    : "⏳ QUÁ KHỨ CẮN (0.5x)!",
                  c.type === "future" ? "#2dd4bf" : "#f59e0b",
                );
              }
            }
            break;
          }
        }
      }

      if (c.timer <= 0) {
        this.clones.splice(i, 1);
      }
    }

    for (let i = this.futureMarks.length - 1; i >= 0; i--) {
      const m = this.futureMarks[i];
      m.life -= dt;
      if (Math.hypot(player.x - m.x, player.y - m.y) <= player.radius + m.r) {
        player.dashTimer = Math.max(player.dashTimer, 0.45);
        player.skillCooldownTimer = Math.max(
          0,
          player.skillCooldownTimer - 1.2,
        );
        player.skill2CooldownTimer = Math.max(
          0,
          player.skill2CooldownTimer - 1.2,
        );
        sound.playEat(2);
        particleSystem.addShockwave(m.x, m.y, m.r * 2.2, "#2dd4bf");
        particleSystem.addFloatingText(
          player.x,
          player.y - player.radius - 18,
          "⚡ ĐỒNG BỘ TƯƠNG LAI (+TỐC & -CD)!",
          "#2dd4bf",
        );
        this.futureMarks.splice(i, 1);
        continue;
      }
      if (m.life <= 0) this.futureMarks.splice(i, 1);
    }

    for (let i = this.stasisOrbs.length - 1; i >= 0; i--) {
      const orb = this.stasisOrbs[i];
      const step = orb.speed * frameScale;
      orb.x += Math.cos(orb.angle) * step;
      orb.y += Math.sin(orb.angle) * step;
      orb.traveled += step;

      const hitBoss =
        boss &&
        boss.hp > 0 &&
        Math.hypot(boss.x - orb.x, boss.y - orb.y) <= orb.r + boss.radius;
      const hitBot = enemies.some(
        (e) => Math.hypot(e.x - orb.x, e.y - orb.y) <= orb.r + e.radius,
      );
      const hitPlayer = Object.values(remotePlayers || {}).some(
        (rp) =>
          rp &&
          !rp.isStealthed &&
          Math.hypot(rp.x - orb.x, rp.y - orb.y) <= orb.r + rp.radius,
      );

      if (hitBoss || hitBot || hitPlayer || orb.traveled >= orb.maxRange) {
        this.stasisCages.push({
          x: orb.x,
          y: orb.y,
          radius: orb.cageRadius,
          timer: orb.cageDuration,
          maxTimer: orb.cageDuration,
          storedDamage: new Map(),
          ownerTag: orb.ownerTag || "main",
        });
        sound.playEvolution();
        particleSystem.addShockwave(
          orb.x,
          orb.y,
          orb.cageRadius,
          orb.ownerTag === "past" ? "#f59e0b" : "#2dd4bf",
        );
        eventBus.emit("SKILL_BROADCAST", {
          type: "time_cage",
          x: orb.x,
          y: orb.y,
          maxR: orb.cageRadius,
          duration: orb.cageDuration,
          color: orb.ownerTag === "past" ? "#f59e0b" : "#2dd4bf",
        });
        this.stasisOrbs.splice(i, 1);
      }
    }

    for (let i = this.stasisCages.length - 1; i >= 0; i--) {
      const cage = this.stasisCages[i];
      cage.timer -= dt;

      if (
        boss &&
        boss.hp > 0 &&
        Math.hypot(boss.x - cage.x, boss.y - cage.y) <=
          cage.radius + boss.radius * 0.5
      ) {
        boss.stunTimer = Math.max(boss.stunTimer || 0, 0.3);
      }

      enemies.forEach((e) => {
        if (
          Math.hypot(e.x - cage.x, e.y - cage.y) <=
          cage.radius + e.radius * 0.5
        ) {
          e.stunTimer = Math.max(e.stunTimer, 0.25);
        }
      });

      // Giữ chân & làm chậm đối thủ PvP trong Lồng Giam Thời Gian
      Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
        if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
        if (
          Math.hypot(rp.x - cage.x, rp.y - cage.y) <=
          cage.radius + rp.radius * 0.6
        ) {
          if (!cage.tickCd) cage.tickCd = 0;
          cage.tickCd -= dt;
          if (cage.tickCd <= 0) {
            cage.tickCd = 0.65;
            const tickDmg = Math.round(18 * player.bitePower);
            eventBus.emit("PVP_ATTACK", {
              targetId: id,
              dmg: tickDmg,
              isCrit: false,
              fromX: cage.x,
              fromY: cage.y,
              attackerName: `${player.name} (Ngưng Đọng)`,
              targetX: rp.x,
              targetY: rp.y,
            });
          }
        }
      });

      if (cage.timer <= 0) {
        const paradoxMult = player.evoStage >= 6 ? 1.3 : 1.0;
        const burstBaseDmg = Math.round(
          (55 + player.level * 1.4) * player.bitePower * paradoxMult,
        );

        this.damageBossIfHit(
          boss,
          cage.x,
          cage.y,
          cage.radius,
          burstBaseDmg * 1.8,
          player,
          particleSystem,
          camera,
        );

        enemies.forEach((e) => {
          if (
            Math.hypot(e.x - cage.x, e.y - cage.y) <=
            cage.radius + e.radius
          ) {
            e.stunTimer = 1.6;
            e.radius = Math.max(10, e.radius * 0.72);
            this.triggerTimePulseSteal(player, e, particleSystem);
          }
        });

        // Gây sát thương bùng nổ Nghịch Lý lên cả mục tiêu tích lũy lẫn toàn bộ kẻ địch trong lồng
        const damagedIds = new Set();
        cage.storedDamage.forEach((entry, targetId) => {
          const rp = remotePlayers?.[targetId];
          if (rp && entry.dmg > 0) {
            damagedIds.add(targetId);
            const burstDmg = Math.round(entry.dmg * paradoxMult + burstBaseDmg * 0.5);
            eventBus.emit("PVP_ATTACK", {
              targetId,
              dmg: burstDmg,
              isCrit: true,
              fromX: cage.x,
              fromY: cage.y,
              attackerName: `${player.name} (Nghịch Lý)`,
              targetX: rp.x,
              targetY: rp.y,
            });
          }
        });

        Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
          if (
            !damagedIds.has(id) &&
            rp &&
            !rp.isStealthed &&
            !rp.invincibleTimer &&
            Math.hypot(rp.x - cage.x, rp.y - cage.y) <= cage.radius + rp.radius
          ) {
            const mult = getCounterMultiplier(player.species, rp.species);
            eventBus.emit("PVP_ATTACK", {
              targetId: id,
              dmg: Math.round(burstBaseDmg * mult),
              isCrit: true,
              fromX: cage.x,
              fromY: cage.y,
              attackerName: `${player.name} (Nghịch Lý)`,
              targetX: rp.x,
              targetY: rp.y,
            });
          }
        });

        sound.playEvolution();
        camera.shake = 14;
        particleSystem.addShockwave(
          cage.x,
          cage.y,
          cage.radius * 1.25,
          "#f59e0b",
        );
        particleSystem.addFloatingText(
          cage.x,
          cage.y - 26,
          "💥 BÙNG NỔ NGHỊCH LÝ THỜI GIAN!",
          "#f59e0b",
        );
        eventBus.emit("SKILL_BROADCAST", {
          type: "time_paradox_burst",
          x: cage.x,
          y: cage.y,
          maxR: cage.radius * 1.25,
          color: "#f59e0b",
        });
        this.stasisCages.splice(i, 1);
      }
    }

    for (let i = this.rewindEffects.length - 1; i >= 0; i--) {
      this.rewindEffects[i].life -= dt;
      if (this.rewindEffects[i].life <= 0) this.rewindEffects.splice(i, 1);
    }
  }

  drawWorldEffects(ctx, time) {
    if (this.domain) {
      const d = this.domain;
      ctx.save();
      ctx.translate(d.x, d.y);

      const grad = ctx.createRadialGradient(
        0,
        0,
        d.radius * 0.12,
        0,
        0,
        d.radius,
      );
      grad.addColorStop(0, "rgba(15, 23, 42, 0.25)");
      grad.addColorStop(0.65, "rgba(245, 158, 11, 0.22)");
      grad.addColorStop(1, "rgba(45, 212, 191, 0.55)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time * 0.0008);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.setLineDash([22, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.stroke();

      const cogs = 24;
      for (let i = 0; i < cogs; i++) {
        const a = (i * Math.PI * 2) / cogs;
        ctx.beginPath();
        ctx.moveTo(
          Math.cos(a) * (d.radius - 12),
          Math.sin(a) * (d.radius - 12),
        );
        ctx.lineTo(
          Math.cos(a) * (d.radius + 14),
          Math.sin(a) * (d.radius + 14),
        );
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.rotate(-time * 0.0014);
      ctx.strokeStyle = "rgba(45, 212, 191, 0.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = "rgba(254, 240, 138, 0.65)";
      ctx.lineWidth = 2.5;
      for (let h = 0; h < 12; h++) {
        const a = (h * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(
          Math.cos(a) * d.radius * 0.84,
          Math.sin(a) * d.radius * 0.84,
        );
        ctx.lineTo(
          Math.cos(a) * d.radius * 0.94,
          Math.sin(a) * d.radius * 0.94,
        );
        ctx.stroke();
      }

      ctx.restore();
    }

    this.stasisCages.forEach((cage) => {
      ctx.save();
      ctx.translate(cage.x, cage.y);

      const cageGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, cage.radius);
      cageGrad.addColorStop(0, "rgba(45, 212, 191, 0.16)");
      cageGrad.addColorStop(0.75, "rgba(245, 158, 11, 0.28)");
      cageGrad.addColorStop(1, "rgba(45, 212, 191, 0.72)");
      ctx.fillStyle = cageGrad;
      ctx.beginPath();
      ctx.arc(0, 0, cage.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = cage.ownerTag === "past" ? "#f59e0b" : "#2dd4bf";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -cage.radius * 0.55);
      ctx.moveTo(0, 0);
      ctx.lineTo(cage.radius * 0.38, 0);
      ctx.stroke();

      ctx.restore();
    });

    this.stasisOrbs.forEach((orb) => {
      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.rotate(time * 0.008);
      ctx.fillStyle = "rgba(45, 212, 191, 0.35)";
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, orb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(-8, -9);
      ctx.lineTo(8, -9);
      ctx.lineTo(-8, 9);
      ctx.lineTo(8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    this.futureMarks.forEach((m) => {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(-time * 0.004);
      ctx.strokeStyle = "#2dd4bf";
      ctx.fillStyle = "rgba(45, 212, 191, 0.2)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.clones.forEach((c) => {
      ctx.save();
      ctx.translate(c.x, c.y);

      ctx.font = "900 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = c.type === "future" ? "#2dd4bf" : "#fbbf24";
      ctx.fillText(
        c.type === "future" ? "⚡ TƯƠNG LAI (2.0x)" : "⏳ QUÁ KHỨ (0.5x)",
        0,
        -c.radius - 10,
      );

      ctx.globalAlpha = c.type === "future" ? 0.94 : 0.78;
      ctx.rotate(c.angle);
      if (Math.abs(c.angle) > Math.PI / 2) {
        ctx.scale(1, -1);
      }

      const wag = Math.sin(c.animPhase) * (c.radius * 0.28);
      const cloneColors =
        c.type === "past"
          ? { primary: "#f59e0b", secondary: "#78350f", accent: "#fef08a" }
          : { primary: "#2dd4bf", secondary: "#115e59", accent: "#ccfbf1" };

      renderCreatureBody(
        ctx,
        { species: "time", evoStage: c.type === "future" ? 8 : 3 },
        c.radius,
        wag,
        cloneColors,
      );
      ctx.restore();
    });

    this.rewindEffects.forEach((rw) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, rw.life * 1.5);
      ctx.strokeStyle = "#2dd4bf";
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(rw.fromX, rw.fromY);
      ctx.lineTo(rw.toX, rw.toY);
      ctx.stroke();
      ctx.restore();
    });
  }
}
