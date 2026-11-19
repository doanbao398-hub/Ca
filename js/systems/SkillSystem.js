import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";

const SKILL_HANDLERS = {
  dash_stun: (player, { enemies, remotePlayers, particleSystem }) => {
    player.dashTimer = 0.45;
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 5,
      "#00f5d4",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "⚡ XUNG KÍCH!",
      "#00f5d4",
    );
    enemies.forEach((e) => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < player.radius * 5) {
        e.stunTimer = 2.5;
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      if (
        rp &&
        !rp.invincibleTimer &&
        Math.hypot(rp.x - player.x, rp.y - player.y) < player.radius * 5
      ) {
        const dmg = Math.round(22 * player.bitePower);
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
  },

  fortress_shield: (player, { enemies, remotePlayers, particleSystem }) => {
    player.invincibleTimer = 3.5;
    eventBus.emit("FORCE_SYNC_PLAYER");
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 5.5,
      "#2ec4b6",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "🛡️ MAI GIÁP BẤT TỬ!",
      "#2ec4b6",
    );
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < player.radius * 5.5 && d > 0) {
        const ang = Math.atan2(e.y - player.y, e.x - player.x);
        e.x += Math.cos(ang) * 240;
        e.y += Math.sin(ang) * 240;
        e.stunTimer = 2.0;
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      const d = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (rp && !rp.invincibleTimer && d < player.radius * 5.5) {
        const dmg = Math.round(18 * player.bitePower);
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
  },

  whirlpool_pull: (player, { enemies, remotePlayers, particleSystem }) => {
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 6.5,
      "#52b788",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "🌪️ XOÁY NƯỚC!",
      "#52b788",
    );
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < player.radius * 6.5 && e.radius <= player.radius) {
        const pullAng = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(pullAng) * (d * 0.78);
        e.y += Math.sin(pullAng) * (d * 0.78);
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      const d = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (rp && !rp.invincibleTimer && d < player.radius * 6.5) {
        const dmg = Math.round(24 * player.bitePower);
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
  },

  emp_pulse: (player, { enemies, remotePlayers, particleSystem }) => {
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 7,
      "#fee440",
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "⚡ XUNG EMP!",
      "#fee440",
    );
    enemies.forEach((e) => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < player.radius * 7) {
        e.stunTimer = 3.5;
      }
    });
    Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
      const d = Math.hypot(rp.x - player.x, rp.y - player.y);
      if (rp && !rp.invincibleTimer && d < player.radius * 7) {
        const dmg = Math.round(25 * player.bitePower);
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
  },
};

export function triggerPlayerSkill(player, context) {
  if (!player || player.skillCooldownTimer > 0) return;

  player.skillCooldownTimer = player.cfg.skillCooldown * player.cdrMult;
  sound.playSkill();
  context.camera.shake = 10;
  eventBus.emit("HIT_STOP", 0.035);

  eventBus.emit("SKILL_BROADCAST", {
    x: player.x,
    y: player.y,
    maxR: player.radius * 5.5,
    color: player.colors.primary,
  });

  const handler = SKILL_HANDLERS[player.cfg.skillId];
  if (handler) {
    handler(player, context);
  }

  eventBus.emit("SKILL_USED_FOR_QUEST");
}
