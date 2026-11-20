export const MAX_PLAYER_LEVEL = 100;

export const EVOLUTION_FORMS = [
  {
    stage: 1,
    minLevel: 1,
    title: "Dạng 1: Nguyên Thủy",
    shortTitle: "Nguyên Thủy",
    scaleBonus: 1.0,
    auraColor: null,
    tint: null,
  },
  {
    stage: 2,
    minLevel: 10,
    title: "Dạng 2: Lam Ngọc Thanh Khiết",
    shortTitle: "Lam Ngọc",
    scaleBonus: 1.15,
    auraColor: "rgba(0, 245, 212, 0.34)",
    tint: { primary: "#00f5d4", secondary: "#0077b6", accent: "#e0fbfc" },
  },
  {
    stage: 3,
    minLevel: 22,
    title: "Dạng 3: Huyết Long Lửa Đỏ",
    shortTitle: "Huyết Long",
    scaleBonus: 1.32,
    auraColor: "rgba(255, 77, 109, 0.40)",
    tint: { primary: "#ff4d6d", secondary: "#9d0208", accent: "#ffbe0b" },
  },
  {
    stage: 4,
    minLevel: 36,
    title: "Dạng 4: Thủy Thần Neon",
    shortTitle: "Thủy Thần",
    scaleBonus: 1.5,
    auraColor: "rgba(247, 37, 133, 0.45)",
    tint: { primary: "#f72585", secondary: "#3a0ca3", accent: "#4cc9f0" },
  },
  {
    stage: 5,
    minLevel: 52,
    title: "Dạng 5: Hải Vương Hoàng Kim",
    shortTitle: "Hải Vương",
    scaleBonus: 1.7,
    auraColor: "rgba(157, 78, 221, 0.52)",
    tint: { primary: "#9d4edd", secondary: "#10002b", accent: "#ffd166" },
  },
  {
    stage: 6,
    minLevel: 70,
    title: "Dạng 6: Cổ Thần Lôi Điện",
    shortTitle: "Cổ Thần",
    scaleBonus: 1.92,
    auraColor: "rgba(0, 187, 249, 0.58)",
    tint: { primary: "#00bbf9", secondary: "#03045e", accent: "#ff006e" },
  },
  {
    stage: 7,
    minLevel: 85,
    title: "Dạng 7: Hỗn Độn Thủy Tổ",
    shortTitle: "Thủy Tổ",
    scaleBonus: 2.15,
    auraColor: "rgba(255, 84, 0, 0.65)",
    tint: { primary: "#ff5400", secondary: "#240046", accent: "#fee440" },
  },
  {
    stage: 8,
    minLevel: 100,
    title: "Dạng 8: TỐI THƯỢNG CẦU VỒNG",
    shortTitle: "🌈 Tối Thượng",
    scaleBonus: 2.4,
    isRainbow: true,
    auraColor: "rgba(255, 0, 128, 0.72)",
    tint: { primary: "#ff006e", secondary: "#3a0ca3", accent: "#00f5d4" },
  },
];

export function getExpectedEvoStageForLevel(level) {
  let stage = 1;
  for (let i = 0; i < EVOLUTION_FORMS.length; i++) {
    if (level >= EVOLUTION_FORMS[i].minLevel) {
      stage = EVOLUTION_FORMS[i].stage;
    }
  }
  return stage;
}
