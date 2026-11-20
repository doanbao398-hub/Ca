function drawDetailedEye(ctx, x, y, size) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b090a";
  ctx.beginPath();
  ctx.arc(x + size * 0.28, y, size * 0.58, 0, Math.PI * 2);
  ctx.fill();
}

function drawPufferfish(ctx, creature, r) {
  ctx.fillStyle = creature.puffed ? "#ff4d6d" : "#ffd166";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (creature.puffed) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12));
      ctx.stroke();
    }
  }
  drawDetailedEye(ctx, r * 0.45, -r * 0.25, r * 0.22);
}

function drawCuteOctopus(ctx, creature, r, wag, colors) {
  const { animPhase } = creature;

  // 6 xúc tu uốn lượn phía sau dễ thương
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = Math.max(3, r * 0.22);
  ctx.lineCap = "round";
  for (let t = -2; t <= 2; t++) {
    const swing = Math.sin(animPhase + t * 0.9) * (r * 0.3);
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, t * r * 0.24);
    ctx.quadraticCurveTo(
      -r * 1.1,
      t * r * 0.34 + swing,
      -r * 1.65,
      t * r * 0.4 + swing * 1.3,
    );
    ctx.stroke();
  }

  // Đầu tròn bầu bĩnh
  const headGrad = ctx.createRadialGradient(
    r * 0.2,
    -r * 0.2,
    r * 0.1,
    0,
    0,
    r * 1.0,
  );
  headGrad.addColorStop(0, colors.accent);
  headGrad.addColorStop(0.55, colors.primary);
  headGrad.addColorStop(1, colors.secondary);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(r * 0.08, 0, r * 0.92, r * 0.84, 0, 0, Math.PI * 2);
  ctx.fill();

  // Má hồng đáng yêu
  ctx.fillStyle = "rgba(255, 77, 109, 0.5)";
  ctx.beginPath();
  ctx.ellipse(r * 0.35, -r * 0.34, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.35, r * 0.34, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Đôi mắt to long lanh
  drawDetailedEye(ctx, r * 0.45, -r * 0.22, r * 0.19);
  drawDetailedEye(ctx, r * 0.45, r * 0.22, r * 0.19);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(r * 0.48, -r * 0.26, r * 0.06, 0, Math.PI * 2);
  ctx.arc(r * 0.48, r * 0.18, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

function drawMermaid(ctx, creature, r, wag, colors) {
  // Đuôi cá lấp lánh
  const tailGrad = ctx.createLinearGradient(-r * 1.8, 0, r * 0.2, 0);
  tailGrad.addColorStop(0, colors.accent);
  tailGrad.addColorStop(0.5, colors.primary);
  tailGrad.addColorStop(1, colors.secondary);
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.34);
  ctx.quadraticCurveTo(-r * 1.1, wag * 0.6, -r * 1.65, wag);
  ctx.lineTo(-r * 2.15, -r * 0.58 + wag);
  ctx.quadraticCurveTo(-r * 1.65, wag, -r * 1.65, wag);
  ctx.lineTo(-r * 2.15, r * 0.58 + wag);
  ctx.quadraticCurveTo(-r * 1.1, wag * 0.6, -r * 0.2, r * 0.34);
  ctx.fill();

  // Thân trên & áo vỏ sò
  ctx.fillStyle = "#ffe5d9";
  ctx.beginPath();
  ctx.ellipse(r * 0.28, 0, r * 0.45, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.arc(r * 0.2, -r * 0.14, r * 0.14, 0, Math.PI * 2);
  ctx.arc(r * 0.2, r * 0.14, r * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Mái tóc bồng bềnh
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.ellipse(r * 0.65, 0, r * 0.55, r * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();

  // Khuôn mặt & vương miện san hô
  ctx.fillStyle = "#ffe5d9";
  ctx.beginPath();
  ctx.arc(r * 0.78, 0, r * 0.34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#00f5d4";
  ctx.beginPath();
  ctx.moveTo(r * 0.78, -r * 0.35);
  ctx.lineTo(r * 0.94, -r * 0.52);
  ctx.lineTo(r * 1.02, -r * 0.32);
  ctx.closePath();
  ctx.fill();

  drawDetailedEye(ctx, r * 0.9, -r * 0.1, r * 0.1);
}

function drawSeahorse(ctx, creature, r, wag, colors) {
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.ellipse(
    -r * 0.3,
    -r * 0.55 + wag * 0.3,
    r * 0.28,
    r * 0.42,
    -0.3,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(-r, 0, r, 0);
  bodyGrad.addColorStop(0, colors.secondary);
  bodyGrad.addColorStop(0.5, colors.primary);
  bodyGrad.addColorStop(1, colors.accent);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mõm dài đặc trưng
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.roundRect(r * 0.7, -r * 0.14, r * 0.62, r * 0.24, 5);
  ctx.fill();

  drawDetailedEye(ctx, r * 0.5, -r * 0.16, r * 0.14);
}

function drawAnglerfish(ctx, creature, r, wag, colors) {
  // Đuôi
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, 0);
  ctx.lineTo(-r * 1.5, -r * 0.55 + wag);
  ctx.lineTo(-r * 1.5, r * 0.55 + wag);
  ctx.closePath();
  ctx.fill();

  // Thân gai góc
  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.0, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cần câu & Đèn lồng phát sáng phía trước
  ctx.strokeStyle = "#90e0ef";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.55);
  ctx.quadraticCurveTo(r * 1.1, -r * 1.1, r * 1.45, -r * 0.4);
  ctx.stroke();

  const glow = ctx.createRadialGradient(
    r * 1.45,
    -r * 0.4,
    2,
    r * 1.45,
    -r * 0.4,
    r * 0.55,
  );
  glow.addColorStop(0, "#ffffff");
  glow.addColorStop(0.4, "#00f5d4");
  glow.addColorStop(1, "rgba(0, 245, 212, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(r * 1.45, -r * 0.4, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Răng nhọn
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(r * (0.4 + i * 0.14), r * 0.25);
    ctx.lineTo(r * (0.46 + i * 0.14), r * 0.05);
    ctx.lineTo(r * (0.52 + i * 0.14), r * 0.25);
    ctx.fill();
  }

  drawDetailedEye(ctx, r * 0.48, -r * 0.2, r * 0.16);
}

function drawDetailedSwordfish(ctx, creature, r, wag, colors) {
  const { isPlayer, evoStage } = creature;
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.quadraticCurveTo(-r * 1.45, -r * 0.85 + wag, -r * 1.95, -r * 0.75 + wag);
  ctx.quadraticCurveTo(-r * 1.45, wag * 0.3, -r * 1.35, 0);
  ctx.quadraticCurveTo(-r * 1.45, wag * 0.3, -r * 1.95, r * 0.75 + wag);
  ctx.quadraticCurveTo(-r * 1.45, r * 0.85 + wag, -r * 0.85, 0);
  ctx.fill();

  const finGrad = ctx.createLinearGradient(0, -r * 1.3, 0, -r * 0.4);
  finGrad.addColorStop(0, colors.accent);
  finGrad.addColorStop(1, colors.secondary);
  ctx.fillStyle = finGrad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.05, -r * 1.35, r * 0.35, -r * 0.45);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -r * 0.65, 0, r * 0.65);
  bodyGrad.addColorStop(0, colors.secondary);
  bodyGrad.addColorStop(0.55, colors.primary);
  bodyGrad.addColorStop(1, evoStage >= 8 ? colors.accent : "#e0fbfc");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.2, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer || evoStage > 1) {
    const swordGrad = ctx.createLinearGradient(r * 0.9, 0, r * 1.9, 0);
    swordGrad.addColorStop(0, colors.primary);
    swordGrad.addColorStop(1, colors.accent);
    ctx.fillStyle = swordGrad;
    ctx.beginPath();
    ctx.moveTo(r * 0.95, -r * 0.14);
    ctx.lineTo(r * 1.9 + evoStage * 5, 0);
    ctx.lineTo(r * 0.95, r * 0.12);
    ctx.fill();
  }
  drawDetailedEye(ctx, r * 0.62, -r * 0.18, r * 0.17);
}

function drawDetailedTurtle(ctx, creature, r, wag, colors) {
  const { animPhase, evoStage } = creature;
  ctx.fillStyle = colors.primary;
  const paddleSwing = Math.sin(animPhase) * 0.25;

  ctx.save();
  ctx.translate(r * 0.35, r * 0.5);
  ctx.rotate(0.4 + paddleSwing);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.22, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(r * 0.35, -r * 0.5);
  ctx.rotate(-0.4 - paddleSwing);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.35, r * 0.22, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.ellipse(r * 0.98, 0, r * 0.38, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  const shellGrad = ctx.createRadialGradient(
    -r * 0.1,
    -r * 0.2,
    r * 0.1,
    -r * 0.05,
    0,
    r * 1.0,
  );
  shellGrad.addColorStop(0, colors.primary);
  shellGrad.addColorStop(0.7, colors.secondary);
  shellGrad.addColorStop(1, "#081c15");
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, 0, r * 0.95, r * 0.76, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.stroke();

  if (evoStage >= 3) {
    ctx.fillStyle = evoStage >= 8 ? colors.accent : "#fee440";
    for (let a = -2; a <= 2; a++) {
      ctx.beginPath();
      ctx.arc(a * r * 0.22, 0, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawDetailedEye(ctx, r * 1.12, -r * 0.11, r * 0.12);
}

function drawDetailedCrocodile(ctx, creature, r, wag, colors) {
  const { eatAnim } = creature;
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.34);
  ctx.quadraticCurveTo(-r * 1.5, wag * 0.5, -r * 2.25, wag);
  ctx.quadraticCurveTo(-r * 1.5, wag * 0.5 + r * 0.15, -r * 0.75, r * 0.34);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -r * 0.48, 0, r * 0.48);
  bodyGrad.addColorStop(0, colors.secondary);
  bodyGrad.addColorStop(0.5, colors.primary);
  bodyGrad.addColorStop(1, creature.evoStage >= 8 ? colors.accent : "#b7e4c7");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, 0, r * 1.0, r * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  const jawAngle = eatAnim * 0.32;
  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.roundRect(r * 0.45, 0, r * 1.05, r * 0.18, 5);
  ctx.fill();

  ctx.save();
  ctx.translate(r * 0.45, 0);
  ctx.rotate(-jawAngle);
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.roundRect(0, -r * 0.24, r * 1.12, r * 0.24, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  for (let t = 0; t < 5; t++) {
    const tx = r * (0.2 + t * 0.18);
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx + r * 0.05, r * 0.11);
    ctx.lineTo(tx + r * 0.1, 0);
    ctx.fill();
  }
  ctx.restore();
  drawDetailedEye(ctx, r * 0.48, -r * 0.26, r * 0.14);
}

function drawDetailedDiver(ctx, creature, r, wag, colors) {
  const { animPhase } = creature;
  ctx.fillStyle = creature.evoStage >= 8 ? colors.accent : "#fee440";
  const kick = Math.sin(animPhase) * 0.28;
  ctx.save();
  ctx.translate(-r * 0.75, r * 0.15);
  ctx.rotate(kick);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-r * 0.75, -r * 0.12);
  ctx.lineTo(-r * 0.75, r * 0.22);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#ced4da";
  ctx.beginPath();
  ctx.roundRect(-r * 0.5, -r * 0.62, r * 0.9, r * 0.3, 6);
  ctx.fill();

  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, 0, r * 0.85, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.roundRect(-r * 0.25, -r * 0.36, r * 0.45, r * 0.72, 8);
  ctx.fill();

  ctx.fillStyle = "#343a40";
  ctx.beginPath();
  ctx.arc(r * 0.75, 0, r * 0.36, 0, Math.PI * 2);
  ctx.fill();

  const visorGrad = ctx.createLinearGradient(
    r * 0.75,
    -r * 0.25,
    r * 1.1,
    r * 0.25,
  );
  visorGrad.addColorStop(
    0,
    creature.evoStage >= 8 ? colors.primary : "#00f5d4",
  );
  visorGrad.addColorStop(1, creature.evoStage >= 8 ? colors.accent : "#00bbf9");
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.roundRect(r * 0.8, -r * 0.24, r * 0.28, r * 0.42, 6);
  ctx.fill();
}

function drawDetailedSpaceFish(ctx, creature, r, wag, colors) {
  const tailGrad = ctx.createLinearGradient(-r * 0.8, 0, -r * 2.3, 0);
  tailGrad.addColorStop(0, colors.primary);
  tailGrad.addColorStop(0.5, "#e0aaff");
  tailGrad.addColorStop(1, "rgba(0, 245, 212, 0.15)");
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, 0);
  ctx.quadraticCurveTo(-r * 1.6, -r * 1.05 + wag, -r * 2.35, -r * 0.55 + wag);
  ctx.quadraticCurveTo(-r * 1.55, wag * 0.2, -r * 1.45, 0);
  ctx.quadraticCurveTo(-r * 1.55, wag * 0.2, -r * 2.35, r * 0.55 + wag);
  ctx.quadraticCurveTo(-r * 1.6, r * 1.05 + wag, -r * 0.75, 0);
  ctx.fill();

  ctx.fillStyle = "rgba(157, 78, 221, 0.55)";
  ctx.strokeStyle = "#00f5d4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.45);
  ctx.quadraticCurveTo(r * 0.1, -r * 1.55, r * 0.55, -r * 0.45);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.2, r * 0.45);
  ctx.quadraticCurveTo(r * 0.1, r * 1.55, r * 0.55, r * 0.45);
  ctx.fill();
  ctx.stroke();

  const bodyGrad = ctx.createRadialGradient(
    r * 0.2,
    -r * 0.1,
    r * 0.1,
    0,
    0,
    r * 1.25,
  );
  bodyGrad.addColorStop(0, "#e0aaff");
  bodyGrad.addColorStop(0.45, colors.primary);
  bodyGrad.addColorStop(1, "#10002b");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.22, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.save();
  ctx.rotate(-0.28);
  ctx.strokeStyle = "#fee440";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.45, r * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#00f5d4";
  ctx.beginPath();
  ctx.arc(r * 0.66, -r * 0.16, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(r * 0.71, -r * 0.19, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawDetailedTimeFish(ctx, creature, r, wag, colors) {
  const spin = Date.now() * 0.003;

  ctx.save();
  ctx.translate(-r * 0.15, 0);
  ctx.rotate(spin);
  ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
  ctx.stroke();

  const teeth = 12;
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15);
    ctx.lineTo(Math.cos(a) * r * 1.34, Math.sin(a) * r * 1.34);
    ctx.stroke();
  }
  ctx.restore();

  const tailGrad = ctx.createLinearGradient(-r * 0.75, 0, -r * 2.25, 0);
  tailGrad.addColorStop(0, colors.primary);
  tailGrad.addColorStop(0.55, colors.accent);
  tailGrad.addColorStop(1, "rgba(45, 212, 191, 0.1)");
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, 0);
  ctx.quadraticCurveTo(-r * 1.55, -r * 1.0 + wag, -r * 2.25, -r * 0.65 + wag);
  ctx.lineTo(-r * 1.45, wag * 0.25);
  ctx.lineTo(-r * 2.25, r * 0.65 + wag);
  ctx.quadraticCurveTo(-r * 1.55, r * 1.0 + wag, -r * 0.75, 0);
  ctx.fill();

  ctx.fillStyle = "rgba(245, 158, 11, 0.75)";
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.45);
  ctx.lineTo(r * 0.15, -r * 1.48);
  ctx.lineTo(r * 0.48, -r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.15, r * 0.45);
  ctx.lineTo(r * 0.15, r * 1.48);
  ctx.lineTo(r * 0.48, r * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const bodyGrad = ctx.createLinearGradient(
    -r * 1.1,
    -r * 0.6,
    r * 1.2,
    r * 0.6,
  );
  bodyGrad.addColorStop(0, "#0f172a");
  bodyGrad.addColorStop(0.45, colors.primary);
  bodyGrad.addColorStop(0.85, colors.accent);
  bodyGrad.addColorStop(1, "#fef08a");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.22, r * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.save();
  ctx.translate(-r * 0.1, 0);
  ctx.strokeStyle = "#0f172a";
  ctx.fillStyle = "rgba(254, 240, 138, 0.92)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, -r * 0.24);
  ctx.lineTo(r * 0.24, -r * 0.24);
  ctx.lineTo(-r * 0.24, r * 0.24);
  ctx.lineTo(r * 0.24, r * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.moveTo(r * 1.05, -r * 0.11);
  ctx.lineTo(r * 1.65, 0);
  ctx.lineTo(r * 1.05, r * 0.11);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2dd4bf";
  ctx.beginPath();
  ctx.arc(r * 0.68, -r * 0.16, r * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(r * 0.72, -r * 0.18, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

const SPECIES_RENDERERS = {
  fish: drawDetailedSwordfish,
  turtle: drawDetailedTurtle,
  croc: drawDetailedCrocodile,
  diver: drawDetailedDiver,
  space: drawDetailedSpaceFish,
  time: drawDetailedTimeFish,
  puffer: drawPufferfish,
  octopus: drawCuteOctopus,
  mermaid: drawMermaid,
  seahorse: drawSeahorse,
  angler: drawAnglerfish,
};

export function renderCreatureBody(ctx, creature, r, wag, activeColors = null) {
  const renderer = SPECIES_RENDERERS[creature.species] || drawDetailedSwordfish;
  renderer(ctx, creature, r, wag, activeColors || creature.colors);
}
