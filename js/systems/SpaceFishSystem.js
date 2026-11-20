import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import { getCounterMultiplier } from "../data/speciesConfig.js";
import { getWorldSize } from "../data/mapsConfig.js";

export class SpaceFishSystem {
  constructor() {
    this.domain = null; // { x, y, radius, timer, maxTimer, teleportCd }
    this.slashes = []; // Lát cắt ngoài lãnh địa
    this.riftSlashes = []; // Vết nứt chém tức thì trong lãnh địa
    this.orbs = []; // Quả cầu bán lãnh địa (Skill 3 ngoài lãnh địa)
    this.semiDomains = []; // Lồng giam không gian (Cơ chế D'arcy)
    this.implosions = []; // Hiệu ứng sụp đổ / nghiền ép không gian
    this.teleportPortals = []; // Hiệu ứng cổng dịch chuyển
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

  // SKILL 1 [E]: MỞ LÃNH ĐỊA (LẦN 1) / BƯỚC NHẢY KHÔNG GIAN (KHI Ở TRONG LÃNH ĐỊA)
  triggerSkill1(player, context) {
    const { particleSystem, camera, input, width, height } = context;

    // Nếu đang ở BÊN TRONG Lãnh Địa -> Kích hoạt trạng thái chờ điểm dịch chuyển hoặc dịch chuyển ngay tới con trỏ
    if (this.isInsideDomain(player)) {
      if (this.domain.teleportCd > 0) return;

      // Trên PC: dịch chuyển thẳng tới vị trí chuột nếu chuột nằm trong lãnh địa; Mobile: bật chế độ chạm điểm đến
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
        );
      } else {
        player.spaceTeleportAiming = !player.spaceTeleportAiming;
        particleSystem.addFloatingText(
          player.x,
          player.y - player.radius - 24,
          player.spaceTeleportAiming
            ? "🌀 CHẠM / CLICK ĐIỂM TRONG LÃNH ĐỊA ĐỂ DỊCH CHUYỂN!"
            : "❌ HỦY CHỌN ĐIỂM DỊCH CHUYỂN",
          "#c77dff",
        );
      }
      return;
    }

    // Nếu đang ở NGOÀI Lãnh Địa -> Kiểm tra hồi chiêu để mở Lãnh Địa mới
    if (player.skillCooldownTimer > 0) return;

    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
    player.skillCooldownTimer =
      player.cfg.skillCooldown * player.cdrMult * synCdr;

    // Bán kính & thời gian tồn tại tỷ lệ thuận với cấp độ (Lv.1 -> Lv.100)
    const levelFactor = Math.min(100, Math.max(1, player.level));
    const domainRadius = Math.round(
      280 + levelFactor * 5.2 + player.radius * 1.4,
    );
    const domainDuration = Number((6.0 + levelFactor * 0.08).toFixed(1));

    this.domain = {
      x: player.x,
      y: player.y,
      radius: domainRadius,
      timer: domainDuration,
      maxTimer: domainDuration,
      teleportCd: 0.25,
    };
    player.spaceTeleportAiming = false;

    sound.playEvolution();
    camera.shake = 14;
    eventBus.emit("HIT_STOP", 0.04);
    particleSystem.addShockwave(player.x, player.y, domainRadius, "#9d4edd");
    particleSystem.addFloatingText(
      player.x,
      player.y - player.radius - 28,
      `🌌 BÀNH TRƯỚNG KHÔNG GIAN (${domainDuration}s)!`,
      "#e0aaff",
    );

