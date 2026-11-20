import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { getCounterMultiplier } from "../data/speciesConfig.js";
import { getWorldSize } from "../data/mapsConfig.js";
import { BOSS_SKILL_CORES } from "../data/bossSkillsData.js";

function calcLevelProgress(level) {
  const lvl = Math.min(100, Math.max(1, level || 1));
  return (lvl - 1) / 99;
}

const V2_PALETTE = {
  border: "#ff006e",
  accent: "#fee440",
  glow: "#00f5d4",
  fill: "rgba(180, 15, 65, 0.34)",
};

export class SpaceFishSystem {
  constructor() {
    this.domain = null;
    this.slashes = [];
    this.riftSlashes = [];
    this.orbs = [];
    this.semiDomains = [];
    this.implosions = [];
    this.teleportPortals = [];
  }

  clear() {
    this.domain = null;
    this.slashes = [];
    this.riftSlashes = [];
    this.orbs = [];
    this.semiDomains = [];
    this.implosions = [];
    this.teleportPortals = [];
  }

  isInsideDomain(player) {
    if (!this.domain || !player) return false;
    return (
      Math.hypot(player.x - this.domain.x, player.y - this.domain.y) <=
      this.domain.radius
    );
  }

  applySpatialRift(target, duration = 4.0) {
    if (!target) return;
    target.spatialRiftTimer = Math.max(target.spatialRiftTimer || 0, duration);
    target.spatialRiftWobble = Math.random() * Math.PI * 2;
  }

