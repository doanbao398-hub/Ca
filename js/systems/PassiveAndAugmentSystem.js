import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";

export class PassiveAndAugmentSystem {
  constructor() {
    this.magmaPools = [];
  }

  clear() {
    this.magmaPools = [];
  }

  update(dt, state) {
    const {
      player,
      enemies,
      remotePlayers,
      boss,
      pearls,
      particleSystem,
      camera,
      input,
    } = state;

    if (!player) return;
    const ps = player.passiveState;
    const syn = player.getSynergies();

    if (player.species === "fish") {
      if (player.evoStage >= 2) {
        if (input?.wantsBoost && !player.isExhausted) {
          ps.highSpeedTime += dt;
          if (ps.highSpeedTime >= 1.5 && !ps.fishPiercingReady) {
            ps.fishPiercingReady = true;
            particleSystem.addFloatingText(
              player.x,
              player.y - player.radius - 16,
              "🗡️ MŨI KIẾM XUYÊN GIÁP SẴN SÀNG!",
              "#00f5d4",
            );
          }
        } else {
          ps.highSpeedTime = 0;
        }
      }

      if (player.evoStage >= 4) {
        const nearbyEnemies = enemies.filter(
          (e) => Math.hypot(e.x - player.x, e.y - player.y) < 380,
        );
        player.loneHunterBonus = nearbyEnemies.length === 1 ? 0.22 : 0;
      }

      if (player.evoStage >= 8) {
        Object.entries(remotePlayers).forEach(([id, rp]) => {
          if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
          const dist = Math.hypot(rp.x - player.x, rp.y - player.y);
          if (
            dist < player.radius + rp.radius + 95 &&
            rp.hp > 0 &&
            rp.hp <= rp.maxHp * 0.25
          ) {
            eventBus.emit("PVP_ATTACK", {
              targetId: id,
              dmg: Math.ceil(rp.hp + 10),
              isCrit: true,
              fromX: player.x,
              fromY: player.y,
              attackerName: player.name,
              targetX: rp.x,
              targetY: rp.y,
            });
            player.stamina = player.maxStamina;
            sound.playSkill();
            particleSystem.addShockwave(rp.x, rp.y, 160, "#fee440");
            particleSystem.addFloatingText(
              rp.x,
              rp.y - 25,
              "⚡ NHẤT KIẾM ĐOẠT MỆNH!",
              "#fee440",
            );
          }
        });
      }
    }

    if (player.species === "turtle") {
      if (player.evoStage >= 2 && !ps.turtleShieldReady) {
        ps.turtleShieldCd -= dt;
        if (ps.turtleShieldCd <= 0) {
          ps.turtleShieldReady = true;
          particleSystem.addFloatingText(
            player.x,
            player.y - player.radius - 16,
            "🛡️ MAI GIÁP HẤP THỤ ĐÃ HỒI!",
            "#00f5d4",
          );
        }
      }

      if (player.evoStage >= 4) {
        if (!input?.wantsBoost) {
          ps.lowSpeedTime += dt;
          if (ps.lowSpeedTime >= 2.0 && player.hp < player.maxHp) {
            player.heal(player.maxHp * 0.04 * dt);
          }
        } else {
          ps.lowSpeedTime = 0;
        }
      }

      if (player.evoStage >= 6) {
        if (ps.turtleQuakeCd > 0) ps.turtleQuakeCd -= dt;
        const closeCount =
          enemies.filter(
            (e) =>
              Math.hypot(e.x - player.x, e.y - player.y) < player.radius + 170,
          ).length +
          Object.values(remotePlayers).filter(
            (rp) =>
              rp &&
              Math.hypot(rp.x - player.x, rp.y - player.y) <
                player.radius + 170,
          ).length;

        if (closeCount >= 2 && ps.turtleQuakeCd <= 0) {
          ps.turtleQuakeCd = 9.0;
          sound.playSkill();
          camera.shake = 12;
          particleSystem.addShockwave(
            player.x,
            player.y,
            player.radius + 220,
            "#06d6a0",
          );
          particleSystem.addFloatingText(
            player.x,
            player.y - player.radius - 20,
            "🌊 ĐỊA CHẤN HẢI QUY!",
            "#06d6a0",
          );
          enemies.forEach((e) => {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < player.radius + 220 && d > 0) {
              e.stunTimer = 1.2;
              const ang = Math.atan2(e.y - player.y, e.x - player.x);
              e.x += Math.cos(ang) * 130;
              e.y += Math.sin(ang) * 130;
            }
          });
        }
      }

      if (ps.turtleUndyingCd > 0) ps.turtleUndyingCd -= dt;
    }

    if (player.species === "croc") {
      if (player.evoStage >= 6) {
        player.crocFrenzyActive = player.hp < player.maxHp * 0.5;
      }

      if (player.evoStage >= 8) {
        ps.crocJawsTimer += dt;
        if (ps.crocJawsTimer >= 10.0) {
          const target = enemies.find(
            (e) => Math.hypot(e.x - player.x, e.y - player.y) < 340,
          );
          if (target) {
            ps.crocJawsTimer = 0;
            sound.playEat(3);
            particleSystem.addShockwave(target.x, target.y, 120, "#ff006e");
            particleSystem.addFloatingText(
              target.x,
              target.y - 20,
              "🐊 ÁC MỘNG VỰC SÂU!",
              "#ff006e",
            );
            target.stunTimer = 1.5;
            target.radius *= 0.72;
          }
        }
      }
    }

