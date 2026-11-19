export const SPECIES_CONFIG = {
  fish: {
    name: "Cá Kiếm Hoàng Kim",
    skillId: "dash_stun",
    skillName: "Xung Kích",
    skillCooldown: 6.5,
    baseSpeed: 4.4,
    boostMult: 1.8,
    maxHp: 100,
    maxStamina: 115,
    staminaDrain: 32,
    staminaRegen: 22,
    eatRangeMult: 1.08,
    scoreMult: 1.0,
    favMap: "coral",
    counters: "diver", // Cá Kiếm khắc chế Thợ Lặn (+18% sát thương)
    colors: { primary: "#00bbf9", secondary: "#023e8a", accent: "#fee440" },
  },
  turtle: {
    name: "Rùa Thần Biển Sâu",
    skillId: "fortress_shield",
    skillName: "Pháo Đài",
    skillCooldown: 9.5,
    baseSpeed: 3.7,
    boostMult: 1.65,
    maxHp: 135,
    maxStamina: 125,
    staminaDrain: 30,
    staminaRegen: 20,
    eatRangeMult: 1.02,
    scoreMult: 1.05,
    favMap: "coral",
    counters: "croc", // Rùa khắc chế Cá Sấu (+18% sát thương)
    colors: { primary: "#2ec4b6", secondary: "#1b4332", accent: "#cbf3f0" },
  },
  croc: {
    name: "Cá Sấu Đầm Lầy",
    skillId: "whirlpool_pull",
    skillName: "Xoáy Nước",
    skillCooldown: 7.5,
    baseSpeed: 4.0,
    boostMult: 1.85,
    maxHp: 115,
    maxStamina: 110,
    staminaDrain: 34,
    staminaRegen: 19,
    eatRangeMult: 1.25,
    scoreMult: 1.2,
    favMap: "swamp",
    counters: "fish", // Cá Sấu khắc chế Cá Kiếm (+18% sát thương)
    colors: { primary: "#52b788", secondary: "#1b4332", accent: "#d8f3dc" },
  },
  diver: {
    name: "Thợ Lặn Công Nghệ",
    skillId: "emp_pulse",
    skillName: "Xung EMP",
    skillCooldown: 8.5,
    baseSpeed: 4.0,
    boostMult: 1.75,
    maxHp: 105,
    maxStamina: 165,
    staminaDrain: 28,
    staminaRegen: 26,
    eatRangeMult: 1.15,
    scoreMult: 1.15,
    favMap: "abyss",
    counters: "turtle", // Thợ Lặn khắc chế Rùa (+18% sát thương)
    colors: { primary: "#ff9f1c", secondary: "#2b2d42", accent: "#00f5d4" },
  },
};

export function getCounterMultiplier(attackerSpecies, targetSpecies) {
  const cfg = SPECIES_CONFIG[attackerSpecies];
  if (cfg && cfg.counters === targetSpecies) return 1.18;
  return 1.0;
}
