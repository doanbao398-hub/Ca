import { EpicBoss } from "../entities/EpicBoss.js";
import { MAP_CONFIG } from "../data/mapsConfig.js";
import { BOSS_SKILL_IDS_BY_TYPE } from "../data/bossSkillsData.js";
import { getRandomItemConfig } from "../data/itemsData.js";
import { DroppedItem } from "../entities/Pickups.js";
import { renderCreatureBody } from "../graphics/CreatureRenderer.js";
import { eventBus } from "../core/EventBus.js";
import { sound } from "../core/SoundSystem.js";
import { storage } from "../core/StorageManager.js";

const ALL_MAPS = ["coral", "abyss", "swamp", "hybrid"];
const SPACE_SPAWN_INTERVAL_SEC = 15 * 60; // 15 phút / lần
const TIME_CHECK_INTERVAL_SEC = 60; // kiểm tra mỗi phút
const TIME_HOURLY_PROBABILITY = 0.02; // 2% mỗi giờ
const TIME_PER_MINUTE_PROB = 1 - Math.pow(1 - TIME_HOURLY_PROBABILITY, 1 / 60);

export class EpicBossSystem {
  constructor() {
    this.activeBosses = {
      space: null,
      time: null,
    };

    this.spaceSpawnTimer = SPACE_SPAWN_INTERVAL_SEC;
    this.timeCheckTimer = TIME_CHECK_INTERVAL_SEC;

    this.spaceDomain = null;
    this.spaceSlashes = [];
    this.spaceOrbs = [];
    this.spaceSemiDomains = [];
    this.spaceImplosions = [];

    this.timeDomain = null;
    this.timeClones = [];
    this.timeOrbs = [];
    this.timeCages = [];
  }

  clearMatchEffects() {
    this.spaceDomain = null;
    this.spaceSlashes = [];
    this.spaceOrbs = [];
    this.spaceSemiDomains = [];
    this.spaceImplosions = [];

    this.timeDomain = null;
    this.timeClones = [];
    this.timeOrbs = [];
    this.timeCages = [];
  }

  getActiveBossInMap(mapKey) {
    if (this.activeBosses.time && this.activeBosses.time.mapKey === mapKey) {
      return this.activeBosses.time;
    }
    if (this.activeBosses.space && this.activeBosses.space.mapKey === mapKey) {
      return this.activeBosses.space;
    }
    return null;
  }

  getAllActiveBossesInMap(mapKey) {
    const list = [];
    if (this.activeBosses.space && this.activeBosses.space.mapKey === mapKey) {
      list.push(this.activeBosses.space);
    }
    if (this.activeBosses.time && this.activeBosses.time.mapKey === mapKey) {
      list.push(this.activeBosses.time);
    }
    return list;
  }

  spawnEpicBoss(bossType, forcedMap = null) {
    const mapKey =
      forcedMap || ALL_MAPS[Math.floor(Math.random() * ALL_MAPS.length)];
    const boss = new EpicBoss(bossType, mapKey);
    this.activeBosses[bossType] = boss;

    if (bossType === "space") {
      this.spaceDomain = null;
      this.spaceSlashes = [];
      this.spaceOrbs = [];
      this.spaceSemiDomains = [];
      this.spaceImplosions = [];
    } else {
      this.timeDomain = null;
      this.timeClones = [];
      this.timeOrbs = [];
      this.timeCages = [];
    }

    const mapName = MAP_CONFIG[mapKey]?.name || mapKey;
    const isSpace = bossType === "space";
    const bannerText = isSpace
      ? `🌌 BOSS SỬ THI KHÔNG GIAN (Lv.50) ĐÃ XUẤT HIỆN TẠI: ${mapName.toUpperCase()}!`
      : `⏳ BOSS SỬ THI THỜI GIAN (Lv.75) ĐÃ GIÁNG LÂM TẠI: ${mapName.toUpperCase()}!`;

    const chatText = isSpace
      ? `🌌 [SỰ KIỆN THẾ GIỚI] Boss Sử Thi Không Gian (Lv.50) vừa xuất hiện tại bản đồ [${mapName}]! Mau đến tiêu diệt để nhận EXP & Lõi Skill!`
      : `⏳ [SỰ KIỆN HIẾM 2%] Boss Sử Thi Thời Gian (Lv.75) vừa giáng lâm tại bản đồ [${mapName}]!`;

    eventBus.emit("SHOW_BANNER", bannerText);
    eventBus.emit("CHAT_BOSS_SPAWN", {
      bossType,
      mapKey,
      mapName,
      text: chatText,
    });

    return boss;
  }

