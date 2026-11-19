import { WORLD_SIZE } from "../data/mapsConfig.js";

export function drawOffscreenThreatIndicators(
  ctx,
  { player, enemies, remotePlayers, camera, width, height }
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
        Math.min(width - pad, width / 2 + Math.cos(ang) * (width / 2 - pad))
      );
      const iy = Math.max(
        pad,
        Math.min(height - pad, height / 2 + Math.sin(ang) * (height / 2 - pad))
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
    pearls,
    boss,
    remotePlayers,
    selectedGameMode,
    zoneRadius,
  }
) {
  miniCtx.clearRect(0, 0, 165, 165);
  const scale = 165 / WORLD_SIZE;

  if (selectedGameMode === "royale") {
    miniCtx.strokeStyle = "#b5179e";
    miniCtx.lineWidth = 2;
    miniCtx.beginPath();
    miniCtx.arc(82.5, 82.5, zoneRadius * scale, 0, Math.PI * 2);
    miniCtx.stroke();
  }

  miniCtx.fillStyle = "#fee440";
  pearls.forEach((p) => {
    miniCtx.beginPath();
    miniCtx.arc(p.x * scale, p.y * scale, 2.2, 0, Math.PI * 2);
    miniCtx.fill();
  });

  enemies.forEach((e) => {
    miniCtx.fillStyle =
      player && e.radius > player.radius * 1.05
        ? "#ff4d6d"
        : "rgba(255,255,255,0.35)";
    miniCtx.beginPath();
    miniCtx.arc(
      e.x * scale,
      e.y * scale,
      e.radius > 45 ? 3 : 1.5,
      0,
      Math.PI * 2
    );
    miniCtx.fill();
  });

  Object.values(remotePlayers).forEach((rp) => {
    if (!rp || rp.isStealthed) return;
    miniCtx.fillStyle = "#ffbe0b";
    miniCtx.beginPath();
    miniCtx.arc(rp.x * scale, rp.y * scale, 5.5, 0, Math.PI * 2);
    miniCtx.fill();
  });

  if (boss) {
    miniCtx.fillStyle = "#ff006e";
    miniCtx.beginPath();
    miniCtx.arc(boss.x * scale, boss.y * scale, 6.5, 0, Math.PI * 2);
    miniCtx.fill();
  }

  if (player) {
    miniCtx.fillStyle = "#00f5d4";
    miniCtx.beginPath();
    miniCtx.arc(player.x * scale, player.y * scale, 5, 0, Math.PI * 2);
    miniCtx.fill();
  }
}
