import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { storage } from "../core/StorageManager.js";
import { MeatChunk, Pearl } from "../entities/Pickups.js";

const STREAK_LABELS = {
  3: "🔥 TRIPLE KILL!",
  5: "⚡ RAMPAGE! (5 HẠ GỤC)",
  8: "👑 UNSTOPPABLE! (8 HẠ GỤC)",
  12: "🐉 GODLIKE! (12 HẠ GỤC)",
};

export class CombatSystem {
  constructor() {
    this.comboCount = 0;
    this.comboTimer = 0;
    this.fishEatenCount = 0;
    this.killStreak = 0;
  }

  reset() {
    this.comboCount = 0;
    this.comboTimer = 0;
    this.fishEatenCount = 0;
    this.killStreak = 0;
  }

  update(dt, state) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    const {
      player,
      pearls,
      meatChunks,
      enemies,
      remotePlayers,
      boss,
      particleSystem,
      camera,
      worldEvent,
      selectedMap,
      time,
    } = state;

    if (!player) return;

    // 1. Nhặt Ngọc Trai
    for (let i = pearls.length - 1; i >= 0; i--) {
      const p = pearls[i];
      const d = Math.hypot(player.x - p.x, player.y - p.y);
      if (d < player.radius + player.magnetRadius) {
        p.x += (player.x - p.x) * 0.14;
        p.y += (player.y - p.y) * 0.14;
      }
      if (d < player.radius + p.radius + 8) {
        sound.playEat(1);
        const pearlPts = 75 + player.level * 4;
        player.addScore(
          pearlPts,
          worldEvent,
          selectedMap,
          particleSystem,
          camera,
        );
        player.heal(10);
        eventBus.emit("QUEST_PROGRESS", { id: "q2_pearls", amount: 1 });
        particleSystem.addFloatingText(
          p.x,
          p.y,
          `+${pearlPts} Ngọc Trai`,
          "#fee440",
        );
        pearls.splice(i, 1);
        pearls.push(new Pearl());
      }
    }

    // 2. Nhặt Thịt Rơi
    for (let i = meatChunks.length - 1; i >= 0; i--) {
      const m = meatChunks[i];
      const d = Math.hypot(player.x - m.x, player.y - m.y);
      if (d < player.radius + player.magnetRadius) {
        m.x += (player.x - m.x) * 0.16;
        m.y += (player.y - m.y) * 0.16;
      }
      if (d < player.radius + m.radius + 6) {
        sound.playEat(2);
        player.addScore(m.pts, worldEvent, selectedMap, particleSystem, camera);
        player.heal(14);
        particleSystem.addFloatingText(m.x, m.y, `+${m.pts} Thịt`, "#ff758f");
        meatChunks.splice(i, 1);
      }
    }

    // 3. Va chạm Boss Leviathan
    if (boss) {
      const distBoss = Math.hypot(player.x - boss.x, player.y - boss.y);
      if (distBoss < (player.radius + boss.radius) * 0.78) {
        const bossTailX = boss.x - Math.cos(boss.angle) * boss.radius * 0.9;
        const bossTailY = boss.y - Math.sin(boss.angle) * boss.radius * 0.9;
        const hitTail =
          Math.hypot(player.x - bossTailX, player.y - bossTailY) <
          boss.radius * 0.75;

        if (
          hitTail ||
          player.ultTimer > 0 ||
          player.dashTimer > 0 ||
          player.radius >= boss.radius * 1.1
        ) {
          const dmg = 32 * player.bitePower;
          boss.hp -= dmg;
          sound.playEat(3);
          camera.shake = 12;
          meatChunks.push(new MeatChunk(bossTailX, bossTailY, 120));
          particleSystem.addFloatingText(
            boss.x,
            boss.y - boss.radius,
            `💥 -${Math.round(dmg)}!`,
            "#fee440",
          );
          const bounce = Math.atan2(player.y - boss.y, player.x - boss.x);
          player.x += Math.cos(bounce) * 60;
          player.y += Math.sin(bounce) * 60;

          if (boss.hp <= 0) {
            storage.data.bossKills++;
            storage.data.gems += 150;
            storage.save();
            player.addScore(
              2500,
              worldEvent,
              selectedMap,
              particleSystem,
              camera,
            );
            sound.playEvolution();
            particleSystem.addShockwave(boss.x, boss.y, 450, "#ff006e");
            eventBus.emit(
              "SHOW_BANNER",
              "🏆 BẠN ĐÃ HẠ GỤC LEVIATHAN (+2500 XP & +150 💎)!",
            );
            eventBus.emit("BOSS_KILLED");
          }
        } else {
          player.takeDamage(
            35,
            boss.x,
            boss.y,
            "Leviathan Chúa Tể",
            particleSystem,
            camera,
          );
        }
      }
    }

