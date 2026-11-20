export const MAX_SUPER_AUGMENTS = 4;

export const COMMON_AUGMENTS = [
  {
    id: "c_speed",
    name: "Vây Lướt Sóng",
    icon: "💨",
    desc: "+0.6% Tốc độ bơi cơ bản",
    apply: (p) => { p.speedBonus += 0.006; },
  },
  {
    id: "c_bite",
    name: "Mài Nanh Sắc",
    icon: "🦷",
    desc: "+0.8% Sát thương cắn & PvP",
    apply: (p) => { p.bitePower += 0.008; },
  },
  {
    id: "c_hp",
    name: "Thể Chất Bền Bỉ",
    icon: "❤️",
    desc: "+1.0% Máu tối đa & hồi nhẹ HP",
    apply: (p) => {
      const add = Math.max(2, Math.round(p.maxHp * 0.01));
      p.maxHp += add;
      p.heal(add);
    },
  },
  {
    id: "c_stamina",
    name: "Phổi Đại Dương",
    icon: "⚡",
    desc: "+0.8% Thể lực tối đa & hồi sức",
    apply: (p) => {
      p.maxStamina = Math.round(p.maxStamina * 1.008);
      p.stamina = Math.min(p.maxStamina, p.stamina + 10);
    },
  },
  {
    id: "c_magnet",
    name: "Từ Trường Biển Sâu",
    icon: "🧲",
    desc: "+1.2% Bán kính hút ngọc & thịt",
    apply: (p) => { p.magnetRadius = Math.round(p.magnetRadius * 1.012) + 2; },
  },
  {
    id: "c_cdr",
    name: "Nhịp Tim Hối Hả",
    icon: "⏱️",
    desc: "+0.5% Giảm hồi chiêu kỹ năng [E]",
    apply: (p) => { p.cdrMult = Math.max(0.35, p.cdrMult * 0.995); },
  },
  {
    id: "c_rage",
    name: "Huyết Sôi Sục",
    icon: "🔥",
    desc: "+0.8% Tốc độ tích Nộ Hóa Thần",
    apply: (p) => { p.rageGainMult = (p.rageGainMult || 1) + 0.008; },
  },
  {
    id: "c_lifesteal",
    name: "Hấp Huyết Nhẹ",
    icon: "🩸",
    desc: "+0.5% Hút máu khi săn mồi",
    apply: (p) => { p.lifeSteal += 0.35; },
  },
];