  updateScheduler(dt) {
    if (!this.activeBosses.space) {
      this.spaceSpawnTimer -= dt;
      if (this.spaceSpawnTimer <= 0) {
        this.spaceSpawnTimer = SPACE_SPAWN_INTERVAL_SEC;
        this.spawnEpicBoss("space");
      }
    }

    if (!this.activeBosses.time) {
      this.timeCheckTimer -= dt;
      if (this.timeCheckTimer <= 0) {
        this.timeCheckTimer = TIME_CHECK_INTERVAL_SEC;
        if (Math.random() < TIME_PER_MINUTE_PROB) {
          this.spawnEpicBoss("time");
        }
      }
    }
  }

  runBossSkillsAI(boss, player, particleSystem, camera) {
    const dist = Math.hypot(player.x - boss.x, player.y - boss.y);

    if (boss.bossType === "space") {
      // Skill 1: Bành trướng lãnh địa + Bước nhảy
      if (!this.spaceDomain && boss.skillCds.s1 <= 0 && dist < 850) {
        boss.skillCds.s1 = 15.0;
        const r = 460;
        this.spaceDomain = {
          x: boss.x,
          y: boss.y,
          radius: r,
          timer: 9.0,
        };
        sound.playEvolution();
        particleSystem.addShockwave(boss.x, boss.y, r, "#9d4edd");
        particleSystem.addFloatingText(
          boss.x,
          boss.y - boss.radius - 26,
          "🌌 BOSS: LÃNH ĐỊA KHÔNG GIAN!",
          "#e0aaff",
        );
      } else if (
        this.spaceDomain &&
        boss.skillCds.teleport <= 0 &&
        Math.hypot(
          player.x - this.spaceDomain.x,
          player.y - this.spaceDomain.y,
        ) <= this.spaceDomain.radius
      ) {
        boss.skillCds.teleport = 4.2;
        const ang = Math.atan2(player.y - boss.y, player.x - boss.x);
        const jumpX =
          player.x - Math.cos(ang) * (boss.radius + player.radius + 55);
        const jumpY =
          player.y - Math.sin(ang) * (boss.radius + player.radius + 55);
        if (
          Math.hypot(jumpX - this.spaceDomain.x, jumpY - this.spaceDomain.y) <=
          this.spaceDomain.radius - 30
        ) {
          particleSystem.addShockwave(boss.x, boss.y, 120, "#00f5d4");
          boss.x = jumpX;
          boss.y = jumpY;
          particleSystem.addShockwave(boss.x, boss.y, 140, "#00f5d4");
        }
      }

      // Skill 2: Lát Cắt Không Gian / Vết Nứt
      if (boss.skillCds.s2 <= 0 && dist < 950) {
        boss.skillCds.s2 = 5.5;
        const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
        this.spaceSlashes.push({
          x: boss.x + Math.cos(aim) * boss.radius,
          y: boss.y + Math.sin(aim) * boss.radius,
          angle: aim,
          speed: 13.5,
          size: 72,
          traveled: 0,
          maxRange: 980,
          hitPlayer: false,
        });
        sound.playSkill();
      }

      // Skill 3: Quả cầu Bán Lãnh Địa -> Giam & Bóp Méo
      if (boss.skillCds.s3 <= 0 && dist < 900) {
        boss.skillCds.s3 = 12.5;
        const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
        this.spaceOrbs.push({
          x: boss.x + Math.cos(aim) * (boss.radius + 16),
          y: boss.y + Math.sin(aim) * (boss.radius + 16),
          angle: aim,
          speed: 10.0,
          r: 22,
          traveled: 0,
          maxDist: Math.min(780, dist + 60),
          cageRadius: 240,
        });
      }
    } else if (boss.bossType === "time") {
      // Skill 3: Trường Thời Gian & Tua Ngược khi máu < 28%
      if (
        this.timeDomain &&
        !boss.rewindUsed &&
        boss.hp > 0 &&
        boss.hp <= boss.maxHp * 0.28
      ) {
        boss.rewindUsed = true;
        const snap = boss.historySnapshots[0];
        if (snap) {
          const oldX = boss.x;
          const oldY = boss.y;
          boss.x = snap.x;
          boss.y = snap.y;
          boss.hp = Math.min(
            boss.maxHp,
            Math.max(boss.hp, snap.hp) + boss.maxHp * 0.14,
          );
          particleSystem.addShockwave(oldX, oldY, 180, "#2dd4bf");
          particleSystem.addShockwave(boss.x, boss.y, 240, "#fef08a");
          particleSystem.addFloatingText(
            boss.x,
            boss.y - boss.radius - 26,
            "⏪ BOSS THỜI GIAN TUA NGƯỢC!",
            "#2dd4bf",
          );
        }
      }

      if (!this.timeDomain && boss.skillCds.s3 <= 0 && dist < 850) {
        boss.skillCds.s3 = 18.0;
        const r = 480;
        this.timeDomain = {
          x: boss.x,
          y: boss.y,
          radius: r,
          timer: 9.5,
        };
        sound.playEvolution();
        particleSystem.addShockwave(boss.x, boss.y, r, "#f59e0b");
        particleSystem.addFloatingText(
          boss.x,
          boss.y - boss.radius - 26,
          "🕰️ BOSS: TRƯỜNG THỜI GIAN!",
          "#fef08a",
        );
      }

      // Skill 1: Triệu hồi Bản Thể Quá Khứ & Tương Lai
      if (boss.skillCds.s1 <= 0 && dist < 950) {
        boss.skillCds.s1 = 14.0;
        this.timeClones = [
          {
            type: "past",
            x: boss.x - 90,
            y: boss.y - 60,
            angle: boss.angle,
            radius: 42,
            timer: 7.0,
            biteCd: 0,
            animPhase: 0,
          },
          {
            type: "future",
            x: boss.x + 90,
            y: boss.y + 60,
            angle: boss.angle,
            radius: 86,
            timer: 7.0,
            biteCd: 0,
            animPhase: Math.PI,
          },
        ];
        sound.playSkill();
        particleSystem.addFloatingText(
          boss.x,
          boss.y - boss.radius - 20,
          "⏳ BOSS TRIỆU HỒI BẢN THỂ ĐA CHIỀU!",
          "#fbbf24",
        );
      }

      // Skill 2: Cầu Ngưng Đọng -> Lồng Giam Thời Gian
      if (boss.skillCds.s2 <= 0 && dist < 950) {
        boss.skillCds.s2 = 9.5;
        const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
        this.timeOrbs.push({
          x: boss.x + Math.cos(aim) * (boss.radius + 14),
          y: boss.y + Math.sin(aim) * (boss.radius + 14),
          angle: aim,
          speed: 11.5,
          r: 20,
          traveled: 0,
          maxDist: Math.min(760, dist + 50),
          cageRadius: 230,
        });
      }
    }
  }

