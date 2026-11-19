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

function drawDetailedSwordfish(ctx, creature, r, wag) {
  const { colors, isPlayer, evoStage } = creature;
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
  bodyGrad.addColorStop(1, "#e0fbfc");
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

function drawDetailedTurtle(ctx, creature, r) {
  const { colors, animPhase, evoStage } = creature;
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
    r * 1.0
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
    ctx.fillStyle = "#fee440";
    for (let a = -2; a <= 2; a++) {
      ctx.beginPath();
      ctx.arc(a * r * 0.22, 0, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawDetailedEye(ctx, r * 1.12, -r * 0.11, r * 0.12);
}

function drawDetailedCrocodile(ctx, creature, r, wag) {
  const { colors, eatAnim } = creature;
  ctx.fillStyle = colors.secondary;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.34);
  ctx.quadraticCurveTo(-r * 1.5, wag * 0.5, -r * 2.25, wag);
  ctx.quadraticCurveTo(-r * 1.5, wag * 0.5 + r * 0.15, -r * 0.75, r * 0.34);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -r * 0.48, 0, r * 0.48);
  bodyGrad.addColorStop(0, colors.secondary);
  bodyGrad.addColorStop(0.5, colors.primary);
  bodyGrad.addColorStop(1, "#b7e4c7");
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

function drawDetailedDiver(ctx, creature, r) {
  const { colors, animPhase } = creature;
  ctx.fillStyle = "#fee440";
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
    r * 0.25
  );
  visorGrad.addColorStop(0, "#00f5d4");
  visorGrad.addColorStop(1, "#00bbf9");
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.roundRect(r * 0.8, -r * 0.24, r * 0.28, r * 0.42, 6);
  ctx.fill();
}

const SPECIES_RENDERERS = {
  fish: drawDetailedSwordfish,
  turtle: drawDetailedTurtle,
  croc: drawDetailedCrocodile,
  diver: drawDetailedDiver,
  puffer: drawPufferfish,
};

export function renderCreatureBody(ctx, creature, r, wag) {
  const renderer = SPECIES_RENDERERS[creature.species] || drawDetailedSwordfish;
  renderer(ctx, creature, r, wag);
}
