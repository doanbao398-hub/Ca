import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";

export function renderCreatureEffects(
  ctx,
  creature,
  time,
  isDangerous,
  isRemoteHuman,
) {
  const evoData = EVOLUTION_FORMS[creature.evoStage - 1];
  const isRainbowStage = (creature.isPlayer || isRemoteHuman) && creature.evoStage >= 8;

  // HIỆU ỨNG HÀO QUANG 7 SẮC CẦU VỒNG RẦM RỘ CHO DẠNG TIẾN HÓA CUỐI CÙNG (DẠNG 8)
  if (isRainbowStage) {
    const hueBase = (time * 0.18) % 360;
    const pulse = 1 + Math.sin(time * 0.007) * 0.12;

    // 1. Vầng hào quang tỏa nhiệt cầu vồng khổng lồ
    const outerR = creature.radius * 2.55 * pulse;
    const rainbowGrad = ctx.createRadialGradient(
      0,
      0,
      creature.radius * 0.3,
      0,
      0,
      outerR,
    );
    rainbowGrad.addColorStop(0, `hsla(${hueBase}, 100%, 62%, 0.65)`);
    rainbowGrad.addColorStop(0.35, `hsla(${(hueBase + 90) % 360}, 100%, 56%, 0.42)`);
    rainbowGrad.addColorStop(0.7, `hsla(${(hueBase + 200) % 360}, 100%, 52%, 0.22)`);
    rainbowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rainbowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Các tia hào quang thần thánh xoay tròn
    ctx.save();
    ctx.rotate(time * 0.0018);
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const a = (i * Math.PI * 2) / rayCount;
      const rayHue = (hueBase + i * (360 / rayCount)) % 360;
      ctx.fillStyle = `hsla(${rayHue}, 100%, 64%, 0.26)`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, creature.radius * 2.25 * pulse, a - 0.09, a + 0.09);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. Hai vòng ma pháp cầu vồng xoay ngược chiều
    ctx.save();
    ctx.rotate(-time * 0.004);
    ctx.strokeStyle = `hsl(${(hueBase + 60) % 360}, 100%, 60%)`;
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, creature.radius * 1.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(time * 0.005);
    ctx.strokeStyle = `hsl(${(hueBase + 180) % 360}, 100%, 62%)`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, creature.radius * 1.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if ((creature.isPlayer || isRemoteHuman) && evoData && evoData.auraColor) {
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

  if (creature.isPlayer && typeof creature.getSynergies === "function") {
    const syn = creature.getSynergies();

    if (creature.hasSuperAugment("s_abyss_frost")) {
      ctx.save();
      ctx.strokeStyle = "rgba(144, 224, 239, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, creature.radius + 180, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (syn.elemental >= 2) {
      ctx.save();
      ctx.rotate(-time * 0.0025);
      ctx.strokeStyle =
        syn.elemental >= 4 ? "#00f5d4" : "rgba(0, 245, 212, 0.65)";
      ctx.lineWidth = syn.elemental >= 4 ? 3 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, creature.radius * 1.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (syn.empowerment >= 2) {
      ctx.save();
      ctx.rotate(time * 0.003);
      ctx.strokeStyle =
        syn.empowerment >= 4 ? "#ff5400" : "rgba(255, 84, 0, 0.7)";
      ctx.lineWidth = syn.empowerment >= 4 ? 3.5 : 2;
      ctx.setLineDash([16, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, creature.radius * 1.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (
      creature.passiveState?.turtleShieldReady ||
      creature.passiveState?.diverNanoShield
    ) {
      ctx.save();
      ctx.strokeStyle = "#00bbf9";
      ctx.fillStyle = "rgba(0, 187, 249, 0.14)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, creature.radius * 1.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (creature.species === "diver" && creature.evoStage >= 4) {
      ctx.save();
      const droneAng = time * 0.0035;
      const dx = Math.cos(droneAng) * (creature.radius + 32);
      const dy = Math.sin(droneAng) * (creature.radius + 32);
      ctx.fillStyle = "#00f5d4";
      ctx.beginPath();
      ctx.arc(dx, dy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // TINH CẦU QUAY QUANH (DẠNG 8 CÓ 12 TINH CẦU 7 SẮC CẦU VỒNG PHÁT SÁNG)
  if ((creature.isPlayer || isRemoteHuman) && creature.evoStage >= 4) {
    ctx.save();
    ctx.rotate(time * (0.002 + creature.evoStage * 0.0004));
    const orbCount = isRainbowStage ? 12 : Math.min(8, creature.evoStage);
    const orbRadius = Math.max(5.5, creature.radius * (isRainbowStage ? 0.1 : 0.08));
    const orbitR = creature.radius * (isRainbowStage ? 1.55 : 1.42);
    for (let c = 0; c < orbCount; c++) {
      const ca = (c * Math.PI * 2) / orbCount;
      const ox = Math.cos(ca) * orbitR;
      const oy = Math.sin(ca) * orbitR;
      if (isRainbowStage) {
        const orbHue = (time * 0.25 + c * (360 / orbCount)) % 360;
        ctx.fillStyle = `hsl(${orbHue}, 100%, 60%)`;
        ctx.shadowColor = `hsl(${orbHue}, 100%, 60%)`;
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = creature.evoStage >= 7 ? "#fee440" : "#00f5d4";
      }
      ctx.beginPath();
      ctx.arc(ox, oy, orbRadius, 0, Math.PI * 2);
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
    ctx.arc(tailX, tailY, Math.max(8, creature.radius * 0.12), 0, Math.PI * 2);
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
    ctx.font = "30px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(creature.emote, 0, -creature.radius - 56);
    ctx.restore();
  }

  if (creature.chatBubble && creature.chatBubbleTimer > 0) {
    ctx.save();
    ctx.font = "bold 12px Segoe UI";
    ctx.textAlign = "center";
    const msg = creature.chatBubble;
    const msgW = Math.min(240, ctx.measureText(msg).width + 18);
    const bubbleY = -creature.radius - (isRemoteHuman ? 54 : 42);

    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.beginPath();
    ctx.roundRect(-msgW / 2, bubbleY - 14, msgW, 22, 10);
    ctx.fill();

    ctx.fillStyle = "#011627";
    ctx.fillText(msg, 0, bubbleY + 1);
    ctx.restore();
  }

  if (creature.name && (!creature.isStealthed || creature.isPlayer)) {
    ctx.save();
    ctx.font =
      creature.isPlayer || isRemoteHuman
        ? "bold 13px Segoe UI"
        : "600 11px Segoe UI";
    ctx.textAlign = "center";

    const crownPrefix = isRainbowStage
      ? "🌈👑 "
      : creature.bounty >= 2
        ? "👑 "
        : "";
    const lvTag =
      (creature.isPlayer || isRemoteHuman) && creature.level
        ? ` [Lv.${creature.level}]`
        : "";
    const displayLabel = isRemoteHuman
      ? `${crownPrefix}🌐 ${creature.name}${lvTag}`
      : `${crownPrefix}${creature.name}${lvTag}`;

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

    ctx.fillStyle = isRainbowStage
      ? `hsl(${(time * 0.25) % 360}, 100%, 66%)`
      : creature.isPlayer
        ? "#00f5d4"
        : isRemoteHuman
          ? "#fee440"
          : isDangerous
            ? "#ff758f"
            : "#ffffff";
    ctx.fillText(displayLabel, 0, labelY);

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