  update(dt, state) {
    const {
      player,
      selectedMap,
      droppedItems,
      particleSystem,
      camera,
      worldEvent,
    } = state;

    this.updateScheduler(dt);

    const bossesInMap = this.getAllActiveBossesInMap(selectedMap);
    const frameScale = dt * 60;

    bossesInMap.forEach((boss) => {
      boss.updateAI(dt, player, this, particleSystem, camera);

      if (player && player.hp > 0 && boss.meleeCd <= 0) {
        const d = Math.hypot(player.x - boss.x, player.y - boss.y);
        if (d < (player.radius + boss.radius) * 0.72) {
          boss.meleeCd = 1.1;
          player.takeDamage(
            boss.bossType === "space" ? 28 : 34,
            boss.x,
            boss.y,
            boss.name,
            particleSystem,
            camera,
          );
        }
      }
    });

    // Update Space Boss effects
    if (this.spaceDomain) {
      this.spaceDomain.timer -= dt;
      if (this.spaceDomain.timer <= 0) this.spaceDomain = null;
    }

    for (let i = this.spaceSlashes.length - 1; i >= 0; i--) {
      const s = this.spaceSlashes[i];
      const step = s.speed * frameScale;
      s.x += Math.cos(s.angle) * step;
      s.y += Math.sin(s.angle) * step;
      s.traveled += step;
      if (
        !s.hitPlayer &&
        player &&
        player.hp > 0 &&
        Math.hypot(player.x - s.x, player.y - s.y) < s.size + player.radius
      ) {
        s.hitPlayer = true;
        player.takeDamage(
          26,
          s.x,
          s.y,
          "Lát Cắt Boss Không Gian",
          particleSystem,
          camera,
        );
      }
      if (s.traveled >= s.maxRange) this.spaceSlashes.splice(i, 1);
    }

    for (let i = this.spaceOrbs.length - 1; i >= 0; i--) {
      const o = this.spaceOrbs[i];
      const step = o.speed * frameScale;
      o.x += Math.cos(o.angle) * step;
      o.y += Math.sin(o.angle) * step;
      o.traveled += step;

      const hit =
        player &&
        Math.hypot(player.x - o.x, player.y - o.y) < o.r + player.radius;
      if (hit || o.traveled >= o.maxDist) {
        this.spaceSemiDomains.push({
          x: o.x,
          y: o.y,
          radius: o.cageRadius,
          timer: 1.4,
          maxTimer: 1.4,
        });
        particleSystem.addShockwave(o.x, o.y, o.cageRadius, "#ffbe0b");
        this.spaceOrbs.splice(i, 1);
      }
    }

    for (let i = this.spaceSemiDomains.length - 1; i >= 0; i--) {
      const sd = this.spaceSemiDomains[i];
      sd.timer -= dt;
      if (sd.timer <= 0) {
        if (
          player &&
          player.hp > 0 &&
          Math.hypot(player.x - sd.x, player.y - sd.y) <=
            sd.radius + player.radius
        ) {
          player.takeDamage(
            38,
            sd.x,
            sd.y,
            "Hạ Cấp Boss Không Gian",
            particleSystem,
            camera,
          );
          player.stunTimer = Math.max(player.stunTimer || 0, 0.9);
        }
        this.spaceImplosions.push({
          x: sd.x,
          y: sd.y,
          r: sd.radius,
          life: 0.6,
        });
        particleSystem.addShockwave(sd.x, sd.y, sd.radius * 1.2, "#ff006e");
        this.spaceSemiDomains.splice(i, 1);
      }
    }

    for (let i = this.spaceImplosions.length - 1; i >= 0; i--) {
      this.spaceImplosions[i].life -= dt;
      if (this.spaceImplosions[i].life <= 0) this.spaceImplosions.splice(i, 1);
    }

    // Update Time Boss effects
    if (this.timeDomain) {
      this.timeDomain.timer -= dt;
      if (
        player &&
        Math.hypot(
          player.x - this.timeDomain.x,
          player.y - this.timeDomain.y,
        ) <= this.timeDomain.radius
      ) {
        player.x -= Math.cos(player.angle) * 1.15 * frameScale;
        player.y -= Math.sin(player.angle) * 1.15 * frameScale;
      }
      if (this.timeDomain.timer <= 0) this.timeDomain = null;
    }

    for (let i = this.timeClones.length - 1; i >= 0; i--) {
      const c = this.timeClones[i];
      c.timer -= dt;
      if (c.biteCd > 0) c.biteCd -= dt;
      if (player && player.hp > 0) {
        const ang = Math.atan2(player.y - c.y, player.x - c.x);
        let diff = ang - c.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        c.angle += diff * 0.12;
        const spd = c.type === "future" ? 4.4 : 4.9;
        c.x += Math.cos(c.angle) * spd * frameScale;
        c.y += Math.sin(c.angle) * spd * frameScale;

        if (
          c.biteCd <= 0 &&
          Math.hypot(player.x - c.x, player.y - c.y) < c.radius + player.radius
        ) {
          c.biteCd = 1.2;
          player.takeDamage(
            c.type === "future" ? 26 : 16,
            c.x,
            c.y,
            "Bản Thể Boss Thời Gian",
            particleSystem,
            camera,
          );
        }
      }
      c.animPhase += 0.25;
      if (c.timer <= 0) this.timeClones.splice(i, 1);
    }

    for (let i = this.timeOrbs.length - 1; i >= 0; i--) {
      const o = this.timeOrbs[i];
      const step = o.speed * frameScale;
      o.x += Math.cos(o.angle) * step;
      o.y += Math.sin(o.angle) * step;
      o.traveled += step;

      const hit =
        player &&
        Math.hypot(player.x - o.x, player.y - o.y) < o.r + player.radius;
      if (hit || o.traveled >= o.maxDist) {
        this.timeCages.push({
          x: o.x,
          y: o.y,
          radius: o.cageRadius,
          timer: 2.6,
        });
        particleSystem.addShockwave(o.x, o.y, o.cageRadius, "#2dd4bf");
        this.timeOrbs.splice(i, 1);
      }
    }

    for (let i = this.timeCages.length - 1; i >= 0; i--) {
      const cage = this.timeCages[i];
      cage.timer -= dt;
      if (
        player &&
        player.hp > 0 &&
        Math.hypot(player.x - cage.x, player.y - cage.y) <=
          cage.radius + player.radius * 0.5
      ) {
        player.x -= Math.cos(player.angle) * 2.1 * frameScale;
        player.y -= Math.sin(player.angle) * 2.1 * frameScale;
      }
      if (cage.timer <= 0) {
        if (
          player &&
          player.hp > 0 &&
          Math.hypot(player.x - cage.x, player.y - cage.y) <=
            cage.radius + player.radius
        ) {
          player.takeDamage(
            36,
            cage.x,
            cage.y,
            "Nghịch Lý Boss Thời Gian",
            particleSystem,
            camera,
          );
        }
        particleSystem.addShockwave(
          cage.x,
          cage.y,
          cage.radius * 1.25,
          "#f59e0b",
        );
        this.timeCages.splice(i, 1);
      }
    }

    // Kiểm tra Boss bị tiêu diệt
    bossesInMap.forEach((boss) => {
      if (boss.hp <= 0) {
        this.handleBossDefeated(
          boss,
          player,
          droppedItems,
          worldEvent,
          selectedMap,
          particleSystem,
          camera,
        );
      }
    });
  }