  damageBossIfHit(
    boss,
    cx,
    cy,
    hitRadius,
    dmg,
    player,
    particleSystem,
    camera,
    epicBoss = null,
    epicBossSystem = null,
  ) {
    let hitAny = false;

    if (
      epicBoss &&
      epicBoss.hp > 0 &&
      epicBossSystem &&
      Math.hypot(epicBoss.x - cx, epicBoss.y - cy) <=
        hitRadius + epicBoss.radius
    ) {
      epicBossSystem.damageBoss(epicBoss, dmg, player, particleSystem);
      epicBoss.stunTimer = Math.max(epicBoss.stunTimer || 0, 0.65);
      this.applySpatialRift(epicBoss, 4.0);
      hitAny = true;
    }

    if (boss && boss.hp > 0) {
      if (Math.hypot(boss.x - cx, boss.y - cy) <= hitRadius + boss.radius) {
        boss.hp -= dmg;
        boss.stunTimer = Math.max(boss.stunTimer || 0, 0.7);
        this.applySpatialRift(boss, 4.5);
        particleSystem.addFloatingText(
          boss.x,
          boss.y - boss.radius - 14,
          `🌌 -${Math.round(dmg)} BOSS!`,
          "#e0aaff",
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
            "🏆 BẠN ĐÃ HẠ GỤC LEVIATHAN BẰNG QUYỀN NĂNG KHÔNG GIAN (+2500 XP)!",
          );
          eventBus.emit("BOSS_KILLED");
        }
        hitAny = true;
      }
    }
    return hitAny;
  }

  triggerBossSkill(skillId, player, context) {
    if (!player || player.bossSkillCooldowns?.[skillId] > 0) return;
    const profile = player.getEffectiveBossSkillProfile(skillId);
    if (!profile) return;

    const core = BOSS_SKILL_CORES[skillId];
    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;

    if (skillId === "boss_space_1") {
      const ok = this.triggerSkill1(player, context, {
        ...profile,
        useBossSlotCd: skillId,
        baseCd: core.cooldown * player.cdrMult * synCdr * profile.cdMult,
      });
      if (!ok) return;
    } else if (skillId === "boss_space_2") {
      player.bossSkillCooldowns[skillId] =
        core.cooldown * player.cdrMult * synCdr * profile.cdMult;
      this.triggerSkill2(player, context, {
        ...profile,
        skipNativeCd: true,
      });
    } else if (skillId === "boss_space_3") {
      player.bossSkillCooldowns[skillId] =
        core.cooldown * player.cdrMult * synCdr * profile.cdMult;
      this.triggerSkill3(player, context, {
        ...profile,
        skipNativeCd: true,
      });
    }
  }

  // SKILL 1 [E]: BÀNH TRƯỚNG LÃNH ĐỊA / BƯỚC NHẢY KHÔNG GIAN
  triggerSkill1(player, context, customProfile = null) {
    const { particleSystem, camera, input, width, height } = context;
    const profile =
      customProfile || player.getEffectiveBossSkillProfile("boss_space_1");
    const isV2 = profile.v2Mode !== "none";
    const isTrueV2 = profile.v2Mode === "true";

    if (this.isInsideDomain(player)) {
      if (this.domain.teleportCd > 0) return false;

      const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
      const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;
      const distMouseToDomain = Math.hypot(
        worldMouseX - this.domain.x,
        worldMouseY - this.domain.y,
      );

      if (
        !input.isJoystickModeActive &&
        distMouseToDomain <= this.domain.radius
      ) {
        this.executeTeleport(
          player,
          worldMouseX,
          worldMouseY,
          particleSystem,
          camera,
          isV2,
        );
      } else {
        player.spaceTeleportAiming = !player.spaceTeleportAiming;
        particleSystem.addFloatingText(
          player.x,
          player.y - player.radius - 24,
          player.spaceTeleportAiming
            ? "🌀 CHẠM / CLICK ĐIỂM TRONG LÃNH ĐỊA ĐỂ DỊCH CHUYỂN!"
            : "❌ HỦY CHỌN ĐIỂM DỊCH CHUYỂN",
          isV2 ? V2_PALETTE.accent : "#c77dff",
        );
      }
      return false;
    }

    if (customProfile?.useBossSlotCd) {
      player.bossSkillCooldowns[customProfile.useBossSlotCd] =
        customProfile.baseCd;
    } else {
      if (player.skillCooldownTimer > 0) return false;
      const syn = player.getSynergies();
      const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
      player.skillCooldownTimer =
        player.cfg.skillCooldown * player.cdrMult * synCdr * profile.cdMult;
    }

    const worldSize = getWorldSize(player.selectedMap);
    const maxHalfMapRadius = worldSize * 0.5;
    const minDomainRadius = 340;
    const t = calcLevelProgress(profile.effectiveLevel);
    const domainRadius = Math.min(
      maxHalfMapRadius,
      Math.round(
        (minDomainRadius + (maxHalfMapRadius - minDomainRadius) * t) *
          profile.radiusMult,
      ),
    );
    const domainDuration = Number(
      ((7.5 + t * 8.5) * (isTrueV2 ? 1.15 : 1.0)).toFixed(1),
    );

    this.domain = {
      x: player.x,
      y: player.y,
      radius: domainRadius,
      timer: domainDuration,
      maxTimer: domainDuration,
      teleportCd: 0.25,
      v2Mode: profile.v2Mode,
    };
    player.spaceTeleportAiming = false;

    sound.playEvolution();
    camera.shake = 14;
    eventBus.emit("HIT_STOP", 0.04);
    particleSystem.addShockwave(
      player.x,
      player.y,
      domainRadius,
      isV2 ? V2_PALETTE.border : "#9d4edd",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 28,
      isTrueV2
        ? `🌌 [V2 THỨC TỈNH] BÀNH TRƯỚNG TINH VÂN R=${domainRadius}!`
        : isV2
          ? `🌌 [V2 GIỚI HẠN] BÀNH TRƯỚNG R=${domainRadius}!`
          : `🌌 BÀNH TRƯỚNG KHÔNG GIAN R=${domainRadius}!`,
      isV2 ? V2_PALETTE.accent : "#e0aaff",
    );

    eventBus.emit("SKILL_BROADCAST", {
      type: "space_domain",
      x: player.x,
      y: player.y,
      maxR: domainRadius,
      duration: domainDuration,
      color: isV2 ? V2_PALETTE.border : "#9d4edd",
    });
    eventBus.emit("SKILL_USED_FOR_QUEST");
    return true;
  }

  executeTeleport(
    player,
    targetX,
    targetY,
    particleSystem,
    camera,
    isV2 = false,
  ) {
    if (!this.domain || this.domain.teleportCd > 0) return;

    const dx = targetX - this.domain.x;
    const dy = targetY - this.domain.y;
    const dist = Math.hypot(dx, dy);
    let finalX = targetX;
    let finalY = targetY;

    if (dist > this.domain.radius - player.radius * 0.5) {
      const ang = Math.atan2(dy, dx);
      const maxR = Math.max(10, this.domain.radius - player.radius * 0.5);
      finalX = this.domain.x + Math.cos(ang) * maxR;
      finalY = this.domain.y + Math.sin(ang) * maxR;
    }

    const ws = getWorldSize(player.selectedMap);
    finalX = Math.max(player.radius, Math.min(ws - player.radius, finalX));
    finalY = Math.max(player.radius, Math.min(ws - player.radius, finalY));

    const fromX = player.x;
    const fromY = player.y;
    const v2Active = isV2 || this.domain.v2Mode !== "none";

    this.teleportPortals.push(
      { x: fromX, y: fromY, r: player.radius * 1.4, life: 0.45, v2: v2Active },
      {
        x: finalX,
        y: finalY,
        r: player.radius * 1.7,
        life: 0.55,
        v2: v2Active,
      },
    );

    player.x = finalX;
    player.y = finalY;
    player.invincibleTimer = Math.max(player.invincibleTimer, 0.35);
    player.spaceTeleportAiming = false;
    this.domain.teleportCd = 0.4;

    sound.playSkill();
    camera.shake = 7;
    particleSystem.addShockwave(
      finalX,
      finalY,
      player.radius * (v2Active ? 3.2 : 2.6),
      v2Active ? V2_PALETTE.accent : "#00f5d4",
    );

    eventBus.emit("SKILL_BROADCAST", {
      type: "space_teleport",
      fromX,
      fromY,
      x: finalX,
      y: finalY,
      maxR: player.radius * 2.6,
      color: v2Active ? V2_PALETTE.accent : "#00f5d4",
    });
    eventBus.emit("FORCE_SYNC_PLAYER");
  }

  // SKILL 2 [Q]: LÁT CẮT KHÔNG GIAN
  triggerSkill2(player, context, customProfile = null) {
    if (!player) return;
    const profile =
      customProfile || player.getEffectiveBossSkillProfile("boss_space_2");
    if (!customProfile?.skipNativeCd) {
      if (player.skill2CooldownTimer > 0) return;
      const syn = player.getSynergies();
      const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
      player.skill2CooldownTimer =
        4.2 * player.cdrMult * synCdr * profile.cdMult;
    }

    const {
      enemies,
      remotePlayers,
      boss,
      epicBoss,
      epicBossSystem,
      particleSystem,
      camera,
      input,
      width,
      height,
    } = context;

    const inside = this.isInsideDomain(player);
    const isV2 = profile.v2Mode !== "none";
    const isTrueV2 = profile.v2Mode === "true";
    const t = calcLevelProgress(profile.effectiveLevel);
    const levelFactor = Math.min(100, Math.max(1, profile.effectiveLevel));
    const baseDmg = Math.round(
      (38 + levelFactor * 1.1) * player.bitePower * profile.powerMult,
    );

    sound.playSkill();
    camera.shake = isV2 ? 12 : 9;

    const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
    const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;

    if (!inside) {
      const aimAngle = input.isJoystickModeActive
        ? player.angle
        : Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

      const slashSize = Math.round(
        (player.radius * 1.2 + 36 + t * 240) * profile.radiusMult,
      );
      const slashRange = Math.round((620 + t * 1450) * profile.radiusMult);

      // True V2 bắn 3 lưỡi liềm hình quạt; Limited V2 bắn 2 lưỡi liềm; Thường bắn 1 lưỡi liềm
      const fanAngles = isTrueV2
        ? [aimAngle - 0.28, aimAngle, aimAngle + 0.28]
        : isV2
          ? [aimAngle - 0.16, aimAngle + 0.16]
          : [aimAngle];

      fanAngles.forEach((ang) => {
        this.slashes.push({
          x: player.x + Math.cos(ang) * player.radius,
          y: player.y + Math.sin(ang) * player.radius,
          angle: ang,
          speed: 15.5 + t * 4.5,
          size: slashSize,
          traveled: 0,
          maxRange: slashRange,
          dmg: baseDmg,
          hitIds: new Set(),
          hitBoss: false,
          v2Mode: profile.v2Mode,
        });
      });

      particleSystem.addFloatingText(
        player.x,
        player.y - player.radius - 20,
        isTrueV2
          ? "🌙 [V2] TAM TRẢM HƯ KHÔNG!"
          : isV2
            ? "🌙 [V2] SONG TRẢM KHÔNG GIAN!"
            : "🌙 LÁT CẮT KHÔNG GIAN!",
        isV2 ? V2_PALETTE.accent : "#c77dff",
      );

      eventBus.emit("SKILL_BROADCAST", {
        type: "space_slash",
        x: player.x,
        y: player.y,
        angle: aimAngle,
        size: slashSize,
        maxRange: slashRange,
        color: isV2 ? V2_PALETTE.border : "#e0aaff",
      });
    } else {
      let target = null;
      let bestDist = Infinity;

      const refX = input.isJoystickModeActive ? player.x : worldMouseX;
      const refY = input.isJoystickModeActive ? player.y : worldMouseY;

      [boss, epicBoss].forEach((b) => {
        if (
          b &&
          b.hp > 0 &&
          Math.hypot(b.x - this.domain.x, b.y - this.domain.y) <=
            this.domain.radius + b.radius
        ) {
          const d = Math.hypot(b.x - refX, b.y - refY);
          if (d < bestDist) {
            bestDist = d;
            target = { x: b.x, y: b.y };
          }
        }
      });

      enemies.forEach((e) => {
        if (
          Math.hypot(e.x - this.domain.x, e.y - this.domain.y) <=
          this.domain.radius + e.radius
        ) {
          const d = Math.hypot(e.x - refX, e.y - refY);
          if (d < bestDist) {
            bestDist = d;
            target = { x: e.x, y: e.y };
          }
        }
      });

      Object.entries(remotePlayers || {}).forEach(([, rp]) => {
        if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
        if (
          Math.hypot(rp.x - this.domain.x, rp.y - this.domain.y) <=
          this.domain.radius + rp.radius
        ) {
          const d = Math.hypot(rp.x - refX, rp.y - refY);
          if (d < bestDist) {
            bestDist = d;
            target = { x: rp.x, y: rp.y };
          }
        }
      });

      const strikeX = target
        ? target.x
        : Math.min(
            this.domain.x + this.domain.radius * 0.85,
            Math.max(this.domain.x - this.domain.radius * 0.85, refX),
          );
      const strikeY = target
        ? target.y
        : Math.min(
            this.domain.y + this.domain.radius * 0.85,
            Math.max(this.domain.y - this.domain.radius * 0.85, refY),
          );

      const strikeR = Math.round((115 + t * 245) * profile.radiusMult);
      const strikeAngle = Math.random() * Math.PI;

      this.riftSlashes.push({
        x: strikeX,
        y: strikeY,
        r: strikeR,
        angle: strikeAngle,
        life: 0.6,
        v2Mode: profile.v2Mode,
      });
      if (isV2) {
        this.riftSlashes.push({
          x: strikeX,
          y: strikeY,
          r: strikeR * 1.15,
          angle: strikeAngle + Math.PI * 0.5,
          life: 0.65,
          v2Mode: profile.v2Mode,
        });
      }

      particleSystem.addShockwave(
        strikeX,
        strikeY,
        strikeR * 1.3,
        isV2 ? V2_PALETTE.accent : "#ff006e",
      );
      particleSystem.addFloatingText(
        strikeX,
        strikeY - 24,
        isV2 ? "⚡ [V2] CHỮ THẬP TUYỆT ĐỐI!" : "⚡ VẾT NỨT TUYỆT ĐỐI!",
        isV2 ? V2_PALETTE.accent : "#ff006e",
      );

      eventBus.emit("SKILL_BROADCAST", {
        type: "space_rift",
        x: strikeX,
        y: strikeY,
        maxR: strikeR,
        angle: strikeAngle,
        color: isV2 ? V2_PALETTE.accent : "#ff006e",
      });

      const sureHitDmg = Math.round(baseDmg * 1.3);
      this.damageBossIfHit(
        boss,
        strikeX,
        strikeY,
        strikeR,
        sureHitDmg * 1.4,
        player,
        particleSystem,
        camera,
        epicBoss,
        epicBossSystem,
      );

      enemies.forEach((e) => {
        if (Math.hypot(e.x - strikeX, e.y - strikeY) <= strikeR + e.radius) {
          e.radius = Math.max(10, e.radius * (isTrueV2 ? 0.65 : 0.74));
          e.stunTimer = Math.max(e.stunTimer, 0.9);
          this.applySpatialRift(e, 4.5);
          player.addScore(
            Math.round(e.radius * 1.2),
            null,
            player.selectedMap,
            particleSystem,
            camera,
          );
        }
      });

      Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
        if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
        if (Math.hypot(rp.x - strikeX, rp.y - strikeY) <= strikeR + rp.radius) {
          const counterMult = getCounterMultiplier(player.species, rp.species);
          const finalDmg = Math.round(sureHitDmg * counterMult);
          this.applySpatialRift(rp, 4.5);
          eventBus.emit("PVP_ATTACK", {
            targetId: id,
            dmg: finalDmg,
            isCrit: true,
            fromX: strikeX,
            fromY: strikeY,
            attackerName: player.name,
            targetX: rp.x,
            targetY: rp.y,
          });
        }
      });
    }
  }

  // SKILL 3 [R]: HẠ CẤP & BÓP MÉO KHÔNG GIAN
  triggerSkill3(player, context, customProfile = null) {
    if (!player) return;
    const profile =
      customProfile || player.getEffectiveBossSkillProfile("boss_space_3");
    if (!customProfile?.skipNativeCd) {
      if (player.skill3CooldownTimer > 0) return;
      const syn = player.getSynergies();
      const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
      player.skill3CooldownTimer =
        11.0 * player.cdrMult * synCdr * profile.cdMult;
    }

    const {
      enemies,
      remotePlayers,
      boss,
      epicBoss,
      epicBossSystem,
      particleSystem,
      camera,
      input,
      width,
      height,
    } = context;

    const inside = this.isInsideDomain(player);
    const isV2 = profile.v2Mode !== "none";
    const t = calcLevelProgress(profile.effectiveLevel);
    const levelFactor = Math.min(100, Math.max(1, profile.effectiveLevel));
    const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
    const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;

    sound.playEvolution();
    camera.shake = isV2 ? 20 : 16;
    eventBus.emit("HIT_STOP", 0.045);

    if (!inside) {
      const aimAngle = input.isJoystickModeActive
        ? player.angle
        : Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

      const cageRadius = Math.round((260 + t * 590) * profile.radiusMult);
      const maxDist = Math.round((620 + t * 900) * profile.radiusMult);
      const crushDmg = Math.round(
        (56 + levelFactor * 1.45) * player.bitePower * profile.powerMult,
      );

      this.orbs.push({
        x: player.x + Math.cos(aimAngle) * (player.radius + 14),
        y: player.y + Math.sin(aimAngle) * (player.radius + 14),
        angle: aimAngle,
        speed: 10.5,
        r: 20,
        maxOrbR: Math.round(48 + t * 38),
        traveled: 0,
        maxDist,
        cageRadius,
        crushDmg,
        v2Mode: profile.v2Mode,
      });

      particleSystem.addFloatingText(
        player.x,
        player.y - player.radius - 26,
        isV2
          ? `🔮 [V2] HỐ ĐEN BÁN LÃNH ĐỊA (R=${cageRadius})!`
          : `🔮 QUẢ CẦU BÁN LÃNH ĐỊA (R=${cageRadius})!`,
        isV2 ? V2_PALETTE.border : "#ffbe0b",
      );

      eventBus.emit("SKILL_BROADCAST", {
        type: "space_orb",
        x: player.x,
        y: player.y,
        angle: aimAngle,
        maxRange: maxDist,
        maxR: cageRadius,
        color: isV2 ? V2_PALETTE.border : "#ffbe0b",
      });
    } else {
      let targetX = input.isJoystickModeActive ? player.x : worldMouseX;
      let targetY = input.isJoystickModeActive ? player.y : worldMouseY;

      let bestDist = 360;
      [boss, epicBoss].forEach((b) => {
        if (
          b &&
          b.hp > 0 &&
          Math.hypot(b.x - this.domain.x, b.y - this.domain.y) <=
            this.domain.radius
        ) {
          const d = Math.hypot(b.x - targetX, b.y - targetY);
          if (d < bestDist) {
            bestDist = d;
            targetX = b.x;
            targetY = b.y;
          }
        }
      });

      enemies.forEach((e) => {
        if (
          Math.hypot(e.x - this.domain.x, e.y - this.domain.y) <=
          this.domain.radius
        ) {
          const d = Math.hypot(e.x - targetX, e.y - targetY);
          if (d < bestDist) {
            bestDist = d;
            targetX = e.x;
            targetY = e.y;
          }
        }
      });

      Object.values(remotePlayers || {}).forEach((rp) => {
        if (!rp || rp.isStealthed) return;
        if (
          Math.hypot(rp.x - this.domain.x, rp.y - this.domain.y) <=
          this.domain.radius
        ) {
          const d = Math.hypot(rp.x - targetX, rp.y - targetY);
          if (d < bestDist) {
            bestDist = d;
            targetX = rp.x;
            targetY = rp.y;
          }
        }
      });

      const crushRadius = Math.round((230 + t * 550) * profile.radiusMult);
      const instantDmg = Math.round(
        (68 + levelFactor * 1.75) * player.bitePower * profile.powerMult,
      );

      this.triggerDimensionalCrush(
        player,
        targetX,
        targetY,
        crushRadius,
        instantDmg,
        enemies,
        remotePlayers,
        boss,
        particleSystem,
        camera,
        epicBoss,
        epicBossSystem,
        profile.v2Mode,
      );

      particleSystem.addFloatingText(
        targetX,
        targetY - 30,
        isV2
          ? "💥 [V2] SỤP ĐỔ HỐ ĐEN TỨC THÌ!"
          : "💥 HẠ CẤP KHÔNG GIAN TỨC THÌ!",
        isV2 ? V2_PALETTE.accent : "#ff006e",
      );
    }
  }

  triggerDimensionalCrush(
    player,
    cx,
    cy,
    radius,
    dmg,
    enemies,
    remotePlayers,
    boss,
    particleSystem,
    camera,
    epicBoss = null,
    epicBossSystem = null,
    v2Mode = "none",
  ) {
    const isV2 = v2Mode !== "none";
    this.implosions.push({ x: cx, y: cy, r: radius, life: 0.65, v2Mode });
    sound.playEvolution();
    camera.shake = isV2 ? 22 : 18;
    particleSystem.addShockwave(
      cx,
      cy,
      radius * 1.35,
      isV2 ? V2_PALETTE.accent : "#ff006e",
    );
    particleSystem.addShockwave(
      cx,
      cy,
      radius * 0.85,
      isV2 ? V2_PALETTE.border : "#fee440",
    );

    eventBus.emit("SKILL_BROADCAST", {
      type: "space_crush",
      x: cx,
      y: cy,
      maxR: radius,
      color: isV2 ? V2_PALETTE.accent : "#ff006e",
    });

    this.damageBossIfHit(
      boss,
      cx,
      cy,
      radius,
      dmg * 1.6,
      player,
      particleSystem,
      camera,
      epicBoss,
      epicBossSystem,
    );

    enemies.forEach((e) => {
      if (Math.hypot(e.x - cx, e.y - cy) <= radius + e.radius) {
        e.x = cx + (Math.random() - 0.5) * 24;
        e.y = cy + (Math.random() - 0.5) * 24;
        e.stunTimer = 1.8;
        e.radius = Math.max(10, e.radius * 0.62);
        this.applySpatialRift(e, 5.0);
        player.addScore(
          Math.round(e.radius * 2.2),
          null,
          player.selectedMap,
          particleSystem,
          camera,
        );
      }
    });

    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
      if (Math.hypot(rp.x - cx, rp.y - cy) <= radius + rp.radius) {
        const counterMult = getCounterMultiplier(player.species, rp.species);
        const finalDmg = Math.round(dmg * counterMult);
        this.applySpatialRift(rp, 5.0);
        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg: finalDmg,
          isCrit: true,
          fromX: cx,
          fromY: cy,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });
      }
    });
  }

  update(dt, state) {
    const {
      player,
      enemies,
      remotePlayers,
      boss,
      epicBoss,
      epicBossSystem,
      particleSystem,
      camera,
    } = state;
    if (!player) return;

    const frameScale = dt * 60;

    if (this.domain) {
      this.domain.timer -= dt;
      if (this.domain.teleportCd > 0) {
        this.domain.teleportCd = Math.max(0, this.domain.teleportCd - dt);
      }
      if (this.domain.timer <= 0) {
        this.domain = null;
        player.spaceTeleportAiming = false;
        particleSystem.addFloatingText(
          player.x,
          player.y - player.radius - 20,
          "🌌 LÃNH ĐỊA ĐÃ TAN BIẾN",
          "#90e0ef",
        );
      }
    }

    let nearRiftedEnemy = false;
    enemies.forEach((e) => {
      if (e.spatialRiftTimer > 0) {
        e.spatialRiftTimer -= dt;
        e.spatialRiftWobble = (e.spatialRiftWobble || 0) + dt * 7;
        e.angle += Math.sin(e.spatialRiftWobble) * 0.085;
        if (Math.hypot(e.x - player.x, e.y - player.y) < 650) {
          nearRiftedEnemy = true;
        }
      }
    });
    Object.values(remotePlayers || {}).forEach((rp) => {
      if (rp && rp.spatialRiftTimer > 0) {
        rp.spatialRiftTimer -= dt;
        if (Math.hypot(rp.x - player.x, rp.y - player.y) < 700) {
          nearRiftedEnemy = true;
        }
      }
    });
    player.spatialHuntBonus =
      player.species === "space" && nearRiftedEnemy ? 0.35 : 0;

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      const step = s.speed * frameScale;
      s.x += Math.cos(s.angle) * step;
      s.y += Math.sin(s.angle) * step;
      s.traveled += step;

      if (!s.hitBoss) {
        if (
          this.damageBossIfHit(
            boss,
            s.x,
            s.y,
            s.size,
            s.dmg * 1.4,
            player,
            particleSystem,
            camera,
            epicBoss,
            epicBossSystem,
          )
        ) {
          s.hitBoss = true;
        }
      }

      enemies.forEach((e, idx) => {
        const key = `bot_${idx}_${Math.round(e.baseRadius)}`;
        if (
          !s.hitIds.has(key) &&
          Math.hypot(e.x - s.x, e.y - s.y) < s.size + e.radius
        ) {
          s.hitIds.add(key);
          e.radius = Math.max(10, e.radius * 0.76);
          e.stunTimer = Math.max(e.stunTimer, 0.8);
          this.applySpatialRift(e, 4.0);
          particleSystem.addFloatingText(
            e.x,
            e.y - 16,
            "🌙 RẠN NỨT!",
            s.v2Mode !== "none" ? V2_PALETTE.accent : "#c77dff",
          );
        }
      });

      Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
        if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
        if (
          !s.hitIds.has(id) &&
          Math.hypot(rp.x - s.x, rp.y - s.y) < s.size + rp.radius
        ) {
          s.hitIds.add(id);
          const counterMult = getCounterMultiplier(player.species, rp.species);
          const finalDmg = Math.round(s.dmg * counterMult);
          this.applySpatialRift(rp, 4.0);
          eventBus.emit("PVP_ATTACK", {
            targetId: id,
            dmg: finalDmg,
            isCrit: true,
            fromX: s.x,
            fromY: s.y,
            attackerName: player.name,
            targetX: rp.x,
            targetY: rp.y,
          });
        }
      });

      if (s.traveled >= s.maxRange) {
        this.slashes.splice(i, 1);
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      const step = o.speed * frameScale;
      o.x += Math.cos(o.angle) * step;
      o.y += Math.sin(o.angle) * step;
      o.traveled += step;
      o.r = Math.min(o.maxOrbR, o.r + 0.45 * frameScale);

      const hitBoss =
        (boss &&
          boss.hp > 0 &&
          Math.hypot(boss.x - o.x, boss.y - o.y) < o.r + boss.radius) ||
        (epicBoss &&
          epicBoss.hp > 0 &&
          Math.hypot(epicBoss.x - o.x, epicBoss.y - o.y) <
            o.r + epicBoss.radius);
      const hitBot = enemies.some(
        (e) => Math.hypot(e.x - o.x, e.y - o.y) < o.r + e.radius,
      );
      const hitPlayer = Object.values(remotePlayers || {}).some(
        (rp) =>
          rp &&
          !rp.isStealthed &&
          Math.hypot(rp.x - o.x, rp.y - o.y) < o.r + rp.radius,
      );

      if (hitBoss || hitBot || hitPlayer || o.traveled >= o.maxDist) {
        const markedBots = new Set();
        const markedPlayers = new Set();

        enemies.forEach((e) => {
          if (Math.hypot(e.x - o.x, e.y - o.y) <= o.cageRadius + e.radius) {
            markedBots.add(e);
            this.applySpatialRift(e, 4.5);
          }
        });
        Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
          if (
            rp &&
            !rp.isStealthed &&
            Math.hypot(rp.x - o.x, rp.y - o.y) <= o.cageRadius + rp.radius
          ) {
            markedPlayers.add(id);
            this.applySpatialRift(rp, 4.5);
          }
        });

        this.semiDomains.push({
          x: o.x,
          y: o.y,
          radius: o.cageRadius,
          timer: 1.35,
          maxTimer: 1.35,
          crushDmg: o.crushDmg,
          markedBots,
          markedPlayers,
          v2Mode: o.v2Mode,
        });

        particleSystem.addShockwave(
          o.x,
          o.y,
          o.cageRadius,
          o.v2Mode !== "none" ? V2_PALETTE.border : "#ffbe0b",
        );
        eventBus.emit("SKILL_BROADCAST", {
          type: "space_semi_domain",
          x: o.x,
          y: o.y,
          maxR: o.cageRadius,
          duration: 1.35,
          color: o.v2Mode !== "none" ? V2_PALETTE.border : "#ffbe0b",
        });
        this.orbs.splice(i, 1);
      }
    }

    for (let i = this.semiDomains.length - 1; i >= 0; i--) {
      const sd = this.semiDomains[i];
      sd.timer -= dt;

      enemies.forEach((e) => {
        if (Math.hypot(e.x - sd.x, e.y - sd.y) <= sd.radius + e.radius) {
          sd.markedBots.add(e);
          this.applySpatialRift(e, 4.5);
        }
      });
      Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
        if (
          rp &&
          !rp.isStealthed &&
          Math.hypot(rp.x - sd.x, rp.y - sd.y) <= sd.radius + rp.radius
        ) {
          sd.markedPlayers.add(id);
          this.applySpatialRift(rp, 4.5);
        }
      });

      if (sd.timer <= 0) {
        this.damageBossIfHit(
          boss,
          sd.x,
          sd.y,
          sd.radius,
          sd.crushDmg * 1.6,
          player,
          particleSystem,
          camera,
          epicBoss,
          epicBossSystem,
        );

        sd.markedBots.forEach((e) => {
          e.x = sd.x + (Math.random() - 0.5) * 20;
          e.y = sd.y + (Math.random() - 0.5) * 20;
          e.stunTimer = 1.6;
          e.radius = Math.max(10, e.radius * 0.65);
        });

        sd.markedPlayers.forEach((id) => {
          const rp = remotePlayers?.[id];
          if (rp && !rp.invincibleTimer) {
            const counterMult = getCounterMultiplier(
              player.species,
              rp.species,
            );
            const finalDmg = Math.round(sd.crushDmg * counterMult);
            eventBus.emit("PVP_ATTACK", {
              targetId: id,
              dmg: finalDmg,
              isCrit: true,
              fromX: sd.x,
              fromY: sd.y,
              attackerName: player.name,
              targetX: sd.x,
              targetY: sd.y,
            });
          }
        });

        this.implosions.push({
          x: sd.x,
          y: sd.y,
          r: sd.radius * 0.85,
          life: 0.65,
          v2Mode: sd.v2Mode,
        });
        sound.playEvolution();
        camera.shake = 18;
        particleSystem.addShockwave(
          sd.x,
          sd.y,
          sd.radius * 1.15,
          sd.v2Mode !== "none" ? V2_PALETTE.accent : "#ff006e",
        );
        particleSystem.addFloatingText(
          sd.x,
          sd.y - 25,
          "🌀 GIẬT NGƯỢC & HẠ CẤP KHÔNG GIAN!",
          sd.v2Mode !== "none" ? V2_PALETTE.accent : "#ffbe0b",
        );

        eventBus.emit("SKILL_BROADCAST", {
          type: "space_crush",
          x: sd.x,
          y: sd.y,
          maxR: sd.radius,
          color: sd.v2Mode !== "none" ? V2_PALETTE.accent : "#ff006e",
        });

        this.semiDomains.splice(i, 1);
      }
    }

    for (let i = this.riftSlashes.length - 1; i >= 0; i--) {
      this.riftSlashes[i].life -= dt;
      if (this.riftSlashes[i].life <= 0) this.riftSlashes.splice(i, 1);
    }
    for (let i = this.implosions.length - 1; i >= 0; i--) {
      this.implosions[i].life -= dt;
      if (this.implosions[i].life <= 0) this.implosions.splice(i, 1);
    }
    for (let i = this.teleportPortals.length - 1; i >= 0; i--) {
      this.teleportPortals[i].life -= dt;
      if (this.teleportPortals[i].life <= 0) this.teleportPortals.splice(i, 1);
    }
  }

  drawWorldEffects(ctx, time, enemies = [], remotePlayers = {}) {
    if (this.domain) {
      const d = this.domain;
      const isV2 = d.v2Mode !== "none";
      ctx.save();
      ctx.translate(d.x, d.y);

      const spaceGrad = ctx.createRadialGradient(
        0,
        0,
        d.radius * 0.1,
        0,
        0,
        d.radius,
      );
      if (isV2) {
        spaceGrad.addColorStop(0, "rgba(40, 0, 20, 0.35)");
        spaceGrad.addColorStop(0.68, V2_PALETTE.fill);
        spaceGrad.addColorStop(1, "rgba(254, 228, 64, 0.68)");
      } else {
        spaceGrad.addColorStop(0, "rgba(16, 0, 43, 0.35)");
        spaceGrad.addColorStop(0.7, "rgba(60, 9, 108, 0.45)");
        spaceGrad.addColorStop(1, "rgba(157, 78, 221, 0.68)");
      }
      ctx.fillStyle = spaceGrad;
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time * 0.0012);
      ctx.strokeStyle = isV2 ? V2_PALETTE.accent : "#e0aaff";
      ctx.lineWidth = isV2 ? 5 : 4;
      ctx.setLineDash([24, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(-time * 0.002);
      ctx.strokeStyle = isV2 ? V2_PALETTE.border : "rgba(0, 245, 212, 0.55)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      for (let s = 0; s < 14; s++) {
        const ang = (s * Math.PI * 2) / 14 + time * 0.0005;
        const dist = d.radius * (0.25 + ((s * 37) % 65) / 100);
        ctx.fillStyle = isV2
          ? s % 2 === 0
            ? "#ff006e"
            : "#fee440"
          : s % 2 === 0
            ? "#00f5d4"
            : "#fee440";
        ctx.beginPath();
        ctx.arc(
          Math.cos(ang) * dist,
          Math.sin(ang) * dist,
          isV2 ? 3.5 : 2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      ctx.restore();
    }

    this.slashes.forEach((s) => {
      const isV2 = s.v2Mode !== "none";
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = isV2 ? V2_PALETTE.accent : "#e0aaff";
      ctx.fillStyle = isV2
        ? "rgba(255, 0, 110, 0.65)"
        : "rgba(157, 78, 221, 0.55)";
      ctx.lineWidth = isV2 ? 5 : 4;
      ctx.beginPath();
      ctx.arc(0, 0, s.size, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.quadraticCurveTo(
        s.size * 0.45,
        0,
        Math.cos(-Math.PI * 0.42) * s.size,
        Math.sin(-Math.PI * 0.42) * s.size,
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.riftSlashes.forEach((rs) => {
      const isV2 = rs.v2Mode !== "none";
      ctx.save();
      ctx.translate(rs.x, rs.y);
      ctx.rotate(rs.angle);
      ctx.globalAlpha = Math.min(1, rs.life * 2.5);
      ctx.strokeStyle = isV2 ? V2_PALETTE.accent : "#ff006e";
      ctx.lineWidth = isV2 ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(-rs.r, 0);
      ctx.lineTo(rs.r, 0);
      ctx.stroke();

      ctx.strokeStyle = isV2 ? V2_PALETTE.border : "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-rs.r * 0.85, 0);
      ctx.lineTo(rs.r * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    });

    this.orbs.forEach((o) => {
      const isV2 = o.v2Mode !== "none";
      ctx.save();
      ctx.translate(o.x, o.y);
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.45, isV2 ? V2_PALETTE.border : "#9d4edd");
      grad.addColorStop(1, "rgba(16, 0, 43, 0.85)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fee440";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    });

    this.semiDomains.forEach((sd) => {
      const isV2 = sd.v2Mode !== "none";
      ctx.save();
      const progress = 1 - sd.timer / sd.maxTimer;
      ctx.fillStyle = isV2
        ? "rgba(255, 0, 110, 0.25)"
        : "rgba(114, 9, 183, 0.25)";
      ctx.strokeStyle = isV2 ? V2_PALETTE.accent : "#ffbe0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, sd.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = isV2 ? V2_PALETTE.glow : "#ff006e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, sd.radius * (1 - progress), 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(254, 228, 64, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      sd.markedBots.forEach((e) => {
        ctx.beginPath();
        ctx.moveTo(sd.x, sd.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      });
      sd.markedPlayers.forEach((id) => {
        const rp = remotePlayers?.[id];
        if (rp) {
          ctx.beginPath();
          ctx.moveTo(sd.x, sd.y);
          ctx.lineTo(rp.x, rp.y);
          ctx.stroke();
        }
      });
      ctx.restore();
    });

    this.implosions.forEach((imp) => {
      const isV2 = imp.v2Mode !== "none";
      ctx.save();
      ctx.globalAlpha = Math.min(1, imp.life * 1.8);
      ctx.fillStyle = isV2 ? "rgba(120, 0, 40, 0.78)" : "rgba(16, 0, 43, 0.78)";
      ctx.strokeStyle = isV2 ? V2_PALETTE.accent : "#ff006e";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, imp.r * imp.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.teleportPortals.forEach((pt) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, pt.life * 2);
      ctx.strokeStyle = pt.v2 ? V2_PALETTE.accent : "#00f5d4";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    enemies.forEach((e) => {
      if (e.spatialRiftTimer > 0) {
        ctx.save();
        ctx.strokeStyle = "#e0aaff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(e.x - 12, e.y - e.radius - 12);
        ctx.lineTo(e.x + 12, e.y - e.radius - 4);
        ctx.moveTo(e.x + 12, e.y - e.radius - 12);
        ctx.lineTo(e.x - 12, e.y - e.radius - 4);
        ctx.stroke();
        ctx.restore();
      }
    });
  }
}