    eventBus.emit("SKILL_BROADCAST", {
      x: player.x,
      y: player.y,
      maxR: domainRadius,
      color: "#9d4edd",
    });
    eventBus.emit("SKILL_USED_FOR_QUEST");
  }

  executeTeleport(player, targetX, targetY, particleSystem, camera) {
    if (!this.domain || this.domain.teleportCd > 0) return;

    // Giới hạn điểm dịch chuyển nằm gọn trong phạm vi Lãnh Địa & Bản đồ
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

    // Cổng xuất phát & cổng đích
    this.teleportPortals.push(
      { x: player.x, y: player.y, r: player.radius * 1.4, life: 0.45 },
      { x: finalX, y: finalY, r: player.radius * 1.6, life: 0.55 },
    );

    player.x = finalX;
    player.y = finalY;
    player.invincibleTimer = Math.max(player.invincibleTimer, 0.35);
    player.spaceTeleportAiming = false;
    this.domain.teleportCd = 0.45; // Hồi bước nhảy cực nhanh trong lãnh địa

    sound.playSkill();
    camera.shake = 7;
    particleSystem.addShockwave(finalX, finalY, player.radius * 2.6, "#00f5d4");
    eventBus.emit("FORCE_SYNC_PLAYER");
  }

  // SKILL 2 [Q]: LÁT CẮT KHÔNG GIAN (TẦM XA ĐỊNH HƯỚNG / BÁCH PHÁT BÁCH TRÚNG TRONG LÃNH ĐỊA)
  triggerSkill2(player, context) {
    if (!player || player.skill2CooldownTimer > 0) return;
    const {
      enemies,
      remotePlayers,
      particleSystem,
      camera,
      input,
      width,
      height,
    } = context;

    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
    player.skill2CooldownTimer = 4.2 * player.cdrMult * synCdr;

    const inside = this.isInsideDomain(player);
    const levelFactor = Math.min(100, Math.max(1, player.level));
    const baseDmg = Math.round((34 + levelFactor * 0.9) * player.bitePower);

    sound.playSkill();
    camera.shake = 9;

    const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
    const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;

    if (!inside) {
      // ĐIỀU KIỆN 1: NGOÀI LÃNH ĐỊA -> PHÓNG LƯỠI LIỀM KHÔNG GIAN XUYÊN PHÁ TẦM XA
      const aimAngle = input.isJoystickModeActive
        ? player.angle
        : Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

      const slashSize = player.radius * 1.15 + levelFactor * 0.45;
      const slashRange = 540 + levelFactor * 5.5;

      this.slashes.push({
        x: player.x + Math.cos(aimAngle) * player.radius,
        y: player.y + Math.sin(aimAngle) * player.radius,
        angle: aimAngle,
        speed: 14.5,
        size: slashSize,
        traveled: 0,
        maxRange: slashRange,
        dmg: baseDmg,
        hitIds: new Set(),
      });

      particleSystem.addFloatingText(
        player.x,
        player.y - player.radius - 20,
        "🌙 LÁT CẮT KHÔNG GIAN!",
        "#c77dff",
      );
    } else {
      // ĐIỀU KIỆN 2: TRONG LÃNH ĐỊA -> MỞ VẾT NỨT CHÉM TRỰC TIẾP TẠI MỤC TIÊU (100% KHÔNG THỂ NÉ)
      let target = null;
      let bestDist = Infinity;

      const refX = input.isJoystickModeActive ? player.x : worldMouseX;
      const refY = input.isJoystickModeActive ? player.y : worldMouseY;

      // Tìm kẻ địch gần điểm chỉ định nhất nằm bên trong Lãnh Địa
      enemies.forEach((e) => {
        if (
          Math.hypot(e.x - this.domain.x, e.y - this.domain.y) <=
          this.domain.radius + e.radius
        ) {
          const d = Math.hypot(e.x - refX, e.y - refY);
          if (d < bestDist) {
            bestDist = d;
            target = { type: "bot", entity: e, x: e.x, y: e.y };
          }
        }
      });

      Object.entries(remotePlayers || {}).forEach(([id, rp]) => {
        if (!rp || rp.isStealthed || rp.invincibleTimer > 0) return;
        if (
          Math.hypot(rp.x - this.domain.x, rp.y - this.domain.y) <=
          this.domain.radius + rp.radius
        ) {
          const d = Math.hypot(rp.x - refX, rp.y - refY);
          if (d < bestDist) {
            bestDist = d;
            target = { type: "player", id, entity: rp, x: rp.x, y: rp.y };
          }
        }
      });

      const strikeX = target
        ? target.x
        : Math.min(
            this.domain.x + this.domain.radius * 0.8,
            Math.max(this.domain.x - this.domain.radius * 0.8, refX),
          );
      const strikeY = target
        ? target.y
        : Math.min(
            this.domain.y + this.domain.radius * 0.8,
            Math.max(this.domain.y - this.domain.radius * 0.8, refY),
          );
      const strikeR = 95 + levelFactor * 0.5;

      this.riftSlashes.push({
        x: strikeX,
        y: strikeY,
        r: strikeR,
        angle: Math.random() * Math.PI,
        life: 0.45,
      });

      particleSystem.addShockwave(strikeX, strikeY, strikeR * 1.3, "#ff006e");
      particleSystem.addFloatingText(
        strikeX,
        strikeY - 24,
        "⚡ VẾT NỨT TUYỆT ĐỐI!",
        "#ff006e",
      );

      // Gây sát thương ngay lập tức lên mọi kẻ địch tại điểm vết nứt
      const sureHitDmg = Math.round(baseDmg * 1.25);
      enemies.forEach((e) => {
        if (Math.hypot(e.x - strikeX, e.y - strikeY) <= strikeR + e.radius) {
          e.radius = Math.max(10, e.radius * 0.76);
          e.stunTimer = Math.max(e.stunTimer, 0.8);
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

  // SKILL 3 [R]: HẠ CẤP & BÓP MÉO KHÔNG GIAN (QUẢ CẦU BÁN LÃNH ĐỊA D'ARCY / THI TRIỂN TỨC THÌ TRONG LÃNH ĐỊA)
  triggerSkill3(player, context) {
    if (!player || player.skill3CooldownTimer > 0) return;
    const {
      enemies,
      remotePlayers,
      particleSystem,
      camera,
      input,
      width,
      height,
    } = context;

    const syn = player.getSynergies();
    const synCdr = syn.elemental >= 2 ? 0.85 : 1.0;
    player.skill3CooldownTimer = 11.0 * player.cdrMult * synCdr;

    const inside = this.isInsideDomain(player);
    const levelFactor = Math.min(100, Math.max(1, player.level));
    const worldMouseX = (input.x - width / 2) / camera.zoom + camera.x;
    const worldMouseY = (input.y - height / 2) / camera.zoom + camera.y;

    sound.playEvolution();
    camera.shake = 16;
    eventBus.emit("HIT_STOP", 0.045);

    if (!inside) {
      // ĐIỀU KIỆN 1: NGOÀI LÃNH ĐỊA -> PHÓNG QUẢ CẦU KHÔNG GIAN LỚN DẦN TẠO BÁN LÃNH ĐỊA (CƠ CHẾ D'ARCY)
      const aimAngle = input.isJoystickModeActive
        ? player.angle
        : Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

      this.orbs.push({
        x: player.x + Math.cos(aimAngle) * (player.radius + 14),
        y: player.y + Math.sin(aimAngle) * (player.radius + 14),
        angle: aimAngle,
        speed: 9.5,
        r: 18,
        maxOrbR: 46 + levelFactor * 0.25,
        traveled: 0,
        maxDist: 560 + levelFactor * 3.5,
        cageRadius: 210 + levelFactor * 1.8,
        crushDmg: Math.round((52 + levelFactor * 1.35) * player.bitePower),
      });

      particleSystem.addFloatingText(
        player.x,
        player.y - player.radius - 26,
        "🔮 QUẢ CẦU BÁN LÃNH ĐỊA!",
        "#ffbe0b",
      );
    } else {
      // ĐIỀU KIỆN 2: TRONG LÃNH ĐỊA -> BÓP MÉO & HẠ CẤP KHÔNG GIAN TỨC THÌ KHÔNG ĐỘ TRỄ
      let targetX = input.isJoystickModeActive ? player.x : worldMouseX;
      let targetY = input.isJoystickModeActive ? player.y : worldMouseY;

      // Tự động khóa vào kẻ địch gần con trỏ nhất trong Lãnh Địa nếu có
      let bestDist = 240;
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

      const crushRadius = 175 + levelFactor * 1.4;
      const instantDmg = Math.round(
        (64 + levelFactor * 1.6) * player.bitePower,
      );

      this.triggerDimensionalCrush(
        player,
        targetX,
        targetY,
        crushRadius,
        instantDmg,
        enemies,
        remotePlayers,
        particleSystem,
        camera,
      );

      particleSystem.addFloatingText(
        targetX,
        targetY - 30,
        "💥 HẠ CẤP KHÔNG GIAN TỨC THÌ!",
        "#ff006e",
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
    particleSystem,
    camera,
  ) {
    this.implosions.push({ x: cx, y: cy, r: radius, life: 0.65 });
    sound.playEvolution();
    camera.shake = 18;
    particleSystem.addShockwave(cx, cy, radius * 1.35, "#ff006e");
    particleSystem.addShockwave(cx, cy, radius * 0.85, "#fee440");

    enemies.forEach((e) => {
      if (Math.hypot(e.x - cx, e.y - cy) <= radius + e.radius) {
        e.x = cx + (Math.random() - 0.5) * 24;
        e.y = cy + (Math.random() - 0.5) * 24;
        e.stunTimer = 1.8;
        e.radius = Math.max(10, e.radius * 0.65);
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
    const { player, enemies, remotePlayers, particleSystem, camera } = state;
    if (!player || player.species !== "space") return;

    const frameScale = dt * 60;

    // 1. Cập nhật Lãnh Địa Không Gian
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

    // 2. Cập nhật Nội Tại Rạn Nứt Không Gian (Lệch hướng địch + Tăng tốc Cá Không Gian khi áp sát)
    let nearRiftedEnemy = false;
    enemies.forEach((e) => {
      if (e.spatialRiftTimer > 0) {
        e.spatialRiftTimer -= dt;
        e.spatialRiftWobble = (e.spatialRiftWobble || 0) + dt * 7;
        e.angle += Math.sin(e.spatialRiftWobble) * 0.085;
        if (Math.hypot(e.x - player.x, e.y - player.y) < 550) {
          nearRiftedEnemy = true;
        }
      }
    });
    Object.values(remotePlayers || {}).forEach((rp) => {
      if (rp && rp.spatialRiftTimer > 0) {
        rp.spatialRiftTimer -= dt;
        if (Math.hypot(rp.x - player.x, rp.y - player.y) < 600) {
          nearRiftedEnemy = true;
        }
      }
    });
    player.spatialHuntBonus = nearRiftedEnemy ? 0.35 : 0;

    // 3. Cập nhật Lát Cắt Không Gian (Skill 2 Ngoài Lãnh Địa)
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      const step = s.speed * frameScale;
      s.x += Math.cos(s.angle) * step;
      s.y += Math.sin(s.angle) * step;
      s.traveled += step;

      enemies.forEach((e, idx) => {
        const key = `bot_${idx}_${Math.round(e.baseRadius)}`;
        if (
          !s.hitIds.has(key) &&
          Math.hypot(e.x - s.x, e.y - s.y) < s.size + e.radius
        ) {
          s.hitIds.add(key);
          e.radius = Math.max(10, e.radius * 0.78);
          e.stunTimer = Math.max(e.stunTimer, 0.7);
          this.applySpatialRift(e, 4.0);
          particleSystem.addFloatingText(
            e.x,
            e.y - 16,
            "🌙 RẠN NỨT!",
            "#c77dff",
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

    // 4. Cập nhật Quả Cầu Không Gian -> Nở thành Bán Lãnh Địa (Skill 3 Ngoài Lãnh Địa)
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      const step = o.speed * frameScale;
      o.x += Math.cos(o.angle) * step;
      o.y += Math.sin(o.angle) * step;
      o.traveled += step;
      o.r = Math.min(o.maxOrbR, o.r + 0.45 * frameScale);

      const hitBot = enemies.some(
        (e) => Math.hypot(e.x - o.x, e.y - o.y) < o.r + e.radius,
      );
      const hitPlayer = Object.values(remotePlayers || {}).some(
        (rp) =>
          rp &&
          !rp.isStealthed &&
          Math.hypot(rp.x - o.x, rp.y - o.y) < o.r + rp.radius,
      );

      if (hitBot || hitPlayer || o.traveled >= o.maxDist) {
        // Nở phồng thành Bán Lãnh Địa (Ma Trận Giam Cầm D'arcy)
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
          timer: 1.35, // Nhịp trễ 1.35s trước khi giật ngược về tâm
          maxTimer: 1.35,
          crushDmg: o.crushDmg,
          markedBots,
          markedPlayers,
        });

        particleSystem.addShockwave(o.x, o.y, o.cageRadius, "#ffbe0b");
        this.orbs.splice(i, 1);
      }
    }

    // 5. Cập nhật Ma Trận Giam Cầm Bán Lãnh Địa (Cơ chế D'arcy)
    for (let i = this.semiDomains.length - 1; i >= 0; i--) {
      const sd = this.semiDomains[i];
      sd.timer -= dt;

      // Liên tục đánh dấu những kẻ địch mới chạm vào phạm vi Bán Lãnh Địa
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

      // Hết 1.35s -> Cưỡng chế giật ngược toàn bộ mục tiêu bị đánh dấu về tâm & Nghiền ép Hạ Cấp Không Gian!
      if (sd.timer <= 0) {
        sd.markedBots.forEach((e) => {
          e.x = sd.x + (Math.random() - 0.5) * 20;
          e.y = sd.y + (Math.random() - 0.5) * 20;
          e.stunTimer = 1.6;
          e.radius = Math.max(10, e.radius * 0.68);
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
        });
        sound.playEvolution();
        camera.shake = 18;
        particleSystem.addShockwave(sd.x, sd.y, sd.radius * 1.15, "#ff006e");
        particleSystem.addFloatingText(
          sd.x,
          sd.y - 25,
          "🌀 GIẬT NGƯỢC & HẠ CẤP KHÔNG GIAN!",
          "#ffbe0b",
        );

        this.semiDomains.splice(i, 1);
      }
    }

    // 6. Giảm thời gian các hiệu ứng hình ảnh
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
    // 1. Vẽ Lãnh Địa Không Gian Vũ Trụ (Skill 1)
    if (this.domain) {
      const d = this.domain;
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
      spaceGrad.addColorStop(0, "rgba(16, 0, 43, 0.35)");
      spaceGrad.addColorStop(0.7, "rgba(60, 9, 108, 0.45)");
      spaceGrad.addColorStop(1, "rgba(157, 78, 221, 0.68)");
      ctx.fillStyle = spaceGrad;
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.fill();

      // Vòng ma pháp vũ trụ xoay tròn
      ctx.save();
      ctx.rotate(time * 0.0012);
      ctx.strokeStyle = "#e0aaff";
      ctx.lineWidth = 4;
      ctx.setLineDash([24, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(-time * 0.002);
      ctx.strokeStyle = "rgba(0, 245, 212, 0.55)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.arc(0, 0, d.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Các ngôi sao vũ trụ lấp lánh bên trong lãnh địa
      for (let s = 0; s < 14; s++) {
        const ang = (s * Math.PI * 2) / 14 + time * 0.0005;
        const dist = d.radius * (0.25 + ((s * 37) % 65) / 100);
        ctx.fillStyle = s % 2 === 0 ? "#00f5d4" : "#fee440";
        ctx.beginPath();
        ctx.arc(
          Math.cos(ang) * dist,
          Math.sin(ang) * dist,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Vẽ Lưỡi Liềm Lát Cắt Không Gian (Skill 2 Ngoài Lãnh Địa)
    this.slashes.forEach((s) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = "#e0aaff";
      ctx.fillStyle = "rgba(157, 78, 221, 0.55)";
      ctx.lineWidth = 4;
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

    // 3. Vẽ Vết Nứt Chém Tức Thì (Skill 2 Trong Lãnh Địa)
    this.riftSlashes.forEach((rs) => {
      ctx.save();
      ctx.translate(rs.x, rs.y);
      ctx.rotate(rs.angle);
      ctx.globalAlpha = Math.min(1, rs.life * 2.5);
      ctx.strokeStyle = "#ff006e";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-rs.r, 0);
      ctx.lineTo(rs.r, 0);
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-rs.r * 0.85, 0);
      ctx.lineTo(rs.r * 0.85, 0);
      ctx.stroke();
      ctx.restore();
    });

    // 4. Vẽ Quả Cầu Không Gian đang bay (Skill 3)
    this.orbs.forEach((o) => {
      ctx.save();
      ctx.translate(o.x, o.y);
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, o.r);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.45, "#9d4edd");
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

    // 5. Vẽ Bán Lãnh Địa & Dây Liên Kết Giam Cầm D'arcy
    this.semiDomains.forEach((sd) => {
      ctx.save();
      const progress = 1 - sd.timer / sd.maxTimer;
      ctx.fillStyle = "rgba(114, 9, 183, 0.25)";
      ctx.strokeStyle = "#ffbe0b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, sd.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vòng thu hẹp đếm ngược về tâm
      ctx.strokeStyle = "#ff006e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sd.x, sd.y, sd.radius * (1 - progress), 0, Math.PI * 2);
      ctx.stroke();

      // Vẽ tia dây xích không gian nối từ tâm tới từng kẻ địch bị đánh dấu
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

    // 6. Vẽ Hiệu Ứng Sụp Đổ / Hạ Cấp Không Gian & Cổng Dịch Chuyển
    this.implosions.forEach((imp) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, imp.life * 1.8);
      ctx.fillStyle = "rgba(16, 0, 43, 0.78)";
      ctx.strokeStyle = "#ff006e";
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
      ctx.strokeStyle = "#00f5d4";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 7. Vẽ Dấu Ấn Rạn Nứt Không Gian trên đầu kẻ địch bị dính hiệu ứng
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