    // 4. Va chạm Bot AI
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dist = Math.hypot(player.x - e.x, player.y - e.y);
      const hitBox =
        (player.radius * player.cfg.eatRangeMult + e.radius) * 0.76;

      if (dist < hitBox) {
        if (e.species === "puffer" && e.puffed && player.ultTimer <= 0) {
          player.takeDamage(18, e.x, e.y, "Cá Nóc Gai", particleSystem, camera);
          continue;
        }

        if (
          player.radius >= e.radius * 0.96 ||
          player.dashTimer > 0 ||
          player.ultTimer > 0
        ) {
          this.comboCount++;
          this.comboTimer = 3.0;
          this.fishEatenCount++;
          const comboBonus = this.comboCount > 1 ? this.comboCount * 8 : 0;
          const pts = Math.ceil(e.radius * 1.6) + comboBonus;

          player.addScore(pts, worldEvent, selectedMap, particleSystem, camera);
          player.heal(player.lifeSteal);
          sound.playEat(this.comboCount);
          eventBus.emit("ENEMY_EATEN");

          for (let k = 0; k < 10; k++) {
            particleSystem.addParticle(
              e.x,
              e.y,
              e.colors.primary,
              Math.random() * 4 + 1,
              3.5,
            );
          }
          const label =
            this.comboCount > 1 ? `+${pts} (x${this.comboCount})` : `+${pts}`;
          particleSystem.addFloatingText(
            e.x,
            e.y,
            label,
            this.comboCount > 1 ? "#fee440" : "#00f5d4",
          );
          enemies.splice(i, 1);
        } else {
          const tailX = e.x - Math.cos(e.angle) * e.radius * 0.95;
          const tailY = e.y - Math.sin(e.angle) * e.radius * 0.95;
          const hitTail =
            Math.hypot(player.x - tailX, player.y - tailY) < e.radius * 0.7;

          if (hitTail && e.radius <= player.radius * 1.75) {
            e.radius *= 0.82;
            e.stunTimer = 1.5;
            sound.playEat(2);
            meatChunks.push(new MeatChunk(tailX, tailY, 65));
            particleSystem.addFloatingText(
              tailX,
              tailY,
              "🦷 CẮN ĐUÔI!",
              "#fee440",
            );
            const bounce = Math.atan2(player.y - e.y, player.x - e.x);
            player.x += Math.cos(bounce) * 55;
            player.y += Math.sin(bounce) * 55;
          } else {
            player.takeDamage(
              25,
              e.x,
              e.y,
              e.name || "Quái Vật Biển",
              particleSystem,
              camera,
            );
          }
        }
      }
    }

    // 5. Va chạm PvP Người chơi Online
    Object.entries(remotePlayers).forEach(([id, rp]) => {
      if (!rp || rp.isStealthed) return;

      const dx = rp.x - player.x;
      const dy = rp.y - player.y;
      const dist = Math.hypot(dx, dy);
      const hitBox =
        (player.radius * player.cfg.eatRangeMult + rp.radius) * 0.82;

      if (dist >= hitBox || dist === 0) return;

      const angleToTarget = Math.atan2(dy, dx);
      let angleDiff = angleToTarget - player.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const isFacingTarget =
        Math.abs(angleDiff) < 1.15 ||
        player.dashTimer > 0 ||
        player.ultTimer > 0;

      const pushAng = Math.atan2(player.y - rp.y, player.x - rp.x);
      const overlap = hitBox - dist;
      player.x += Math.cos(pushAng) * (overlap * 0.5 + 4);
      player.y += Math.sin(pushAng) * (overlap * 0.5 + 4);

      if (rp.invincibleTimer > 0 || !isFacingTarget) return;
      if (rp.lastHitTime && time - rp.lastHitTime <= 750) return;

      const tailX = rp.x - Math.cos(rp.angle) * rp.radius * 0.9;
      const tailY = rp.y - Math.sin(rp.angle) * rp.radius * 0.9;
      const hitTail =
        Math.hypot(player.x - tailX, player.y - tailY) < rp.radius * 0.72;

      const isBiggerOrEqual =
        player.radius >= rp.radius * 0.92 ||
        player.ultTimer > 0 ||
        player.dashTimer > 0;

      if (!isBiggerOrEqual && hitTail) {
        rp.lastHitTime = time;
        rp.triggerHurtFlash();

        const tailDmg = Math.round(28 * player.bitePower);
        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg: tailDmg,
          isCrit: true,
          fromX: player.x,
          fromY: player.y,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });

        sound.playEat(3);
        camera.shake = 10;
        meatChunks.push(new MeatChunk(tailX, tailY, 80));
        particleSystem.addFloatingText(
          tailX,
          tailY - 15,
          `🦷 CẮN ĐUÔI -${tailDmg}!`,
          "#fee440",
        );

        player.x += Math.cos(pushAng) * 45;
        player.y += Math.sin(pushAng) * 45;
        return;
      }

      if (isBiggerOrEqual) {
        rp.lastHitTime = time;
        rp.triggerHurtFlash();

        const isCrit = player.dashTimer > 0 || player.ultTimer > 0;
        const finalDmg = Math.round(
          32 * player.bitePower * (isCrit ? 1.5 : 1.0),
        );

        const isLethal = rp.hp - finalDmg <= 0;
        let bonusScore = 150;
        if (isLethal) {
          this.killStreak++;
          player.bounty = (player.bounty || 0) + 1;
          storage.data.pvpKills = (storage.data.pvpKills || 0) + 1;

          if (STREAK_LABELS[this.killStreak]) {
            eventBus.emit(
              "SHOW_BANNER",
              `${STREAK_LABELS[this.killStreak]} - ${player.name.toUpperCase()}!`,
            );
          }

          if (rp.bounty >= 2) {
            bonusScore += 350;
            storage.data.gems += 40;
            eventBus.emit(
              "SHOW_BANNER",
              `👑 HẠ GỤC KẺ TRUY NÃ ${rp.name.toUpperCase()} (+40 💎)!`,
            );
          }
          storage.save();
        }

        eventBus.emit("PVP_ATTACK", {
          targetId: id,
          dmg: finalDmg,
          isCrit,
          fromX: player.x,
          fromY: player.y,
          attackerName: player.name,
          targetX: rp.x,
          targetY: rp.y,
        });

        player.addScore(
          bonusScore,
          worldEvent,
          selectedMap,
          particleSystem,
          camera,
        );
        player.heal(player.lifeSteal + 6);
        sound.playEat(isCrit ? 4 : 3);
        camera.shake = isCrit ? 14 : 8;

        particleSystem.addFloatingText(
          rp.x,
          rp.y - rp.radius - 12,
          isCrit ? `⚡ CHÍ MẠNG -${finalDmg}!` : `💥 -${finalDmg} HP`,
          isCrit ? "#fee440" : "#ff4d6d",
        );
        particleSystem.addShockwave(
          rp.x,
          rp.y,
          rp.radius * 2.1,
          isCrit ? "#fee440" : "#ff4d6d",
        );

        player.x += Math.cos(pushAng) * 30;
        player.y += Math.sin(pushAng) * 30;
      } else {
        rp.lastHitTime = time;
        player.x += Math.cos(pushAng) * 55;
        player.y += Math.sin(pushAng) * 55;
        particleSystem.addFloatingText(
          player.x,
          player.y - player.radius - 10,
          "🛡️ QUÁ LỚN! HÃY CẮN ĐUÔI!",
          "#90e0ef",
        );
      }
    });
  }
}
