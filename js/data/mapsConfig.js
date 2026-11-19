export const WORLD_SIZE = 4500;

export const MAP_CONFIG = {
  coral: {
    name: "Rạn San Hô Ánh Dương",
    worldSize: 4500,
    bgTop: "#0096c7",
    bgMid: "#005f73",
    bgBot: "#001219",
    causticColor: "rgba(144, 224, 239, 0.08)",
    gridColor: "rgba(255, 255, 255, 0.035)",
    enemyCount: 42,
    seed: 101,
  },
  abyss: {
    name: "Vực Thẳm Phát Quang",
    worldSize: 4500,
    bgTop: "#10002b",
    bgMid: "#240046",
    bgBot: "#03000a",
    causticColor: "rgba(199, 125, 255, 0.07)",
    gridColor: "rgba(157, 78, 221, 0.06)",
    enemyCount: 40,
    seed: 202,
  },
  swamp: {
    name: "Rừng Ngập Mặn Huyền Bí",
    worldSize: 4500,
    bgTop: "#2d6a4f",
    bgMid: "#1b4332",
    bgBot: "#081c15",
    causticColor: "rgba(183, 228, 199, 0.07)",
    gridColor: "rgba(116, 198, 157, 0.05)",
    enemyCount: 42,
    seed: 303,
  },
  hybrid: {
    name: "Đại Dương Hỗn Mang",
    worldSize: 6400,
    bgTop: "#023e8a",
    bgMid: "#10002b",
    bgBot: "#081c15",
    causticColor: "rgba(0, 245, 212, 0.08)",
    gridColor: "rgba(254, 228, 64, 0.04)",
    enemyCount: 64,
    seed: 777,
  },
};

export function getWorldSize(mapKey) {
  return MAP_CONFIG[mapKey]?.worldSize || WORLD_SIZE;
}

export function getZoneNameAt(x, y, mapKey) {
  const ws = getWorldSize(mapKey);
  if (mapKey !== "hybrid") {
    const distCenter = Math.hypot(x - ws / 2, y - ws / 2);
    if (distCenter < 650) return "Đền Thờ Trung Tâm";
    return MAP_CONFIG[mapKey]?.name || "Đại Dương";
  }
  const distCenter = Math.hypot(x - ws / 2, y - ws / 2);
  if (distCenter < 750) return "⛩️ Đền Thờ Hỗn Mang";
  if (y < ws * 0.45 && x < ws * 0.5) return "🪸 Vùng San Hô";
  if (y < ws * 0.45 && x >= ws * 0.5) return "🌿 Vùng Đầm Lầy";
  return "🔮 Vùng Vực Thẳm";
}
