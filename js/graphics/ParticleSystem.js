export class Shockwave {
  constructor(x, y, maxR, color) {
    this.x = x;
    this.y = y;
    this.r = 10;
    this.maxR = maxR;
    this.color = color;
    this.alpha = 0.9;
  }

  update() {
    this.r += (this.maxR - this.r) * 0.14;
    this.alpha -= 0.03;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class Particle {
  constructor(x, y, color, speed, size, isBubble = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    const a = Math.random() * Math.PI * 2;
    this.vx = isBubble ? (Math.random() - 0.5) * 0.4 : Math.cos(a) * speed;
    this.vy = isBubble ? -Math.random() * 1.5 - 0.5 : Math.sin(a) * speed;
    this.alpha = 1;
    this.isBubble = isBubble;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.isBubble ? 0.008 : 0.028;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    if (this.isBubble) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.alpha = 1;
  }

  update() {
    this.y -= 1.1;
    this.alpha -= 0.016;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 15px Segoe UI";
    ctx.fillStyle = this.color;
    ctx.textAlign = "center";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.shockwaves = [];
    this.particles = [];
    this.floatingTexts = [];
  }

  clear() {
    this.shockwaves = [];
    this.particles = [];
    this.floatingTexts = [];
  }

  addShockwave(x, y, maxR, color) {
    this.shockwaves.push(new Shockwave(x, y, maxR, color));
  }

  addParticle(x, y, color, speed, size, isBubble = false) {
    this.particles.push(new Particle(x, y, color, speed, size, isBubble));
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push(new FloatingText(x, y, text, color));
  }

  updateAndDraw(ctx) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].update();
      this.shockwaves[i].draw(ctx);
      if (this.shockwaves[i].alpha <= 0) this.shockwaves.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      this.particles[i].draw(ctx);
      if (this.particles[i].alpha <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update();
      this.floatingTexts[i].draw(ctx);
      if (this.floatingTexts[i].alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }
}
