import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";
import { renderCreatureBody } from "../graphics/CreatureRenderer.js";
import { renderCreatureEffects } from "../graphics/AuraRenderer.js";

export class Creature {
  constructor(x, y, baseRadius, speciesType, name = "", isPlayer = false) {
    this.x = x;
    this.y = y;
    this.baseRadius = baseRadius;
    this.radius = baseRadius;
    this.species = speciesType;
    this.name = name;
    this.isPlayer = isPlayer;
    this.isRemoteHuman = false;

    this.angle = 0;
    this.animPhase = Math.random() * Math.PI * 2;
    this.eatAnim = 0;
    this.stunTimer = 0;
    this.evoStage = 1;
    this.isStealthed = false;
    this.invincibleTimer = 0;
    this.ultTimer = 0;
    this.hurtTimer = 0;
    this.bounty = 0;
    this.emote = "";
    this.emoteTimer = 0;

    this.colors = {
      ...(SPECIES_CONFIG[speciesType]?.colors || {
        primary: "#ff6b6b",
        secondary: "#c92a2a",
        accent: "#ffe066",
      }),
    };
  }

  applyEvoAppearance(stage) {
    this.evoStage = stage || 1;
    const evo = EVOLUTION_FORMS[this.evoStage - 1];
    if (evo && evo.tint) {
      this.colors = { ...evo.tint };
    } else {
      this.colors = {
        ...(SPECIES_CONFIG[this.species]?.colors || this.colors),
      };
    }
  }

  draw(ctx, time, isDangerous = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isStealthed) {
      ctx.globalAlpha = this.isRemoteHuman ? 0.12 : 0.42;
    }

    renderCreatureEffects(ctx, this, time, isDangerous, this.isRemoteHuman);

    if (this.hurtTimer > 0 && Math.floor(time / 70) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.rotate(this.angle);
    if (Math.abs(this.angle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }

    const r = this.radius;
    const wag = Math.sin(this.animPhase) * (r * 0.28);
    renderCreatureBody(ctx, this, r, wag);

    ctx.restore();
  }
}
