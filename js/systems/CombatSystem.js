import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { storage } from "../core/StorageManager.js";
import { MeatChunk, Pearl } from "../entities/Pickups.js";

export class CombatSystem {
  constructor() {
    this.comboCount = 0;
    this.comboTimer = 0;
    this.fishEatenCount = 0;
  }

  reset() {
    this.comboCount = 0;
    this.comboTimer = 0;
    this.fishEatenCount = 0;
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
        p.x += (player.x - p.x) * 0.12;
        p.y += (player.y - p.y) * 0.12;
      }
      if (d < player.radius + p.radius + 8) {
        sound.playEat(1);
        player.addScore(65, worldEvent, selectedMap);
        player.heal(8);
        eventBus.emit("QUEST_PROGRESS", { id: "q2_pearls", amount: 1 });
        particleSystem.addFloatingText(p.x, p.y, "+65 Ngọc Trai", "#fee440");
        pearls.splice(i, 1);
        pearls.push(new Pearl());
      }
    }

    // 2. Nhặt Thịt Rơi
    for (let i = meatChunks.length - 1; i >= 0; i--) {
      const m = meatChunks[i];
      const d = Math.hypot(player.x - m.x, player.y - m.y);
      if (d < player.radius + player.magnetRadius) {
        m.x += (player.x - m.x) * 0.14;
        m.y += (player.y - m.y) * 0.14;
      }
      if (d < player.radius + m.radius + 6) {
        sound.playEat(2);
        player.addScore(m.pts, worldEvent, selectedMap);
        player.heal(12);
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

        if (hitTail || player.ultTimer > 0 || player.dashTimer > 0) {
          const dmg = 28 * player.bitePower;
          boss.hp -= dmg;
          sound.playEat(3);
          camera.shake = 12;
          meatChunks.push(new MeatChunk(bossTailX, bossTailY, 85));
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
            storage.data.gems += 100;
            storage.save();
            player.addScore(1500, worldEvent, selectedMap);
            sound.playEvolution();
            particleSystem.addShockwave(boss.x, boss.y, 450, "#ff006e");
            eventBus.emit(
              "SHOW_BANNER",
              "🏆 BẠN ĐÃ HẠ GỤC LEVIATHAN (+1500 XP)!",
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
          const comboBonus = this.comboCount > 1 ? this.comboCount * 5 : 0;
          const pts = Math.ceil(e.radius * 1.4) + comboBonus;

          player.addScore(pts, worldEvent, selectedMap);
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

          if (hitTail && e.radius <= player.radius * 1.65) {
            e.radius *= 0.82;
            e.stunTimer = 1.5;
            sound.playEat(2);
            meatChunks.push(new MeatChunk(tailX, tailY, 45));
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

    // 5. Va chạm PvP Người chơi Online (Chuẩn Attacker-Authoritative + Cắn Miệng & Cắn Đuôi)
    Object.entries(remotePlayers).forEach(([id, rp]) => {
      if (!rp || rp.isStealthed) return;

      const dx = rp.x - player.x;
      const dy = rp.y - player.y;
      const dist = Math.hypot(dx, dy);
      const hitBox =
        (player.radius * player.cfg.eatRangeMult + rp.radius) * 0.82;

      if (dist >= hitBox || dist === 0) return;

      // Tính góc lệch giữa hướng miệng của bạn (player.angle) và hướng tới đối thủ
      const angleToTarget = Math.atan2(dy, dx);
      let angleDiff = angleToTarget - player.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      // Chỉ tính là chủ động tấn công nếu hướng miệng chĩa vào đối thủ (< 65 độ) hoặc đang Dash/Ultimate
      const isFacingTarget =
        Math.abs(angleDiff) < 1.15 ||
        player.dashTimer > 0 ||
        player.ultTimer > 0;

      // Đẩy vật lý nhẹ để 2 người chơi không dính chồng lên nhau
      const pushAng = Math.atan2(player.y - rp.y, player.x - rp.x);
      const overlap = hitBox - dist;
      player.x += Math.cos(pushAng) * (overlap * 0.5 + 4);
      player.y += Math.sin(pushAng) * (overlap * 0.5 + 4);

      // Nếu đối thủ đang bật khiên bất tử hoặc mình chỉ lướt ngang qua (không hướng miệng vào địch)
      if (rp.invincibleTimer > 0 || !isFacingTarget) return;

      // Cooldown giữa 2 nhát cắn lên cùng 1 mục tiêu (750ms)
      if (rp.lastHitTime && time - rp.lastHitTime <= 750) return;

      // Tọa độ vùng đuôi của đối thủ
      const tailX = rp.x - Math.cos(rp.angle) * rp.radius * 0.9;
      const tailY = rp.y - Math.sin(rp.angle) * rp.radius * 0.9;
      const hitTail =
        Math.hypot(player.x - tailX, player.y - tailY) < rp.radius * 0.72;

      const isBiggerOrEqual =
        player.radius >= rp.radius * 0.92 ||
        player.ultTimer > 0 ||
        player.dashTimer > 0;

      // TRƯỜNG HỢP 1: Nhỏ hơn đối thủ nhưng lách ra sau CẮN ĐUÔI thành công
      if (!isBiggerOrEqual && hitTail) {
        rp.lastHitTime = time;
        rp.triggerHurtFlash();

        const tailDmg = Math.round(26 * player.bitePower);
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
        meatChunks.push(new MeatChunk(tailX, tailY, 55));
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

      // TRƯỜNG HỢP 2: Lớn hơn hoặc ngang cơ -> Cắn trực diện gây sát thương
      if (isBiggerOrEqual) {
        rp.lastHitTime = time;
        rp.triggerHurtFlash();

        const isCrit = player.dashTimer > 0 || player.ultTimer > 0;
        const finalDmg = Math.round(
          30 * player.bitePower * (isCrit ? 1.5 : 1.0),
        );

        const isLethal = rp.hp - finalDmg <= 0;
        let bonusScore = 100;
        if (isLethal) {
          player.bounty = (player.bounty || 0) + 1;
          storage.data.pvpKills = (storage.data.pvpKills || 0) + 1;
          if (rp.bounty >= 2) {
            bonusScore += 250;
            storage.data.gems += 30;
            eventBus.emit(
              "SHOW_BANNER",
              `👑 HẠ GỤC KẺ TRUY NÃ ${rp.name.toUpperCase()} (+30 💎)!`,
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

        player.addScore(bonusScore, worldEvent, selectedMap);
        player.heal(player.lifeSteal + 5);
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
        // TRƯỜNG HỢP 3: Nhỏ hơn đối thủ và đâm thẳng vào đầu đối thủ -> Chỉ bật lùi lại, không mất máu vô lý
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