  damageBoss(boss, rawDmg, player, particleSystem) {
    if (!boss || boss.hp <= 0 || rawDmg <= 0) return;
    boss.hp -= rawDmg;
    boss.triggerHurtFlash?.();
    boss.hurtTimer = 0.25;
    boss.recordDamage(rawDmg);
    if (particleSystem) {
      particleSystem.addFloatingText(
        boss.x,
        boss.y - boss.radius - 14,
        `💥 -${Math.round(rawDmg)}`,
        boss.bossType === "space" ? "#e0aaff" : "#fef08a",
      );
    }
  }

  handleBossDefeated(
    boss,
    player,
    droppedItems,
    worldEvent,
    selectedMap,
    particleSystem,
    camera,
  ) {
    const bossType = boss.bossType;
    this.activeBosses[bossType] = null;
    this.clearMatchEffects();

    sound.playEvolution();
    if (camera) camera.shake = 22;
    if (particleSystem) {
      particleSystem.addShockwave(
        boss.x,
        boss.y,
        520,
        bossType === "space" ? "#9d4edd" : "#f59e0b",
      );
    }

    if (Array.isArray(droppedItems)) {
      for (let i = 0; i < 2; i++) {
        const rnd = getRandomItemConfig();
        droppedItems.push(
          new DroppedItem(
            boss.x + (Math.random() - 0.5) * 90,
            boss.y + (Math.random() - 0.5) * 90,
            rnd.id,
          ),
        );
      }
    }

    const ratio = boss.getLocalDamageRatio();
    if (player && ratio >= 0.15) {
      const expReward = bossType === "space" ? 8000 : 14000;
      const gemReward = bossType === "space" ? 200 : 350;

      storage.data.bossKills = (storage.data.bossKills || 0) + 1;
      storage.data.gems = (storage.data.gems || 0) + gemReward;
      storage.save();

      player.addScore(
        expReward,
        worldEvent,
        selectedMap,
        particleSystem,
        camera,
      );
      eventBus.emit(
        "SHOW_BANNER",
        `🏆 HẠ BOSS ${bossType === "space" ? "KHÔNG GIAN" : "THỜI GIAN"}! (+${expReward.toLocaleString()} XP & +${gemReward} 💎)`,
      );

      // Tỷ lệ rớt lõi skill 1–2% (1.5%)
      const dropChance = 0.015;
      if (Math.random() < dropChance) {
        this.triggerBossCoreDrop(bossType, player);
      }
    } else {
      eventBus.emit(
        "SHOW_BANNER",
        `⚔️ Boss ${bossType === "space" ? "Không Gian" : "Thời Gian"} đã bị tiêu diệt! (Cần ≥15% sát thương để nhận thưởng)`,
      );
    }
  }

