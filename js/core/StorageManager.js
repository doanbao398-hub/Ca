import { eventBus } from "./EventBus.js";

const STORAGE_KEY = "ocean_odyssey_save";

const DEFAULT_SAVE = {
  gems: 150,
  highScore: 0,
  bossKills: 0,
  upgrades: {
    startSize: 0,
    maxHpBonus: 0,
    gemMagnet: 0,
  },
};

class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        upgrades: {
          ...DEFAULT_SAVE.upgrades,
          ...(parsed.upgrades || {}),
        },
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    eventBus.emit("SAVE_UPDATED", this.data);
  }

  buyUpgrade(key, baseCost, maxLevel = 5) {
    const lvl = this.data.upgrades[key] || 0;
    if (lvl >= maxLevel) return { ok: false, reason: "MAX" };
    const cost = baseCost * (lvl + 1);
    if (this.data.gems < cost) return { ok: false, reason: "NO_GEMS" };

    this.data.gems -= cost;
    this.data.upgrades[key] = lvl + 1;
    this.save();
    return { ok: true };
  }
}

export const storage = new StorageManager();