export const SUPER_AUGMENTS = [
  {
    id: "s_giant_heart",
    system: "empowerment",
    systemName: "Hệ Cường Hóa",
    name: "Trái Tim Khổng Lồ",
    icon: "🫀",
    desc: "+25% Máu tối đa và phóng đại kích cỡ cơ thể thêm +15%.",
    onEquip: (p) => {
      p.maxHp = Math.round(p.maxHp * 1.25);
      p.heal(p.maxHp * 0.4);
      p.augmentScaleMult = (p.augmentScaleMult || 1) * 1.15;
      p.recalculateRadius();
    },
  },
  {
    id: "s_void_fangs",
    system: "empowerment",
    systemName: "Hệ Cường Hóa",
    name: "Nanh Vuốt Hủy Diệt",
    icon: "🗡️",
    desc: "+22% Sức mạnh cắn và gây thêm sát thương chuẩn theo % máu địch.",
    onEquip: (p) => { p.bitePower += 0.22; },
  },
  {
    id: "s_thorn_armor",
    system: "empowerment",
    systemName: "Hệ Cường Hóa",
    name: "Giáp Gai Phản Chấn",
    icon: "🛡️",
    desc: "Giảm 20% sát thương nhận vào và phản lại 35% sát thương lên kẻ tấn công.",
    onEquip: (p) => { p.damageReduction = Math.min(0.65, (p.damageReduction || 0) + 0.2); },
  },
  {
    id: "s_bloodlust",
    system: "empowerment",
    systemName: "Hệ Cường Hóa",
    name: "Cuồng Huyết Hút Hồn",
    icon: "🧛",
    desc: "Hồi ngay 15% Máu tối đa mỗi khi hạ gục kẻ địch hoặc cắn trúng đuôi.",
    onEquip: (p) => { p.lifeSteal += 8; },
  },
  {
    id: "s_jet_engine",
    system: "empowerment",
    systemName: "Hệ Cường Hóa",
    name: "Động Cơ Phản Lực",
    icon: "🚀",
    desc: "+28% Tốc độ bơi và miễn phí thể lực trong 2 giây đầu khi tăng tốc.",
    onEquip: (p) => { p.speedBonus += 0.28; },
  },
  {
    id: "s_thunder_lord",
    system: "elemental",
    systemName: "Hệ Nguyên Tố",
    name: "Lôi Đình Đại Dương",
    icon: "⚡",
    desc: "Mỗi 4 giây giật tia sét lan sang tối đa 3 kẻ địch gần nhất & làm choáng 0.6s.",
    onEquip: () => {},
  },
  {
    id: "s_abyss_frost",
    system: "elemental",
    systemName: "Hệ Nguyên Tố",
    name: "Hàn Băng Vực Thẳm",
    icon: "❄️",
    desc: "Tỏa hào quang băng giá quanh thân, làm chậm 35% tốc độ kẻ địch áp sát.",
    onEquip: () => {},
  },
  {
    id: "s_magma_trail",
    system: "elemental",
    systemName: "Hệ Nguyên Tố",
    name: "Hỏa Ngục Dung Nham",
    icon: "🌋",
    desc: "Khi bơi nhanh để lại vệt lửa dưới đáy biển thiêu đốt kẻ đuổi theo.",
    onEquip: () => {},
  },
  {
    id: "s_astral_tide",
    system: "elemental",
    systemName: "Hệ Nguyên Tố",
    name: "Thủy Triều Hấp Tinh",
    icon: "🌀",
    desc: "+260px bán kính hút ngọc trai & thịt rơi, đồng thời nhân đôi điểm ngọc.",
    onEquip: (p) => { p.magnetRadius += 260; },
  },
  {
    id: "s_sonic_resonance",
    system: "elemental",
    systemName: "Hệ Nguyên Tố",
    name: "Cộng Hưởng Sóng Âm",
    icon: "🔮",
    desc: "Giảm 25% hồi chiêu [E] và mỗi lần dùng [E] phóng thêm 1 sóng xung kích.",
    onEquip: (p) => { p.cdrMult = Math.max(0.3, p.cdrMult * 0.75); },
  },
];

export const SYNERGY_TIERS = {
  empowerment: {
    name: "⚔️ Hệ Cường Hóa",
    color: "#ff5400",
    tiers: [
      {
        count: 2,
        title: "Hào Quang Chiến Binh (2)",
        desc: "Bật hào quang đỏ cam; +15% Sát thương & +10% Giảm sát thương.",
      },
      {
        count: 3,
        title: "Cú Đớp Chấn Động (3)",
        desc: "Mỗi 5 giây kích hoạt sóng chấn động đẩy văng kẻ địch xung quanh.",
      },
      {
        count: 4,
        title: "CHIẾN THẦN BẤT DIỆT (4)",
        desc: "Miễn nhiễm làm choáng/chậm & phóng đại kích cỡ thêm +20%.",
      },
    ],
  },
  elemental: {
    name: "🔮 Hệ Nguyên Tố",
    color: "#00f5d4",
    tiers: [
      {
        count: 2,
        title: "Vòng Ma Pháp Thủy Nguyên (2)",
        desc: "Xoay ấn chú dưới đáy; +25% tốc độ tích Nộ & giảm 15% hồi chiêu.",
      },
      {
        count: 3,
        title: "Bão Nguyên Tố Bùng Nổ (3)",
        desc: "Dùng kỹ năng [E] kích hoạt Bão Sét & Vụ Nổ Băng diện rộng.",
      },
      {
        count: 4,
        title: "PHÁP SƯ HẢI THẦN (4)",
        desc: "Khi bật Hóa Thần [R], liên tục bắn cầu nguyên tố truy đuổi mọi kẻ địch.",
      },
    ],
  },
};

export function getSynergyCounts(superAugmentIds = []) {
  let empowerment = 0;
  let elemental = 0;
  superAugmentIds.forEach((id) => {
    const aug = SUPER_AUGMENTS.find((a) => a.id === id);
    if (!aug) return;
    if (aug.system === "empowerment") empowerment++;
    if (aug.system === "elemental") elemental++;
  });
  return { empowerment, elemental };
}

