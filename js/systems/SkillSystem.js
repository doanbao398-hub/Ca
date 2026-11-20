import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { getCounterMultiplier } from "../data/speciesConfig.js";
import { getWorldSize } from "../data/mapsConfig.js";

function getScaledSkillRadius(player, baseMult) {
  const worldSize = getWorldSize(player.selectedMap);
  const maxHalfMap = worldSize * 0.5;
  const minR = player.radius * baseMult;
  const t = (Math.min(100, Math.max(1, player.level || 1)) - 1) / 99;
  return Math.round(minR + (maxHalfMap - minR) * t);
}

const SKILL_HANDLERS = {
  dash_stun: (
    player,
    { enemies, remotePlayers, boss, epicBoss, epicBossSystem, particleSystem },
  ) => {
    const skillR = getScaledSkillRadius(player, 5);
    player.dashTimer = 0.45;
    particleSystem.addShockwave(player.x, player.y, skillR, "#00f5d4");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "⚡ XUNG KÍCH!",
      "#00f5d4",
    );
    if (
      boss &&
      boss.hp > 0 &&
      Math.hypot(boss.x - player.x, boss.y - player.y) < skillR + boss.radius
    ) {
      boss.hp -= 45 * player.bitePower;
      boss.stunTimer = 2.0;
    }
    if (
      epicBoss &&
      epicBoss.hp > 0 &&
      epicBossSystem &&
      Math.hypot(epicBoss.x - player.x, epicBoss.y - player.y) <
        skillR + epicBoss.radius
    ) {
      epicBossSystem.damageBoss(
        epicBoss,
        45 * player.bitePower,
        player,
        particleSystem,
      );
      epicBoss.stunTimer = Math.max(epicBoss.stunTimer || 0, 1.5);
    }
    enemies.forEach((e) => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < skillR) {
        e.stunTimer = 2.5;
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      if (
        rp &&
        !rp.invincibleTimer &&
        Math.hypot(rp.x - player.x, rp.y - player.y) < skillR
      ) {
        const counterMult = getCounterMultiplier(player.species, rp.species);
        const dmg = Math.round(22 * player.bitePower * counterMult);
        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg,
          isCrit: true,
          fromX: player.x,
          fromY: player.y,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });
      }
    });
    return skillR;
  },

  fortress_shield: (
    player,
    { enemies, remotePlayers, boss, epicBoss, epicBossSystem, particleSystem },
  ) => {
    const skillR = getScaledSkillRadius(player, 5.5);
    player.invincibleTimer = 3.5;
    eventBus.emit("FORCE_SYNC_PLAYER");
    particleSystem.addShockwave(player.x, player.y, skillR, "#2ec4b6");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "🛡️ MAI GIÁP BẤT TỬ!",
      "#2ec4b6",
    );
    if (
      boss &&
      boss.hp > 0 &&
      Math.hypot(boss.x - player.x, boss.y - player.y) < skillR + boss.radius
    ) {
      boss.hp -= 38 * player.bitePower;
      boss.stunTimer = 1.8;
    }
    if (
      epicBoss &&
      epicBoss.hp > 0 &&
      epicBossSystem &&
      Math.hypot(epicBoss.x - player.x, epicBoss.y - player.y) <
        skillR + epicBoss.radius
    ) {
      epicBossSystem.damageBoss(
        epicBoss,
        38 * player.bitePower,
        player,
        particleSystem,
      );
      epicBoss.stunTimer = Math.max(epicBoss.stunTimer || 0, 1.4);
    }
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < skillR && d > 0) {
        const ang = Math.atan2(e.y - player.y, e.x - player.x);
        e.x += Math.cos(ang) * 240;
        e.y += Math.sin(ang) * 240;
        e.stunTimer = 2.0;
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      const d = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (rp && !rp.invincibleTimer && d < skillR) {
        const counterMult = getCounterMultiplier(player.species, rp.species);
        const dmg = Math.round(18 * player.bitePower * counterMult);
        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg,
          isCrit: false,
          fromX: player.x,
          fromY: player.y,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });
      }
    });
    return skillR;
  },

  whirlpool_pull: (
    player,
    { enemies, remotePlayers, boss, epicBoss, epicBossSystem, particleSystem },
  ) => {
    const skillR = getScaledSkillRadius(player, 6.5);
    particleSystem.addShockwave(player.x, player.y, skillR, "#52b788");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "🌪️ XOÁY NƯỚC!",
      "#52b788",
    );
    if (
      boss &&
      boss.hp > 0 &&
      Math.hypot(boss.x - player.x, boss.y - player.y) < skillR + boss.radius
    ) {
      boss.hp -= 48 * player.bitePower;
      boss.stunTimer = 1.5;
    }
    if (
      epicBoss &&
      epicBoss.hp > 0 &&
      epicBossSystem &&
      Math.hypot(epicBoss.x - player.x, epicBoss.y - player.y) <
        skillR + epicBoss.radius
    ) {
      epicBossSystem.damageBoss(
        epicBoss,
        48 * player.bitePower,
        player,
        particleSystem,
      );
      epicBoss.stunTimer = Math.max(epicBoss.stunTimer || 0, 1.2);
    }
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < skillR && e.radius <= player.radius) {
        const pullAng = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(pullAng) * (d * 0.78);
        e.y += Math.sin(pullAng) * (d * 0.78);
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      const d = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (rp && !rp.invincibleTimer && d < skillR) {
        const counterMult = getCounterMultiplier(player.species, rp.species);
        const dmg = Math.round(24 * player.bitePower * counterMult);
        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg,
          isCrit: true,
          fromX: player.x,
          fromY: player.y,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });
      }
    });
    return skillR;
  },

  emp_pulse: (
    player,
    { enemies, remotePlayers, boss, epicBoss, epicBossSystem, particleSystem },
  ) => {
    const skillR = getScaledSkillRadius(player, 7);
    particleSystem.addShockwave(player.x, player.y, skillR, "#fee440");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "⚡ XUNG EMP!",
      "#fee440",
    );
    if (
      boss &&
      boss.hp > 0 &&
      Math.hypot(boss.x - player.x, boss.y - player.y) < skillR + boss.radius
    ) {
      boss.hp -= 50 * player.bitePower;
      boss.stunTimer = 2.8;
    }
    if (
      epicBoss &&
      epicBoss.hp > 0 &&
      epicBossSystem &&
      Math.hypot(epicBoss.x - player.x, epicBoss.y - player.y) <
        skillR + epicBoss.radius
    ) {
      epicBossSystem.damageBoss(
        epicBoss,
        50 * player.bitePower,
        player,
        particleSystem,
      );
      epicBoss.stunTimer = Math.max(epicBoss.stunTimer || 0, 2.0);
    }
    enemies.forEach((e) => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < skillR) {
        e.stunTimer = 3.5;
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      const d = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (rp && !rp.invincibleTimer && d < skillR) {
        const counterMult = getCounterMultiplier(player.species, rp.species);
        const dmg = Math.round(25 * player.bitePower * counterMult);
        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg,
          isCrit: true,
          fromX: player.x,
          fromY: player.y,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });
      }
    });
    return skillR;
  },
};

