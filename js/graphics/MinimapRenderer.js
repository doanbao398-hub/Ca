import { getWorldSize } from "../data/mapsConfig.js";

export function drawOffscreenThreatIndicators(
  ctx,
  { player, enemies, remotePlayers, camera, width, height },
) {
  if (!player) return;
  const threats = [...enemies];
  Object.values(remotePlayers).forEach((rp) => {
    if (rp && !rp.isStealthed) threats.push(rp);
  });

  threats.forEach((e) => {
    const isHuman = !!e.isRemoteHuman;
    if (!isHuman && e.radius <= player.radius * 1.08) return;

    const screenX = (e.x - camera.x) * camera.zoom + width / 2;
    const screenY = (e.y - camera.y) * camera.zoom + height / 2;
    const dist = Math.hypot(e.x - player.x, e.y - player.y);

    if (
      (isHuman || dist < 1200) &&
      (screenX < 0 || screenX > width || screenY < 0 || screenY > height)
    ) {
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      const pad = 34;
      const ix = Math.max(
        pad,
        Math.min(width - pad, width / 2 + Math.cos(ang) * (width / 2 - pad)),
      );
      const iy = Math.max(
        pad,
        Math.min(height - pad, height / 2 + Math.sin(ang) * (height / 2 - pad)),
      );

      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(ang);
      ctx.fillStyle = isHuman ? "#fee440" : "rgba(255, 77, 109, 0.85)";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-10, 9);
      ctx.fill();
      ctx.restore();
    }
  });
}