  triggerBossCoreDrop(bossType, player) {
    if (!player) return;
    const pool = BOSS_SKILL_IDS_BY_TYPE[bossType] || [];
    const isSameSpecies = player.species === bossType;

    let selectedSkillId = null;
    let rewardMode = "unlock"; // "unlock" | "true_v2" | "limited_v2" | "mastery"

    if (isSameSpecies) {
      // Cùng hệ: đã có sẵn bộ skill gốc -> nâng cấp lên True V2
      const nonV2 = pool.filter((id) => player.getBossSkillTier(id) < 2);
      if (nonV2.length > 0) {
        selectedSkillId = nonV2[Math.floor(Math.random() * nonV2.length)];
        rewardMode = "true_v2";
      } else {
        rewardMode = "mastery";
      }
    } else {
      // Khác hệ: mở khóa dần các skill chưa có; mở full rồi thì kích hoạt V2 giới hạn
      const unowned = pool.filter((id) => player.getBossSkillTier(id) === 0);
      if (unowned.length > 0) {
        selectedSkillId = unowned[Math.floor(Math.random() * unowned.length)];
        rewardMode = "unlock";
      } else {
        const nonV2 = pool.filter((id) => player.getBossSkillTier(id) < 2);
        if (nonV2.length > 0) {
          selectedSkillId = nonV2[Math.floor(Math.random() * nonV2.length)];
          rewardMode = "limited_v2";
        } else {
          rewardMode = "mastery";
        }
      }
    }

    eventBus.emit("BOSS_CORE_DROPPED", {
      bossType,
      skillId: selectedSkillId,
      rewardMode,
    });
  }

