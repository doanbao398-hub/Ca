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
      limitToLast(5),
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
