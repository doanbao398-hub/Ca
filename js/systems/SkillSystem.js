import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";

const SKILL_HANDLERS = {
  dash_stun: (player, { enemies, particleSystem }) => {
    player.dashTimer = 0.45;
    particleSystem.addShockwave(player.x, player.y, player.radius * 5, "#00f5d4");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "⚡ XUNG KÍCH!",
      "#00f5d4"
    );
    enemies.forEach((e) => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < player.radius * 5) {
        e.stunTimer = 2.5;
      }
    });
  },

  fortress_shield: (player, { enemies, particleSystem }) => {
    player.invincibleTimer = 3.5;
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 5.5,
      "#2ec4b6"
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "🛡️ MAI GIÁP BẤT TỬ!",
      "#2ec4b6"
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
  },

  whirlpool_pull: (player, { enemies, particleSystem }) => {
    particleSystem.addShockwave(
      player.x,
      player.y,
      player.radius * 6.5,
      "#52b788"
    );
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "🌪️ XOÁY NƯỚC!",
      "#52b788"
    );
    enemies.forEach((e) => {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < player.radius * 6.5 && e.radius <= player.radius) {
        const pullAng = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(pullAng) * (d * 0.78);
        e.y += Math.sin(pullAng) * (d * 0.78);
      }
    });
  },

  emp_pulse: (player, { enemies, particleSystem }) => {
    particleSystem.addShockwave(player.x, player.y, player.radius * 7, "#fee440");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 20,
      "⚡ XUNG EMP!",
      "#fee440"
    );
    enemies.forEach((e) => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < player.radius * 7) {
        e.stunTimer = 3.5;
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
