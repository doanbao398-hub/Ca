export const TACTICAL_ITEMS = {
  heal_potion: {
    id: "heal_potion",
    name: "Tinh Chất San Hô",
    icon: "🧪",
    color: "#06d6a0",
    desc: "Hồi ngay 45% Máu tối đa & xóa hiệu ứng choáng.",
    use: (player, { particleSystem }) => {
      player.heal(player.maxHp * 0.45);
      player.stunTimer = 0;
      particleSystem.addShockwave(player.x, player.y, player.radius * 2.4, "#06d6a0");
      particleSystem.addFloatingText(player.x, player.y - player.radius - 20, "🧪 HỒI PHỤC +45% HP!", "#06d6a0");
    },
  },
  turbo_jet: {
    id: "turbo_jet",
    name: "Bình Khí Phản Lực",
    icon: "🚀",
    color: "#ff9f1c",
    desc: "Hồi đầy 100% Thể Lực & lướt siêu tốc trong 1.2 giây.",
    use: (player, { particleSystem }) => {
      player.stamina = player.maxStamina;
      player.isExhausted = false;
      player.dashTimer = Math.max(player.dashTimer, 1.2);
      particleSystem.addShockwave(player.x, player.y, player.radius * 3.0, "#ff9f1c");
      particleSystem.addFloatingText(player.x, player.y - player.radius - 20, "🚀 TĂNG TỐC PHẢN LỰC!", "#ff9f1c");
    },
  },
  emp_bomb: {
    id: "emp_bomb",
    name: "Bom Xung Điện Từ",
    icon: "💣",
    color: "#fee440",
    desc: "Kích nổ sóng xung kích làm choáng & đẩy văng kẻ địch xung quanh.",
    use: (player, { enemies, particleSystem, camera }) => {
      camera.shake = 14;
      const blastR = player.radius + 260;
      particleSystem.addShockwave(player.x, player.y, blastR, "#fee440");
      particleSystem.addFloatingText(player.x, player.y - player.radius - 20, "💣 NỔ XUNG ĐIỆN TỪ!", "#fee440");
      enemies.forEach((e) => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < blastR && d > 0) {
          e.stunTimer = 3.0;
          const ang = Math.atan2(e.y - player.y, e.x - player.x);
          e.x += Math.cos(ang) * 180;
          e.y += Math.sin(ang) * 180;
        }
      });
    },
  },
  rage_elixir: {
    id: "rage_elixir",
    name: "Huyết Thần Đan",
    icon: "🔥",
    color: "#ff006e",
    desc: "Nạp ngay +60% Nộ Hóa Thần [R] & tăng sát thương tạm thời.",
    use: (player, { particleSystem }) => {
      player.rage = Math.min(100, player.rage + 60);
      particleSystem.addShockwave(player.x, player.y, player.radius * 2.5, "#ff006e");
      particleSystem.addFloatingText(player.x, player.y - player.radius - 20, "🔥 NỘ KHÍ BÙNG NỔ (+60%)!", "#ff006e");
    },
  },
};

const ITEM_KEYS = Object.keys(TACTICAL_ITEMS);

export function getRandomItemConfig() {
  const key = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
  return TACTICAL_ITEMS[key];
}

