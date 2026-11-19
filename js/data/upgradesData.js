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
    desc: "+20 HP tối đa khởi đầu mỗi cấp",
    baseCost: 100,
    maxLevel: 5,
  },
  {
    key: "gemMagnet",
    name: "🧲 Từ Trường Hút Mồi",
    desc: "+25px tầm hút ngọc & thịt mỗi cấp",
    baseCost: 120,
    maxLevel: 5,
  },
];

export const ROGUELIKE_CARDS = [
  {
    id: "spd",
    icon: "⚡",
    title: "Vây Thủy Động Lực",
    desc: "Tăng +15% tốc độ bơi cơ bản",
    apply: (p) => {
      p.speedBonus += 0.15;
    },
  },
  {
    id: "cdr",
    icon: "⏳",
    title: "Tuyến Năng Lượng",
    desc: "Giảm 20% thời gian hồi chiêu Skill [E]",
    apply: (p) => {
      p.cdrMult *= 0.8;
    },
  },
  {
    id: "hp",
    icon: "💖",
    title: "Tái Tạo Tế Bào",
    desc: "Tăng +30 HP tối đa & hồi đầy máu ngay lập tức",
    apply: (p) => {
      p.maxHp += 30;
      p.hp = p.maxHp;
    },
  },
  {
    id: "mag",
    icon: "🧲",
    title: "Trường Hấp Dẫn",
    desc: "Tăng +90px tầm tự động hút Ngọc Trai & Thịt",
    apply: (p) => {
      p.magnetRadius += 90;
    },
  },
  {
    id: "bite",
    icon: "🦈",
    title: "Hàm Răng Sắc Bén",
    desc: "Tăng +40% sát thương cắn đuôi cá lớn & Boss",
    apply: (p) => {
      p.bitePower += 0.4;
    },
  },
  {
    id: "vamp",
    icon: "🩸",
    title: "Hấp Thụ Sinh Lực",
    desc: "Hồi thêm +6 HP mỗi khi nuốt chửng con mồi",
    apply: (p) => {
      p.lifeSteal += 6;
    },
  },
];
