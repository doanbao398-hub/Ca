import { Creature } from "./Creature.js";

export class RemotePlayer extends Creature {
  constructor(id, data) {
    super(
      data.x || 0,
      data.y || 0,
      data.radius || 22,
      data.species || "fish",
      data.name || "Người Chơi",
      false,
    );
    this.id = id;
    this.isRemoteHuman = true;
    this.targetX = this.x;
    this.targetY = this.y;
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.hp = data.hp ?? 100;
    this.maxHp = data.maxHp ?? 100;
    this.bounty = data.bounty || 0;
    this.lastHitTime = 0;
    this.syncFromNetwork(data);
  }

  syncFromNetwork(data) {
    this.name = data.name || this.name;
    this.targetX = data.x ?? this.targetX;
    this.targetY = data.y ?? this.targetY;
    this.angle = data.angle ?? this.angle;
    this.radius = data.radius || this.radius;
    this.species = data.species || this.species;
    this.score = data.score ?? this.score;
    this.level = data.level || this.level;
    if (typeof data.hp === "number") this.hp = data.hp;
    if (typeof data.maxHp === "number") this.maxHp = data.maxHp;
    this.bounty = data.bounty || 0;
    this.isStealthed = !!data.isStealthed;
    this.invincibleTimer = data.invincible ? 1 : 0;
    this.ultTimer = data.ult ? 1 : 0;
    this.applyEvoAppearance(data.evoStage || 1);
  }

  triggerHurtFlash() {
    this.hurtTimer = 0.35;
  }

  update(dt) {
    this.x += (this.targetX - this.x) * 0.22;
    this.y += (this.targetY - this.y) * 0.22;
    this.animPhase += 0.18;
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    }
    if (this.emoteTimer > 0) {
      this.emoteTimer = Math.max(0, this.emoteTimer - dt);
    }
    if (this.chatBubbleTimer > 0) {
      this.chatBubbleTimer = Math.max(0, this.chatBubbleTimer - dt);
    }
  }
}
