import { getWorldSize, MAP_CONFIG } from "../data/mapsConfig.js";

function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export class WorldRenderer {
  constructor() {
    this.mapProps = [];
    this.waterRipples = [];
    this.shrines = [];
  }

  build(selectedMap) {
    this.mapProps = [];
    this.waterRipples = [];
    this.shrines = [];
    const worldSize = getWorldSize(selectedMap);
    let seed = MAP_CONFIG[selectedMap]?.seed || 101;

    const rippleCount = selectedMap === "hybrid" ? 70 : 45;
    for (let i = 0; i < rippleCount; i++) {
      this.waterRipples.push({
        x: seededRandom(seed++) * worldSize,
        y: seededRandom(seed++) * worldSize,
        r: 80 + seededRandom(seed++) * 140,
        phase: seededRandom(seed++) * Math.PI * 2,
        speed: 0.015 + seededRandom(seed++) * 0.015,
      });
    }

    const shrineSpots =
      selectedMap === "hybrid"
        ? [
            { x: worldSize * 0.5, y: worldSize * 0.5, name: "Đền Thờ Trung Tâm" },
            { x: worldSize * 0.25, y: worldSize * 0.25, name: "Đền San Hô" },
            { x: worldSize * 0.75, y: worldSize * 0.25, name: "Đền Đầm Lầy" },
            { x: worldSize * 0.5, y: worldSize * 0.78, name: "Đền Vực Thẳm" },
          ]
        : [
            { x: worldSize * 0.5, y: worldSize * 0.5, name: "Đền Thờ Hải Thần" },
            { x: worldSize * 0.28, y: worldSize * 0.65, name: "Đền Cổ Đại" },
            { x: worldSize * 0.72, y: worldSize * 0.35, name: "Đền Ánh Dương" },
          ];

    shrineSpots.forEach((sp, idx) => {
      this.shrines.push({
        id: `shrine_${idx}`,
        x: sp.x,
        y: sp.y,
        name: sp.name,
        radius: 230,
        progress: 0,
        captured: false,
      });
    });

    const propCount = selectedMap === "hybrid" ? 150 : 95;
    for (let i = 0; i < propCount; i++) {
      const x = seededRandom(seed++) * (worldSize - 220) + 110;
      const y = seededRandom(seed++) * (worldSize - 220) + 110;
      const size = 40 + seededRandom(seed++) * 75;

      let biome = selectedMap;
      if (selectedMap === "hybrid") {
        if (y < worldSize * 0.45 && x < worldSize * 0.5) biome = "coral";
        else if (y < worldSize * 0.45 && x >= worldSize * 0.5) biome = "swamp";
        else biome = "abyss";
      }

      if (biome === "coral") {
        const kinds = ["coral_branch", "seaweed_cluster", "shipwreck"];
        const kind = i % 16 === 0 ? "shipwreck" : kinds[i % 2];
        const colors = ["#ff4d6d", "#ff9f1c", "#f72585", "#4cc9f0", "#06d6a0"];
        this.mapProps.push({
          x,
          y,
          size,
          kind,
          color: colors[i % colors.length],
          phase: seededRandom(seed++) * 6,
        });
      } else if (biome === "abyss") {
        const kinds = ["crystal", "jellyfish", "volcano"];
        const kind = i % 14 === 0 ? "volcano" : kinds[i % 2];
        const colors = ["#b5179e", "#7209b7", "#4cc9f0", "#f72585"];
        this.mapProps.push({
          x,
          y,
          size,
          kind,
          color: colors[i % colors.length],
          phase: seededRandom(seed++) * 6,
          eruptTimer: i % 7,
        });
      } else {
        const kinds = ["lilypad", "mangrove_root", "ancient_pillar"];
        const kind = kinds[i % 3];
        this.mapProps.push({
          x,
          y,
          size,
          kind,
          color: "#52b788",
          phase: seededRandom(seed++) * 6,
        });
      }
    }
  }

  draw(ctx, state, time, dt) {
    const {
      selectedMap,
      selectedGameMode,
      zoneRadius,
      worldEvent,
      camera,
      width,
      height,
      player,
      particleSystem,
    } = state;

    const worldSize = getWorldSize(selectedMap);
    const mCfg = MAP_CONFIG[selectedMap];
    const grad = ctx.createLinearGradient(0, 0, 0, worldSize);
    grad.addColorStop(0, mCfg.bgTop);
    grad.addColorStop(0.5, mCfg.bgMid);
    grad.addColorStop(1, mCfg.bgBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, worldSize, worldSize);

    if (worldEvent && worldEvent.type === "bloodmoon") {
      ctx.fillStyle = "rgba(208, 0, 0, 0.16)";
      ctx.fillRect(0, 0, worldSize, worldSize);
    }

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    for (let r = 0; r < 8; r++) {
      const rayX = (r * 850 + Math.sin(time * 0.0005 + r) * 120) % worldSize;
      ctx.beginPath();
      ctx.moveTo(rayX, 0);
      ctx.lineTo(rayX + 260, 0);
      ctx.lineTo(rayX + 680, worldSize);
      ctx.lineTo(rayX + 320, worldSize);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = mCfg.gridColor;
    ctx.lineWidth = 2;
    const flowOffset = Math.sin(time * 0.001) * 18;
    for (let x = 0; x <= worldSize; x += 220) {
      ctx.beginPath();
      ctx.moveTo(x + flowOffset, 0);
      ctx.lineTo(x - flowOffset, worldSize);
      ctx.stroke();
    }

    this.waterRipples.forEach((w) => {
      w.phase += w.speed;
      const currR = w.r + Math.sin(w.phase) * 25;
      ctx.save();
      ctx.strokeStyle = mCfg.causticColor;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(w.x, w.y, currR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    if (selectedGameMode === "domination" || selectedMap === "hybrid") {
      this.shrines.forEach((sh) => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.strokeStyle = sh.captured
          ? "rgba(6, 214, 160, 0.75)"
          : "rgba(0, 187, 249, 0.45)";
        ctx.fillStyle = sh.captured
          ? "rgba(6, 214, 160, 0.12)"
          : "rgba(0, 187, 249, 0.06)";
        ctx.lineWidth = 4;
        ctx.setLineDash([14, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, sh.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.font = "bold 13px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillStyle = sh.captured ? "#06d6a0" : "#90e0ef";
        ctx.fillText(
          sh.captured
            ? `⛩️ ${sh.name} (ĐÃ CHIẾM +XP/s)`
            : `⛩️ ${sh.name} (${Math.floor(sh.progress)}%)`,
          0,
          -sh.radius - 10,
        );
        ctx.restore();
      });
    }

    this.mapProps.forEach((p) => {
      if (p.kind === "volcano") {
        p.eruptTimer = (p.eruptTimer || 0) + dt;
        if (p.eruptTimer >= 7) {
          p.eruptTimer = 0;
          particleSystem.addShockwave(p.x, p.y, 190, "#ff5400");
          if (player && Math.hypot(player.x - p.x, player.y - p.y) < 190) {
            const ang = Math.atan2(player.y - p.y, player.x - p.x);
            player.x += Math.cos(ang) * 160;
            player.y += Math.sin(ang) * 160;
            particleSystem.addFloatingText(
              player.x,
              player.y,
              "🌋 NÚI LỬA ĐẨY VĂNG!",
              "#ff9f1c"
            );
          }
        }
      }

      if (
        Math.abs(p.x - camera.x) > (width / camera.zoom) * 0.85 ||
        Math.abs(p.y - camera.y) > (height / camera.zoom) * 0.85
      ) {
        return;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      const sway = Math.sin(time * 0.002 + p.phase) * 8;

      if (p.kind === "coral_branch") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        for (let b = -2; b <= 2; b++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(
            b * 18 + sway,
            -p.size * 0.5,
            b * 28 + sway,
            -p.size * 0.9
          );
          ctx.stroke();
        }
      } else if (p.kind === "seaweed_cluster") {
        ctx.strokeStyle = "#06d6a0";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        for (let s = -2; s <= 2; s++) {
          ctx.beginPath();
          ctx.moveTo(s * 14, 15);
          ctx.quadraticCurveTo(
            s * 14 + sway * 1.5,
            -p.size * 0.5,
            s * 14 - sway,
            -p.size * 1.1
          );
          ctx.stroke();
        }
      } else if (p.kind === "shipwreck") {
        ctx.fillStyle = "rgba(61, 43, 31, 0.85)";
        ctx.rotate(-0.2);
        ctx.beginPath();
        ctx.roundRect(
          -p.size * 1.3,
          -p.size * 0.4,
          p.size * 2.6,
          p.size * 0.8,
          12
        );
        ctx.fill();
        ctx.strokeStyle = "#7f5539";
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (p.kind === "crystal") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.55;
        for (let c = -1; c <= 1; c++) {
          ctx.save();
          ctx.rotate(c * 0.35);
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(0, -p.size);
          ctx.lineTo(10, 0);
          ctx.fill();
          ctx.restore();
        }
      } else if (p.kind === "jellyfish") {
        const floatY = Math.sin(time * 0.003 + p.phase) * 18;
        ctx.translate(0, floatY);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.45, Math.PI, 0);
        ctx.fill();
      } else if (p.kind === "volcano") {
        ctx.fillStyle = "#1b1b1e";
        ctx.beginPath();
        ctx.moveTo(-p.size * 1.3, p.size * 0.6);
        ctx.lineTo(-p.size * 0.4, -p.size * 0.5);
        ctx.lineTo(p.size * 0.4, -p.size * 0.5);
        ctx.lineTo(p.size * 1.3, p.size * 0.6);
        ctx.fill();
        ctx.fillStyle = "#ff5400";
        ctx.beginPath();
        ctx.ellipse(0, -p.size * 0.5, p.size * 0.35, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "lilypad") {
        ctx.fillStyle = "rgba(64, 145, 108, 0.5)";
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.75, 0.2, Math.PI * 1.9);
        ctx.lineTo(0, 0);
        ctx.fill();
      } else if (p.kind === "mangrove_root") {
        ctx.strokeStyle = "#432818";
        ctx.lineWidth = 10;
        for (let r = -2; r <= 2; r++) {
          ctx.beginPath();
          ctx.moveTo(r * 16, -p.size * 0.8);
          ctx.quadraticCurveTo(r * 25, 0, r * 12, p.size * 0.8);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "rgba(108, 117, 125, 0.65)";
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (selectedGameMode === "royale") {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 110, 0.85)";
      ctx.lineWidth = 16;
      ctx.setLineDash([40, 20]);
      ctx.beginPath();
      ctx.arc(worldSize / 2, worldSize / 2, zoneRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, worldSize, worldSize);
  }
}

