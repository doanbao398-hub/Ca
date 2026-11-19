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
    title: "Dạng 2: Lam Ngọc",
    shortTitle: "Lam Ngọc",
    scaleBonus: 1.15,
    auraColor: "rgba(0, 245, 212, 0.25)",
    tint: { primary: "#00f5d4", secondary: "#0077b6", accent: "#ffffff" },
  },
  {
    stage: 3,
    minLevel: 22,
    title: "Dạng 3: Huyết Long",
    shortTitle: "Huyết Long",
    scaleBonus: 1.32,
    auraColor: "rgba(255, 190, 11, 0.30)",
    tint: { primary: "#ffbe0b", secondary: "#d00000", accent: "#fff3b0" },
  },
  {
    stage: 4,
    minLevel: 36,
    title: "Dạng 4: Thủy Thần",
    shortTitle: "Thủy Thần",
    scaleBonus: 1.5,
    auraColor: "rgba(255, 0, 110, 0.36)",
    tint: { primary: "#ff006e", secondary: "#3a0ca3", accent: "#00f5d4" },
  },
  {
    stage: 5,
    minLevel: 52,
    title: "Dạng 5: Hải Vương",
    shortTitle: "Hải Vương",
    scaleBonus: 1.7,
    auraColor: "rgba(131, 56, 236, 0.42)",
    tint: { primary: "#8338ec", secondary: "#10002b", accent: "#ffbe0b" },
  },
  {
    stage: 6,
    minLevel: 70,
    title: "Dạng 6: Cổ Thần Biển Sâu",
    shortTitle: "Cổ Thần",
    scaleBonus: 1.92,
    auraColor: "rgba(58, 134, 255, 0.48)",
    tint: { primary: "#3a86ff", secondary: "#03045e", accent: "#ff006e" },
  },
  {
    stage: 7,
    minLevel: 85,
    title: "Dạng 7: Hỗn Độn Thủy Tổ",
    shortTitle: "Thủy Tổ",
    scaleBonus: 2.15,
    auraColor: "rgba(255, 84, 0, 0.54)",
    tint: { primary: "#ff5400", secondary: "#370617", accent: "#fee440" },
  },
  {
    stage: 8,
    minLevel: 100,
    title: "Dạng 8: TỐI THƯỢNG HẢI THẦN",
    shortTitle: "Tối Thượng",
    scaleBonus: 2.4,
    auraColor: "rgba(254, 228, 64, 0.65)",
    tint: { primary: "#fee440", secondary: "#7209b7", accent: "#00f5d4" },
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
