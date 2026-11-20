import { Creature } from "./Creature.js";
import { getWorldSize } from "../data/mapsConfig.js";
import { sound } from "../core/SoundSystem.js";

const MERMAID_LINES = [
  "🎵 Giai điệu biển sâu chúc bạn may mắn!",
  "🐚 Hãy giữ sức khi đối đầu Boss Sử Thi nhé!",
  "✨ Hào quang san hô đang bảo vệ bạn!",
  "💎 Ngọc trai ẩn chứa sức mạnh tiến hóa!",
];

const OCTOPUS_LINES = [
  "🐙 Blub blub~ Bạch tuộc thích kết bạn!",
  "🫧 Tặng bạn bong bóng may mắn nè!",
  "🌟 Cẩn thận Cá Mập và Boss Không Gian nhé!",
];

export class OceanNPC extends Creature {
  constructor(mapKey = "coral", npcKind = "mermaid") {
    const ws = getWorldSize(mapKey);
    const x = Math.random() * (ws - 500) + 250;
    const y = Math.random() * (ws - 500) + 250;
    const isMermaid = npcKind === "mermaid";

    super(
      x,
      y,
      isMermaid ? 28 : 22,
      isMermaid ? "mermaid" : "octopus",
      isMermaid ? "🧜‍♀️ Tiên Cá Ánh Sao" : "🐙 Bé Bạch Tuộc NPC",
      false,
    );

    this.mapKey = mapKey;
    this.npcKind = npcKind;
    this.isFriendlyNPC = true;
    this.angle = Math.random() * Math.PI * 2;
    this.wanderOffset = Math.random() * 100;
    this.blessingCd = 0;
    this.chatCd = 4 + Math.random() * 8;
    this.colors = isMermaid
      ? { primary: "#4cc9f0", secondary: "#7209b7", accent: "#ffd166" }
      : { primary: "#ff758f", secondary: "#c9184a", accent: "#fff0f3" };
  }

  update(player, dt, particleSystem) {
    const ws = getWorldSize(this.mapKey);
    this.wanderOffset += dt * 1.4;

    let targetAngle = this.angle + Math.sin(this.wanderOffset) * 0.025;
    if (this.x < 240) targetAngle = 0;
    if (this.x > ws - 240) targetAngle = Math.PI;
    if (this.y < 240) targetAngle = Math.PI / 2;
    if (this.y > ws - 240) targetAngle = -Math.PI / 2;

    let diff = targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * 0.04;

    const speed = this.npcKind === "mermaid" ? 1.8 : 1.45;
    const frameScale = dt * 60;
    this.x += Math.cos(this.angle) * speed * frameScale;
    this.y += Math.sin(this.angle) * speed * frameScale;
    this.animPhase += 0.12;

    if (this.blessingCd > 0)
      this.blessingCd = Math.max(0, this.blessingCd - dt);
    if (this.chatBubbleTimer > 0) {
      this.chatBubbleTimer = Math.max(0, this.chatBubbleTimer - dt);
    }

    this.chatCd -= dt;
    if (this.chatCd <= 0) {
      this.chatCd = 11 + Math.random() * 10;
      const lines = this.npcKind === "mermaid" ? MERMAID_LINES : OCTOPUS_LINES;
      this.setChatBubble(lines[Math.floor(Math.random() * lines.length)], 4.5);
    }

    if (player && player.hp > 0) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < player.radius + this.radius + 60 && this.blessingCd <= 0) {
        this.blessingCd = 25;
        player.heal(player.maxHp * 0.15);
        player.stamina = Math.min(
          player.maxStamina,
          player.stamina + player.maxStamina * 0.25,
        );
        player.addScore(120, null, this.mapKey, particleSystem, null);
        sound.playEat(2);
        this.setChatBubble(
          this.npcKind === "mermaid"
            ? "✨ Phước lành Tiên Cá (+15% HP & +120 XP)!"
            : "🐙 Quà tặng Bạch Tuộc (+15% HP & +120 XP)!",
          4.0,
        );
        if (particleSystem) {
          particleSystem.addShockwave(this.x, this.y, 120, "#4cc9f0");
          particleSystem.addFloatingText(
            player.x,
            player.y - player.radius - 20,
            "💖 PHƯỚC LÀNH NPC!",
            "#00f5d4",
          );
        }
      }
    }
  }
}
