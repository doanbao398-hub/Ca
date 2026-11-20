import {
  ref,
  get,
  set,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db } from "../network/FirebaseClient.js";
import { eventBus } from "./EventBus.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";

const DEFAULT_SAVE = {
  gems: 150,
  highScore: 0,
  bossKills: 0,
  pvpKills: 0,
  upgrades: {
    startSize: 0,
    maxHpBonus: 0,
    gemMagnet: 0,
  },
  unlockedEpics: {
    space: false,
    time: false,
  },
  rebirthCount: {
    space: 0,
    time: 0,
  },
  speciesProgress: {},
};

class StorageManager {
  constructor() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    this.currentUser = null;

    eventBus.on("AUTH_STATE_CHANGED", async (user) => {
      this.currentUser = user;
      if (user) {
        await this.syncFromCloud(user);
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        eventBus.emit("SAVE_UPDATED", this.data);
      }
    });

    this.listenGlobalLeaderboard();
  }

  listenGlobalLeaderboard() {
    const lbQuery = query(
      ref(db, "ocean_odyssey/leaderboard"),
      orderByChild("highScore"),
      limitToLast(6),
    );
    onValue(
      lbQuery,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.values(val).sort(
          (a, b) => (b.highScore || 0) - (a.highScore || 0),
        );
        eventBus.emit("GLOBAL_LB_UPDATED", list);
      },
      () => {},
    );
  }

  async syncFromCloud(user) {
    try {
      const userSaveRef = ref(db, `ocean_odyssey/users/${user.uid}/saveData`);
      const snap = await get(userSaveRef);

      if (snap.exists()) {
        const cloudData = snap.val();
        this.data = {
          ...DEFAULT_SAVE,
          ...cloudData,
          upgrades: {
            ...DEFAULT_SAVE.upgrades,
            ...(cloudData.upgrades || {}),
          },
          unlockedEpics: {
            ...DEFAULT_SAVE.unlockedEpics,
            ...(cloudData.unlockedEpics || {}),
          },
          rebirthCount: {
            ...DEFAULT_SAVE.rebirthCount,
            ...(cloudData.rebirthCount || {}),
          },
          speciesProgress: cloudData.speciesProgress || {},
        };
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        await set(userSaveRef, this.data);
      }
      eventBus.emit("SAVE_UPDATED", this.data);
      this.updateGlobalLeaderboardEntry(user);
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu tài khoản:", err);
    }
  }

  save() {
    eventBus.emit("SAVE_UPDATED", this.data);

    if (this.currentUser) {
      const userSaveRef = ref(
        db,
        `ocean_odyssey/users/${this.currentUser.uid}/saveData`,
      );
      set(userSaveRef, this.data).catch((err) =>
        console.error("Lỗi lưu Cloud:", err),
      );
      this.updateGlobalLeaderboardEntry(this.currentUser);
    }
  }

  isEpicUnlocked(speciesKey) {
    if (speciesKey === "space") return !!this.data?.unlockedEpics?.space;
    if (speciesKey === "time") return !!this.data?.unlockedEpics?.time;
    return true;
  }

  getFishLevel() {
    return this.data?.speciesProgress?.fish?.level || 1;
  }

  canRebirthUnlockEpic(speciesKey) {
    const fishLevel = this.getFishLevel();
    if (speciesKey === "space") {
      return !this.isEpicUnlocked("space") && fishLevel >= 50;
    }
    if (speciesKey === "time") {
      return (
        !this.isEpicUnlocked("time") &&
        this.isEpicUnlocked("space") &&
        fishLevel >= 75
      );
    }
    return false;
  }

  rebirthUnlockEpic(speciesKey) {
    if (!this.canRebirthUnlockEpic(speciesKey)) {
      return { ok: false, reason: "NOT_ELIGIBLE" };
    }

    if (!this.data.unlockedEpics) {
      this.data.unlockedEpics = { space: false, time: false };
    }
    if (!this.data.rebirthCount) {
      this.data.rebirthCount = { space: 0, time: 0 };
    }

    // Trùng sinh: Reset toàn bộ chỉ số đã cày của Cá Kiếm Hoàng Kim về cấp 1
    if (this.data.speciesProgress && this.data.speciesProgress.fish) {
      delete this.data.speciesProgress.fish;
    }

    this.data.unlockedEpics[speciesKey] = true;
    this.data.rebirthCount[speciesKey] =
      (this.data.rebirthCount[speciesKey] || 0) + 1;

    this.save();
    return { ok: true };
  }

  saveSpeciesRun(player, quests) {
    if (!player || !player.species) return;
    if (!this.data.speciesProgress) this.data.speciesProgress = {};

    const maxStage = EVOLUTION_FORMS.length;
    this.data.speciesProgress[player.species] = {
      score: Math.round(player.score),
      level: player.level,
      xp: Math.round(player.xp),
      xpNext: Math.round(player.xpNext),
      baseRadius: Number(player.baseRadius.toFixed(2)),
      evoStage: Math.min(maxStage, Math.max(1, player.evoStage)),
      maxHp: Math.round(player.maxHp),
      hp: Math.max(10, Math.ceil(player.hp)),
      speedBonus: Number(player.speedBonus.toFixed(3)),
      cdrMult: Number(player.cdrMult.toFixed(3)),
      magnetRadius: Math.round(player.magnetRadius),
      bitePower: Number(player.bitePower.toFixed(2)),
      lifeSteal: Math.round(player.lifeSteal),
      bounty: player.bounty || 0,
      superAugments: [...(player.superAugments || [])],
      commonAugments: [...(player.commonAugments || [])],
      inventory: [...(player.inventory || [null, null, null])],
      quests: Array.isArray(quests)
        ? quests.map((q) => ({
            id: q.id,
            current: q.current,
            done: !!q.done,
          }))
        : [],
      updatedAt: Date.now(),
    };

    if (player.score > this.data.highScore) {
      this.data.highScore = Math.round(player.score);
    }

    this.save();
  }

  getSpeciesRun(speciesKey) {
    return this.data?.speciesProgress?.[speciesKey] || null;
  }

  clearSpeciesRun(speciesKey) {
    if (this.data?.speciesProgress?.[speciesKey]) {
      delete this.data.speciesProgress[speciesKey];
      this.save();
    }
  }

  updateGlobalLeaderboardEntry(user) {
    if (!user) return;
    const displayName =
      user.displayName || (user.email ? user.email.split("@")[0] : "Thủy Quái");
    const lbRef = ref(db, `ocean_odyssey/leaderboard/${user.uid}`);
    set(lbRef, {
      name: String(displayName).slice(0, 16),
      highScore: this.data.highScore || 0,
      pvpKills: this.data.pvpKills || 0,
    }).catch(() => {});
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