export function triggerPlayerSkill(player, context) {
  if (!player || player.skillCooldownTimer > 0) return;

  const syn = player.getSynergies();
  const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;

  player.skillCooldownTimer =
    player.cfg.skillCooldown * player.cdrMult * synCdr;
  sound.playSkill();
  context.camera.shake = 10;
  eventBus.emit("HIT_STOP", 0.035);

  const handler = SKILL_HANDLERS[player.cfg.skillId];
  const broadcastR = handler
    ? handler(player, context)
    : getScaledSkillRadius(player, 5.5);

  eventBus.emit("SKILL_BROADCAST", {
    type: "wave",
    x: player.x,
    y: player.y,
    maxR: broadcastR,
    color: player.colors.primary,
  });

  if (player.hasSuperAugment("s_sonic_resonance") || syn.elemental >= 3) {
    setTimeout(() => {
      if (!player) return;
      context.particleSystem.addShockwave(
        player.x,
        player.y,
        broadcastR * 1.15,
        "#00f5d4",
      );
      context.enemies.forEach((e) => {
        if (Math.hypot(e.x - player.x, e.y - player.y) < broadcastR * 1.15) {
          e.stunTimer = Math.max(e.stunTimer, 1.5);
        }
      });
    }, 220);
  }

  eventBus.emit("SKILL_USED_FOR_QUEST");
}