  drawWorldEffects(ctx, selectedMap, time) {
    const bossesInMap = this.getAllActiveBossesInMap(selectedMap);

    // Space Boss effects
    if (this.spaceDomain) {
      const d = this.spaceDomain;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = "rgba(60, 9, 108, 0.34)";
      ctx.strokeStyle = "#e0aaff";
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    this.spaceSlashes.forEach((s) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = "#ff006e";
      ctx.fillStyle = "rgba(157, 78, 221, 0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, s.size, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.spaceOrbs.forEach((o) => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.fillStyle = "#9d4edd";
      ctx.strokeStyle = "#ffbe0b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.spaceSemiDomains.forEach((sd) => {
      ctx.save();
      ctx.fillStyle = "rgba(255, 0, 110, 0.16)";
      ctx.strokeStyle = "#ff006e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, sd.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.spaceImplosions.forEach((imp) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, imp.life * 1.8);
      ctx.fillStyle = "rgba(255, 0, 110, 0.45)";
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, imp.r * imp.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Time Boss effects
    if (this.timeDomain) {
      const d = this.timeDomain;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    this.timeOrbs.forEach((o) => {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.fillStyle = "#2dd4bf";
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.timeCages.forEach((cage) => {
      ctx.save();
      ctx.fillStyle = "rgba(45, 212, 191, 0.22)";
      ctx.strokeStyle = "#2dd4bf";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(cage.x, cage.y, cage.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    this.timeClones.forEach((c) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.globalAlpha = 0.85;
      ctx.rotate(c.angle);
      if (Math.abs(c.angle) > Math.PI / 2) ctx.scale(1, -1);
      const cloneColors =
        c.type === "past"
          ? { primary: "#f59e0b", secondary: "#78350f", accent: "#fef08a" }
          : { primary: "#2dd4bf", secondary: "#115e59", accent: "#ccfbf1" };
      renderCreatureBody(
        ctx,
        { species: "time", evoStage: 6 },
        c.radius,
        Math.sin(c.animPhase) * (c.radius * 0.25),
        cloneColors,
      );
      ctx.restore();
    });

    // Vẽ Boss Sử Thi trong map hiện tại
    bossesInMap.forEach((boss) => {
      boss.draw(ctx, time, true);
      boss.drawBossBar(ctx);
    });
  }

  // MŨI TÊN ĐỎ CHỈ HƯỚNG BOSS SỬ THI KHI CÙNG MAP
  drawBossDirectionArrow(
    ctx,
    player,
    selectedMap,
    camera,
    width,
    height,
    time,
  ) {
    if (!player) return;
    const bossesInMap = this.getAllActiveBossesInMap(selectedMap);
    if (!bossesInMap.length) return;

    bossesInMap.forEach((boss) => {
      const ang = Math.atan2(boss.y - player.y, boss.x - player.x);
      const dist = Math.round(Math.hypot(boss.x - player.x, boss.y - player.y));
      const screenX = (boss.x - camera.x) * camera.zoom + width / 2;
      const screenY = (boss.y - camera.y) * camera.zoom + height / 2;
      const isOffscreen =
        screenX < 30 ||
        screenX > width - 30 ||
        screenY < 30 ||
        screenY > height - 30;

      const pulse = 1 + Math.sin(time * 0.01) * 0.14;
      const pad = 54;
      const arrowX = isOffscreen
        ? Math.max(
            pad,
            Math.min(
              width - pad,
              width / 2 + Math.cos(ang) * (width / 2 - pad),
            ),
          )
        : Math.max(pad, Math.min(width - pad, screenX));
      const arrowY = isOffscreen
        ? Math.max(
            pad,
            Math.min(
              height - pad,
              height / 2 + Math.sin(ang) * (height / 2 - pad),
            ),
          )
        : Math.max(
            pad,
            Math.min(height - pad, screenY - boss.radius * camera.zoom - 26),
          );

      ctx.save();
      ctx.translate(arrowX, arrowY);

      ctx.save();
      ctx.rotate(isOffscreen ? ang : Math.PI / 2);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#ff1e42";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff0033";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-11, -11);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-11, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.font = "900 11px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff4d6d";
      ctx.fillText(
        `${boss.bossType === "space" ? "🌌 BOSS KG" : "⏳ BOSS TG"} (${dist}m)`,
        0,
        24,
      );
      ctx.restore();
    });
  }
}