    if (player.species === "diver") {
      if (player.evoStage >= 2) {
        ps.radarTimer += dt;
        if (ps.radarTimer >= 8.0) {
          ps.radarTimer = 0;
          particleSystem.addShockwave(player.x, player.y, 420, "#00bbf9");
          pearls.forEach((p) => {
            if (Math.hypot(p.x - player.x, p.y - player.y) < 450) {
              p.x += (player.x - p.x) * 0.55;
              p.y += (player.y - p.y) * 0.55;
            }
          });
        }
      }

      if (player.evoStage >= 4) {
        ps.droneTimer += dt;
        if (ps.droneTimer >= 1.5) {
          const nearBot = enemies.find(
            (e) => Math.hypot(e.x - player.x, e.y - player.y) < 320,
          );
          if (nearBot) {
            ps.droneTimer = 0;
            nearBot.radius = Math.max(10, nearBot.radius * 0.88);
            particleSystem.addFloatingText(
              nearBot.x,
              nearBot.y - 12,
              "🛸 LASER!",
              "#00f5d4",
            );
          }
        }
      }

      if (player.evoStage >= 6) {
        ps.outOfCombatTime += dt;
        if (ps.outOfCombatTime >= 4.0) {
          ps.diverNanoShield = true;
        }
      }

      if (player.evoStage >= 8 && (player.rage >= 80 || player.ultTimer > 0)) {
        ps.orbitalTimer += dt;
        if (ps.orbitalTimer >= 2.2) {
          ps.orbitalTimer = 0;
          const targetBossOrBot = boss || enemies[0];
          if (targetBossOrBot) {
            if (targetBossOrBot === boss) {
              boss.hp -= 55 * player.bitePower;
            } else {
              targetBossOrBot.radius *= 0.7;
            }
            particleSystem.addShockwave(
              targetBossOrBot.x,
              targetBossOrBot.y,
              150,
              "#fee440",
            );
            particleSystem.addFloatingText(
              targetBossOrBot.x,
              targetBossOrBot.y - 25,
              "🛰️ PHÁO ORBITAL!",
              "#fee440",
            );
          }
        }
      }
    }

    if (player.hasSuperAugment("s_thunder_lord")) {
      ps.thunderTimer += dt;
      if (ps.thunderTimer >= 4.0) {
        const targets = enemies
          .filter((e) => Math.hypot(e.x - player.x, e.y - player.y) < 360)
          .slice(0, 3);
        if (targets.length > 0) {
          ps.thunderTimer = 0;
          sound.playSkill();
          targets.forEach((t) => {
            t.stunTimer = 0.6;
            t.radius = Math.max(10, t.radius * 0.86);
            particleSystem.addFloatingText(
              t.x,
              t.y - 15,
              "⚡ SÉT GIẬT!",
              "#fee440",
            );
          });
        }
      }
    }

    if (player.hasSuperAugment("s_abyss_frost")) {
      enemies.forEach((e) => {
        if (Math.hypot(e.x - player.x, e.y - player.y) < player.radius + 180) {
          e.x -= Math.cos(e.angle) * 0.65;
          e.y -= Math.sin(e.angle) * 0.65;
        }
      });
    }

    if (player.hasSuperAugment("s_magma_trail") && input?.wantsBoost) {
      ps.magmaTimer += dt;
      if (ps.magmaTimer >= 0.25) {
        ps.magmaTimer = 0;
        this.magmaPools.push({
          x: player.x - Math.cos(player.angle) * player.radius,
          y: player.y - Math.sin(player.angle) * player.radius,
          r: Math.max(22, player.radius * 0.45),
          life: 2.5,
        });
      }
    }

    for (let i = this.magmaPools.length - 1; i >= 0; i--) {
      const m = this.magmaPools[i];
      m.life -= dt;
      enemies.forEach((e) => {
        if (Math.hypot(e.x - m.x, e.y - m.y) < m.r + e.radius) {
          e.radius = Math.max(10, e.radius - 6 * dt);
        }
      });
      if (m.life <= 0) this.magmaPools.splice(i, 1);
    }

    if (syn.empowerment >= 3) {
      ps.empShockTimer += dt;
      if (ps.empShockTimer >= 5.0) {
        ps.empShockTimer = 0;
        particleSystem.addShockwave(
          player.x,
          player.y,
          player.radius + 190,
          "#ff5400",
        );
        enemies.forEach((e) => {
          const d = Math.hypot(e.x - player.x, e.y - player.y);
          if (d < player.radius + 190 && d > 0) {
            const ang = Math.atan2(e.y - player.y, e.x - player.x);
            e.x += Math.cos(ang) * 95;
            e.y += Math.sin(ang) * 95;
          }
        });
      }
    }

    if (syn.elemental >= 4 && player.ultTimer > 0) {
      ps.ultOrbTimer += dt;
      if (ps.ultOrbTimer >= 0.6) {
        ps.ultOrbTimer = 0;
        const target = enemies[0];
        if (target) {
          target.radius = Math.max(10, target.radius * 0.8);
          particleSystem.addShockwave(target.x, target.y, 90, "#00f5d4");
        }
      }
    }
  }

  drawWorldEffects(ctx) {
    if (!this.magmaPools.length) return;
    ctx.save();
    this.magmaPools.forEach((m) => {
      ctx.fillStyle = `rgba(255, 84, 0, ${Math.min(0.55, m.life * 0.25)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

