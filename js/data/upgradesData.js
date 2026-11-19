export const META_SHOP_ITEMS = [
  {
    key: "startSize",
    name: "🧬 Gen Khổng Lồ",
    desc: "+8% Kích thước khởi đầu mỗi cấp",
    baseCost: 100,
    maxLevel: 5,
  },
  {
    key: "maxHpBonus",
    name: "❤️ Giáp Sinh Học",
    desc: "+25 HP tối đa khởi đầu mỗi cấp",
    baseCost: 100,
    maxLevel: 5,
  },
  {
    key: "gemMagnet",
    name: "🧲 Từ Trường Hút Mồi",
    desc: "+30px tầm hút ngọc & thịt mỗi cấp",
    baseCost: 120,
    maxLevel: 5,
  },
];

export const ROGUELIKE_CARDS = [
  {
    id: "spd",
    icon: "⚡",
    title: "Vây Thủy Động Lực",
    desc: "Tăng +12% tốc độ bơi cơ bản",
    apply: (p) => {
      p.speedBonus += 0.12;
    },
  },
  {
    id: "cdr",
    icon: "⏳",
    title: "Tuyến Năng Lượng",
    desc: "Giảm 18% thời gian hồi chiêu Skill [E]",
    apply: (p) => {
      p.cdrMult = Math.max(0.25, p.cdrMult * 0.82);
    },
  },
  {
    id: "hp",
    icon: "💖",
    title: "Tái Tạo Tế Bào",
    desc: "Tăng +45 HP tối đa & hồi đầy máu ngay lập tức",
    apply: (p) => {
      p.maxHp += 45;
      p.hp = p.maxHp;
    },
  },
  {
    id: "mag",
    icon: "🧲",
    title: "Trường Hấp Dẫn",
    desc: "Tăng +100px tầm tự động hút Ngọc Trai & Thịt",
    apply: (p) => {
      p.magnetRadius += 100;
    },
  },
  {
    id: "bite",
    icon: "🦈",
    title: "Hàm Răng Sắc Bén",
    desc: "Tăng +35% sát thương cắn đuôi, PvP & Boss",
    apply: (p) => {
      p.bitePower += 0.35;
    },
  },
  {
    id: "vamp",
    icon: "🩸",
    title: "Hấp Thụ Sinh Lực",
    desc: "Hồi thêm +8 HP mỗi khi nuốt chửng con mồi",
    apply: (p) => {
      p.lifeSteal += 8;
    },
  },
  {
    id: "titan",
    icon: "🐋",
    title: "Tế Bào Khổng Lồ",
    desc: "Tăng ngay +8 kích thước cơ bản & +30 HP tối đa",
    apply: (p) => {
      p.baseRadius = Math.min(180, p.baseRadius + 8);
      p.maxHp += 30;
      p.hp = Math.min(p.maxHp, p.hp + 30);
      p.recalculateRadius();
    },
  },
];
