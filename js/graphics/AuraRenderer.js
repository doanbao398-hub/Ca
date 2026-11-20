import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";

function drawStage2To7Effects(ctx, creature, time, evoData) {
  const stage = creature.evoStage;
  const r = creature.radius;
  const pulse = 1 + Math.sin(time * 0.0055) * 0.09;
  const tint = evoData?.tint || {
    primary: "#00f5d4",
    secondary: "#0077b6",
    accent: "#ffffff",
  };

  // 1. Vầng hào quang tỏa nhiệt tăng dần theo từng cấp 2 -> 7
  const outerMult = 1.65 + (stage - 2) * 0.14;
  const auraGrad = ctx.createRadialGradient(
    0,
    0,
    r * 0.35,
    0,
    0,
    r * outerMult * pulse,
  );
  auraGrad.addColorStop(0, evoData?.auraColor || "rgba(0, 245, 212, 0.3)");
  auraGrad.addColorStop(0.55, `${tint.primary}44`);
  auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * outerMult * pulse, 0, Math.PI * 2);
  ctx.fill();

  // 2. Tia hào quang xoay (Từ Dạng 5 trở lên)
  if (stage >= 5) {
    ctx.save();
    ctx.rotate(time * (0.0012 + stage * 0.0002));
    const rayCount = stage === 5 ? 6 : stage === 6 ? 8 : 10;
    for (let i = 0; i < rayCount; i++) {
      const a = (i * Math.PI * 2) / rayCount;
      ctx.fillStyle = i % 2 === 0 ? `${tint.accent}33` : `${tint.primary}2b`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(
        0,
        0,
        r * (1.75 + (stage - 5) * 0.18) * pulse,
        a - 0.08,
        a + 0.08,
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Vòng ma pháp xoay (tăng số lượng & họa tiết từ Dạng 2 -> 7)
  ctx.save();
  ctx.rotate(time * 0.0025);
  ctx.strokeStyle = tint.primary;
  ctx.lineWidth = stage >= 5 ? 3 : 2;
  ctx.setLineDash(stage >= 4 ? [14, 8] : [8, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, r * (1.35 + stage * 0.04), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (stage >= 4) {
    ctx.save();
    ctx.rotate(-time * 0.0034);
    ctx.strokeStyle = tint.accent;
    ctx.lineWidth = stage >= 6 ? 3 : 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, r * (1.52 + (stage - 4) * 0.06), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (stage >= 7) {
    ctx.save();
    ctx.rotate(time * 0.0046);
    ctx.strokeStyle = "#fee440";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([20, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 4. Tia điện cao áp (Dạng 6 & 7)
  if (stage >= 6) {
    ctx.save();
    ctx.strokeStyle = stage === 7 ? "#fee440" : "#00f5d4";
    ctx.lineWidth = 2;
    const arcCount = stage === 7 ? 5 : 3;
    for (let i = 0; i < arcCount; i++) {
      const baseA = time * 0.006 + (i * Math.PI * 2) / arcCount;
      const r1 = r * 1.15;
      const r2 = r * 1.55;
      const midA = baseA + Math.sin(time * 0.02 + i) * 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.cos(baseA) * r1, Math.sin(baseA) * r1);
      ctx.lineTo(
        Math.cos(midA) * ((r1 + r2) * 0.5),
        Math.sin(midA) * ((r1 + r2) * 0.5),
      );
      ctx.lineTo(Math.cos(baseA + 0.18) * r2, Math.sin(baseA + 0.18) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5. Tinh cầu quay quanh (từ Dạng 3 -> 7)
  if (stage >= 3) {
    ctx.save();
    ctx.rotate(time * (0.0022 + stage * 0.0004));
    const orbCount =
      stage === 3
        ? 3
        : stage === 4
          ? 4
          : stage === 5
            ? 6
            : stage === 6
              ? 8
              : 10;
    const orbitR = r * (1.28 + stage * 0.045);
    const orbRadius = Math.max(4.5, r * 0.075);
    for (let c = 0; c < orbCount; c++) {
      const ca = (c * Math.PI * 2) / orbCount;
      const ox = Math.cos(ca) * orbitR;
      const oy = Math.sin(ca) * orbitR;
      ctx.fillStyle = c % 2 === 0 ? tint.accent : tint.primary;
      ctx.shadowColor = tint.accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ox, oy, orbRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function renderCreatureEffects(
  ctx,
  creature,
  time,
  isDangerous,
  isRemoteHuman,
) {
  const evoData = EVOLUTION_FORMS[creature.evoStage - 1];
  const isRainbowStage =
    (creature.isPlayer || isRemoteHuman) && creature.evoStage >= 8;

  // GIỮ NGUYÊN HIỆU ỨNG CAO CẤP SẴN CÓ CỦA DẠNG 8
  if (isRainbowStage) {
    const hueBase = (time * 0.18) % 360;
    const pulse = 1 + Math.sin(time * 0.007) * 0.12;

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
    rainbowGrad.addColorStop(
      0.35,
      `hsla(${(hueBase + 90) % 360}, 100%, 56%, 0.42)`,
    );
    rainbowGrad.addColorStop(
      0.7,
      `hsla(${(hueBase + 200) % 360}, 100%, 52%, 0.22)`,
    );
    rainbowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rainbowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fill();

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
  } else if (
    (creature.isPlayer || isRemoteHuman || creature.isEpicBoss) &&
    creature.evoStage >= 2
  ) {
    drawStage2To7Effects(ctx, creature, time, evoData);
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

  // TINH CẦU DẠNG 8 (GIỮ NGUYÊN)
  if (isRainbowStage) {
    ctx.save();
    ctx.rotate(time * (0.002 + creature.evoStage * 0.0004));
    const orbCount = 12;
    const orbRadius = Math.max(5.5, creature.radius * 0.1);
    const orbitR = creature.radius * 1.55;
    for (let c = 0; c < orbCount; c++) {
      const ca = (c * Math.PI * 2) / orbCount;
      const ox = Math.cos(ca) * orbitR;
      const oy = Math.sin(ca) * orbitR;
      const orbHue = (time * 0.25 + c * (360 / orbCount)) % 360;
      ctx.fillStyle = `hsl(${orbHue}, 100%, 60%)`;
      ctx.shadowColor = `hsl(${orbHue}, 100%, 60%)`;
      ctx.shadowBlur = 12;
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

  if (!creature.isPlayer && isDangerous && !creature.isFriendlyNPC) {
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
    const msgW = Math.min(260, ctx.measureText(msg).width + 18);
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
      creature.isPlayer || isRemoteHuman || creature.isEpicBoss
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
      : creature.isEpicBoss
        ? -creature.radius - 28
        : -creature.radius - 15;
    const textW = ctx.measureText(displayLabel).width;

    ctx.fillStyle = creature.isFriendlyNPC
      ? "rgba(0, 75, 110, 0.85)"
      : isRemoteHuman || creature.isEpicBoss
        ? "rgba(36, 0, 70, 0.85)"
        : "rgba(1, 12, 22, 0.68)";
    ctx.beginPath();
    ctx.roundRect(-textW / 2 - 7, labelY - 12, textW + 14, 18, 7);
    ctx.fill();

    ctx.fillStyle = isRainbowStage
      ? `hsl(${(time * 0.25) % 360}, 100%, 66%)`
      : creature.isFriendlyNPC
        ? "#4cc9f0"
        : creature.isEpicBoss
          ? "#ffbe0b"
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
