import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";

export function renderCreatureEffects(
  ctx,
  creature,
  time,
  isDangerous,
  isRemoteHuman,
) {
  const evoData = EVOLUTION_FORMS[creature.evoStage - 1];
  if ((creature.isPlayer || isRemoteHuman) && evoData && evoData.auraColor) {
    const pulse = 1 + Math.sin(time * 0.005) * 0.08;
    const auraGrad = ctx.createRadialGradient(
      0,
      0,
      creature.radius * 0.5,
      0,
      0,
      creature.radius * 1.85 * pulse,
    );
    auraGrad.addColorStop(0, evoData.auraColor);
    auraGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, creature.radius * 1.85 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  if ((creature.isPlayer || isRemoteHuman) && creature.evoStage >= 4) {
    ctx.save();
    ctx.rotate(time * 0.0025);
    for (let c = 0; c < 4; c++) {
      const ca = (c * Math.PI) / 2;
      ctx.fillStyle = "#00f5d4";
      ctx.beginPath();
      ctx.arc(
        Math.cos(ca) * creature.radius * 1.45,
        Math.sin(ca) * creature.radius * 1.45,
        6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  if (creature.invincibleTimer > 0 || creature.ultTimer > 0) {
    ctx.save();
    ctx.strokeStyle = creature.ultTimer > 0 ? "#ff006e" : "#00f5d4";
    ctx.fillStyle =
      creature.ultTimer > 0
        ? "rgba(255, 0, 110, 0.2)"
        : "rgba(0, 245, 212, 0.18)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.rotate(time * 0.004);
    ctx.beginPath();
    ctx.arc(0, 0, creature.radius * 1.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (!creature.isPlayer && isDangerous) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 77, 109, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, creature.radius * 1.32, 0, Math.PI * 2);
    ctx.stroke();

    const tailX = -Math.cos(creature.angle) * creature.radius * 1.1;
    const tailY = -Math.sin(creature.angle) * creature.radius * 1.1;
    ctx.fillStyle = "rgba(254, 228, 64, 0.75)";
    ctx.beginPath();
    ctx.arc(tailX, tailY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (creature.stunTimer > 0) {
    ctx.save();
    ctx.strokeStyle = "#fee440";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(
      0,
      -creature.radius - 8,
      creature.radius * 0.5,
      6,
      time * 0.01,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }

  if (creature.emote && creature.emoteTimer > 0) {
    ctx.save();
    ctx.font = "28px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(creature.emote, 0, -creature.radius - 52);
    ctx.restore();
  }

  // VẼ TÊN & THANH MÁU CỦA PLAYER KHÁC
  if (creature.name && (!creature.isStealthed || creature.isPlayer)) {
    ctx.save();
    ctx.font =
      creature.isPlayer || isRemoteHuman
        ? "bold 13px Segoe UI"
        : "600 11px Segoe UI";
    ctx.textAlign = "center";

    const crownPrefix = creature.bounty >= 2 ? "👑 " : "";
    const displayLabel = isRemoteHuman
      ? `${crownPrefix}🌐 ${creature.name}`
      : `${crownPrefix}${creature.name}`;

    const labelY = isRemoteHuman
      ? -creature.radius - 24
      : -creature.radius - 15;
    const textW = ctx.measureText(displayLabel).width;

    ctx.fillStyle = isRemoteHuman
      ? "rgba(36, 0, 70, 0.85)"
      : "rgba(1, 12, 22, 0.68)";
    ctx.beginPath();
    ctx.roundRect(-textW / 2 - 7, labelY - 12, textW + 14, 18, 7);
    ctx.fill();

    ctx.fillStyle = creature.isPlayer
      ? "#00f5d4"
      : isRemoteHuman
        ? "#fee440"
        : isDangerous
          ? "#ff758f"
          : "#ffffff";
    ctx.fillText(displayLabel, 0, labelY);

    // Thanh máu hiển thị trực tiếp dưới tên của người chơi Online khác
    if (isRemoteHuman && typeof creature.hp === "number") {
      const maxHp = Math.max(1, creature.maxHp || 100);
      const hpRatio = Math.max(0, Math.min(1, creature.hp / maxHp));
      const barW = 74;
      const barH = 7;
      const barY = labelY + 8;

      ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
      ctx.beginPath();
      ctx.roundRect(-barW / 2, barY, barW, barH, 4);
      ctx.fill();

      ctx.fillStyle =
        hpRatio > 0.5 ? "#06d6a0" : hpRatio > 0.25 ? "#ffbe0b" : "#ff4d6d";
      ctx.beginPath();
      ctx.roundRect(
        -barW / 2 + 1,
        barY + 1,
        Math.max(0, (barW - 2) * hpRatio),
        barH - 2,
        3,
      );
      ctx.fill();

      ctx.font = "bold 9px Segoe UI";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${Math.ceil(creature.hp)}/${maxHp}`, 0, barY + 15);
    }

    ctx.restore();
  }
}