export function drawMinimap(
  miniCtx,
  {
    player,
    enemies,
    npcs = [],
    pearls,
    droppedItems,
    shrines,
    boss,
    epicBoss = null,
    remotePlayers,
    selectedMap,
    selectedGameMode,
    zoneRadius,
  },
) {
  const size = 165;
  const half = size / 2;
  miniCtx.clearRect(0, 0, size, size);

  if (!player) return;

  const worldSize = getWorldSize(selectedMap);
  const radarRange = 1850;
  const scale = half / radarRange;

  const toRadar = (wx, wy) => ({
    x: half + (wx - player.x) * scale,
    y: half + (wy - player.y) * scale,
  });

  miniCtx.save();
  miniCtx.beginPath();
  miniCtx.arc(half, half, half - 1, 0, Math.PI * 2);
  miniCtx.clip();

  const gridStep = 450;
  const startGridX = Math.floor((player.x - radarRange) / gridStep) * gridStep;
  const startGridY = Math.floor((player.y - radarRange) / gridStep) * gridStep;
  miniCtx.strokeStyle = "rgba(100, 223, 223, 0.12)";
  miniCtx.lineWidth = 1;

  for (let gx = startGridX; gx <= player.x + radarRange; gx += gridStep) {
    const rx = half + (gx - player.x) * scale;
    miniCtx.beginPath();
    miniCtx.moveTo(rx, 0);
    miniCtx.lineTo(rx, size);
    miniCtx.stroke();
  }
  for (let gy = startGridY; gy <= player.y + radarRange; gy += gridStep) {
    const ry = half + (gy - player.y) * scale;
    miniCtx.beginPath();
    miniCtx.moveTo(0, ry);
    miniCtx.lineTo(size, ry);
    miniCtx.stroke();
  }

  const topLeft = toRadar(0, 0);
  const mapPixelSize = worldSize * scale;
  miniCtx.strokeStyle = "rgba(255, 77, 109, 0.85)";
  miniCtx.lineWidth = 2.5;
  miniCtx.strokeRect(topLeft.x, topLeft.y, mapPixelSize, mapPixelSize);

  if (selectedGameMode === "royale") {
    const center = toRadar(worldSize / 2, worldSize / 2);
    miniCtx.strokeStyle = "#b5179e";
    miniCtx.lineWidth = 2;
    miniCtx.beginPath();
    miniCtx.arc(center.x, center.y, zoneRadius * scale, 0, Math.PI * 2);
    miniCtx.stroke();
  }

  if (Array.isArray(shrines)) {
    shrines.forEach((sh) => {
      let pt = toRadar(sh.x, sh.y);
      const dist = Math.hypot(pt.x - half, pt.y - half);
      if (dist > half - 8) {
        const ang = Math.atan2(pt.y - half, pt.x - half);
        pt = {
          x: half + Math.cos(ang) * (half - 8),
          y: half + Math.sin(ang) * (half - 8),
        };
      }
      miniCtx.fillStyle = sh.captured ? "#06d6a0" : "#00bbf9";
      miniCtx.beginPath();
      miniCtx.arc(pt.x, pt.y, 4.2, 0, Math.PI * 2);
      miniCtx.fill();
    });
  }

  miniCtx.fillStyle = "#fee440";
  pearls.forEach((p) => {
    const pt = toRadar(p.x, p.y);
    if (Math.hypot(pt.x - half, pt.y - half) > half) return;
    miniCtx.beginPath();
    miniCtx.arc(pt.x, pt.y, 2.3, 0, Math.PI * 2);
    miniCtx.fill();
  });

  if (Array.isArray(droppedItems)) {
    miniCtx.fillStyle = "#00f5d4";
    droppedItems.forEach((it) => {
      const pt = toRadar(it.x, it.y);
      if (Math.hypot(pt.x - half, pt.y - half) > half) return;
      miniCtx.beginPath();
      miniCtx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
      miniCtx.fill();
    });
  }

  enemies.forEach((e) => {
    const pt = toRadar(e.x, e.y);
    if (Math.hypot(pt.x - half, pt.y - half) > half) return;
    miniCtx.fillStyle =
      e.radius > player.radius * 1.05 ? "#ff4d6d" : "rgba(255,255,255,0.42)";
    miniCtx.beginPath();
    miniCtx.arc(pt.x, pt.y, e.radius > 45 ? 3.2 : 1.7, 0, Math.PI * 2);
    miniCtx.fill();
  });

  if (Array.isArray(npcs)) {
    miniCtx.fillStyle = "#4cc9f0";
    npcs.forEach((npc) => {
      const pt = toRadar(npc.x, npc.y);
      if (Math.hypot(pt.x - half, pt.y - half) > half) return;
      miniCtx.beginPath();
      miniCtx.arc(pt.x, pt.y, 3.2, 0, Math.PI * 2);
      miniCtx.fill();
    });
  }

  Object.values(remotePlayers).forEach((rp) => {
    if (!rp || rp.isStealthed) return;
    let pt = toRadar(rp.x, rp.y);
    const dist = Math.hypot(pt.x - half, pt.y - half);
    if (dist > half - 7) {
      const ang = Math.atan2(pt.y - half, pt.x - half);
      pt = {
        x: half + Math.cos(ang) * (half - 7),
        y: half + Math.sin(ang) * (half - 7),
      };
    }
    miniCtx.fillStyle = "#ffbe0b";
    miniCtx.beginPath();
    miniCtx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    miniCtx.fill();
  });

  if (boss) {
    let pt = toRadar(boss.x, boss.y);
    const dist = Math.hypot(pt.x - half, pt.y - half);
    if (dist > half - 8) {
      const ang = Math.atan2(pt.y - half, pt.x - half);
      pt = {
        x: half + Math.cos(ang) * (half - 8),
        y: half + Math.sin(ang) * (half - 8),
      };
    }
    miniCtx.fillStyle = "#ff006e";
    miniCtx.beginPath();
    miniCtx.arc(pt.x, pt.y, 6.5, 0, Math.PI * 2);
    miniCtx.fill();
  }

  if (epicBoss && epicBoss.hp > 0) {
    let pt = toRadar(epicBoss.x, epicBoss.y);
    const dist = Math.hypot(pt.x - half, pt.y - half);
    if (dist > half - 8) {
      const ang = Math.atan2(pt.y - half, pt.x - half);
      pt = {
        x: half + Math.cos(ang) * (half - 8),
        y: half + Math.sin(ang) * (half - 8),
      };
    }
    miniCtx.fillStyle = "#ff1e42";
    miniCtx.strokeStyle = "#ffffff";
    miniCtx.lineWidth = 1.5;
    miniCtx.beginPath();
    miniCtx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.stroke();
  }

  miniCtx.strokeStyle = "rgba(0, 245, 212, 0.16)";
  miniCtx.lineWidth = 1;
  miniCtx.beginPath();
  miniCtx.arc(half, half, half * 0.5, 0, Math.PI * 2);
  miniCtx.stroke();

  miniCtx.save();
  miniCtx.translate(half, half);
  miniCtx.rotate(player.angle);
  miniCtx.fillStyle = "#00f5d4";
  miniCtx.strokeStyle = "#011627";
  miniCtx.lineWidth = 1.5;
  miniCtx.beginPath();
  miniCtx.moveTo(8, 0);
  miniCtx.lineTo(-5, -5);
  miniCtx.lineTo(-2.5, 0);
  miniCtx.lineTo(-5, 5);
  miniCtx.closePath();
  miniCtx.fill();
  miniCtx.stroke();
  miniCtx.restore();

  miniCtx.restore();
}
