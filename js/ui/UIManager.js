import { WORLD_SIZE } from "../data/mapsConfig.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";
import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import { META_SHOP_ITEMS, ROGUELIKE_CARDS } from "../data/upgradesData.js";
import { storage } from "../core/StorageManager.js";
import { sound } from "../core/SoundSystem.js";
import { eventBus } from "../core/EventBus.js";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
} from "../network/FirebaseClient.js";

export class UIManager {
  constructor() {
    this.isRegisterMode = false;
    this.dom = {
      authScreen: document.getElementById("auth-screen"),
      tabLogin: document.getElementById("tab-login"),
      tabRegister: document.getElementById("tab-register"),
      registerNameWrap: document.getElementById("register-name-wrap"),
      authDisplayName: document.getElementById("auth-display-name"),
      authEmail: document.getElementById("auth-email"),
      authPassword: document.getElementById("auth-password"),
      authErrorMsg: document.getElementById("auth-error-msg"),
      authForm: document.getElementById("auth-form"),
      btnAuthSubmit: document.getElementById("btn-auth-submit"),
      btnGoogleLogin: document.getElementById("btn-google-login"),
      btnLogout: document.getElementById("btn-logout"),
      userAccountBadge: document.getElementById("user-account-badge"),
      globalLeaderboardList: document.getElementById("global-leaderboard-list"),

      metaGems: document.getElementById("meta-gems"),
      metaHighscore: document.getElementById("meta-highscore"),
      metaBosskills: document.getElementById("meta-bosskills"),
      metaShopGrid: document.getElementById("meta-shop-grid"),
      firebaseBadge: document.getElementById("firebase-status-badge"),
      hudOnlineCount: document.getElementById("hud-online-count"),
      hudSpecies: document.getElementById("hud-species"),
      hudSkillName: document.getElementById("hud-skill-name"),
      hudEvoStage: document.getElementById("hud-evo-stage"),
      hudRoomTag: document.getElementById("hud-room-tag"),
      evoCounter: document.getElementById("evo-counter"),
      hudScore: document.getElementById("hud-score"),
      hudLevel: document.getElementById("hud-level"),
      growthBar: document.getElementById("growth-bar"),
      hpBar: document.getElementById("hp-bar"),
      hudHpText: document.getElementById("hud-hp-text"),
      staminaBar: document.getElementById("stamina-bar"),
      staminaLabel: document.getElementById("stamina-label"),
      mobileBoostBtn: document.getElementById("mobile-boost-btn"),
      hudZone: document.getElementById("hud-zone"),
      hudTime: document.getElementById("hud-time"),
      skillBox: document.getElementById("skill-box"),
      hudSkillStatus: document.getElementById("hud-skill-status"),
      ultBox: document.getElementById("ult-box"),
      hudUltStatus: document.getElementById("hud-ult-status"),
      questList: document.getElementById("quest-list"),
      leaderboardList: document.getElementById("leaderboard-list"),
      eventBanner: document.getElementById("event-banner"),
      lobbyScreen: document.getElementById("lobby-screen"),
      gameoverScreen: document.getElementById("gameover-screen"),
      pauseScreen: document.getElementById("pause-screen"),
      upgradeScreen: document.getElementById("upgrade-screen"),
      upgradeCardsContainer: document.getElementById("upgrade-cards-container"),
      gameoverTitleBadge: document.getElementById("gameover-title-badge"),
      gameoverStats: document.getElementById("gameover-stats"),
    };

    this.bannerTimeout = null;
    this.bindAuthUI();
    this.bindEvents();
    this.updateLobbyMetaUI();
  }

  bindAuthUI() {
    this.dom.tabLogin.addEventListener("click", () => {
      this.isRegisterMode = false;
      this.dom.tabLogin.classList.add("active");
      this.dom.tabRegister.classList.remove("active");
      this.dom.registerNameWrap.classList.add("hidden");
      this.dom.btnAuthSubmit.innerText = "ĐĂNG NHẬP VÀO GAME";
      this.dom.authErrorMsg.innerText = "";
    });

    this.dom.tabRegister.addEventListener("click", () => {
      this.isRegisterMode = true;
      this.dom.tabRegister.classList.add("active");
      this.dom.tabLogin.classList.remove("active");
      this.dom.registerNameWrap.classList.remove("hidden");
      this.dom.btnAuthSubmit.innerText = "TẠO TÀI KHOẢN & CHƠI";
      this.dom.authErrorMsg.innerText = "";
    });

    this.dom.authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = this.dom.authEmail.value.trim();
      const pass = this.dom.authPassword.value;
      const displayName = this.dom.authDisplayName.value.trim();

      this.dom.authErrorMsg.innerText = "";
      this.dom.btnAuthSubmit.disabled = true;
      this.dom.btnAuthSubmit.innerText = "⏳ Đang xử lý...";

      try {
        if (this.isRegisterMode) {
          await registerWithEmail(email, pass, displayName);
        } else {
          await loginWithEmail(email, pass);
        }
      } catch (err) {
        this.dom.authErrorMsg.innerText = this.formatAuthError(err.code);
      } finally {
        this.dom.btnAuthSubmit.disabled = false;
        this.dom.btnAuthSubmit.innerText = this.isRegisterMode
          ? "TẠO TÀI KHOẢN & CHƠI"
          : "ĐĂNG NHẬP VÀO GAME";
      }
    });

    this.dom.btnGoogleLogin.addEventListener("click", async () => {
      this.dom.authErrorMsg.innerText = "";
      try {
        await loginWithGoogle();
      } catch (err) {
        this.dom.authErrorMsg.innerText = this.formatAuthError(err.code);
      }
    });

    this.dom.btnLogout.addEventListener("click", async () => {
      if (confirm("Bạn muốn đăng xuất khỏi tài khoản hiện tại?")) {
        await logoutUser();
      }
    });
  }

  formatAuthError(code) {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "❌ Email hoặc mật khẩu không chính xác!";
      case "auth/email-already-in-use":
        return "❌ Email này đã được đăng ký tài khoản khác!";
      case "auth/weak-password":
        return "❌ Mật khẩu phải có ít nhất 6 ký tự!";
      case "auth/popup-closed-by-user":
        return "⚠️ Bạn đã đóng cửa sổ đăng nhập Google.";
      default:
        return `❌ Lỗi xác thực (${code || "Không xác định"}).`;
    }
  }

  bindEvents() {
    eventBus.on("AUTH_STATE_CHANGED", (user) => {
      if (user) {
        // Đã đăng nhập -> Ẩn Auth Screen, mở Lobby Screen
        this.dom.authScreen.classList.add("hidden");
        this.dom.lobbyScreen.classList.remove("hidden");

        const accName =
          user.displayName ||
          (user.email ? user.email.split("@")[0] : "Thủy Quái");
        this.dom.userAccountBadge.innerText = `👤 ${accName}`;

        const nameInput = document.getElementById("player-name-input");
        if (nameInput && nameInput.value === "Thủy Quái Chúa") {
          nameInput.value = accName.slice(0, 16);
        }
      } else {
        // Chưa đăng nhập -> Bắt buộc hiện Auth Screen, ẩn Lobby
        this.dom.authScreen.classList.remove("hidden");
        this.dom.lobbyScreen.classList.add("hidden");
        this.dom.gameoverScreen.classList.add("hidden");
        this.dom.pauseScreen.classList.add("hidden");
      }
    });

    eventBus.on("SAVE_UPDATED", () => this.updateLobbyMetaUI());

    eventBus.on("GLOBAL_LB_UPDATED", (list) => {
      if (!this.dom.globalLeaderboardList) return;
      if (!list.length) {
        this.dom.globalLeaderboardList.innerHTML =
          '<div style="font-size:11px; color:#90e0ef;">Chưa có kỷ lục nào.</div>';
        return;
      }
      this.dom.globalLeaderboardList.innerHTML = list
        .map(
          (item, i) => `
          <div class="global-lb-row">
            <span style="color:${i === 0 ? "#fee440" : "#fff"}; font-weight:700;">
              ${i === 0 ? "👑" : `#${i + 1}`} ${item.name}
            </span>
            <span style="color:#00f5d4; font-weight:800;">${item.highScore} XP</span>
          </div>
        `,
        )
        .join("");
    });

    eventBus.on("FIREBASE_CONNECTION_CHANGED", (isConnected) => {
      if (!this.dom.firebaseBadge) return;
      if (isConnected) {
        this.dom.firebaseBadge.innerText = "🟢 Máy chủ Online";
        this.dom.firebaseBadge.style.color = "#06d6a0";
      } else {
        this.dom.firebaseBadge.innerText = "🔴 Mất kết nối";
        this.dom.firebaseBadge.style.color = "#ff4d6d";
      }
    });

    eventBus.on("ONLINE_COUNT_UPDATED", (count) => {
      if (this.dom.hudOnlineCount) {
        this.dom.hudOnlineCount.innerText = `${count} Online`;
      }
    });

    eventBus.on("SHOW_BANNER", (text) => this.showEventBanner(text, 5000));

    eventBus.on("PLAYER_EVOLVED", ({ stage, title }) => {
      this.dom.hudEvoStage.innerText = title;
      this.dom.evoCounter.innerText = `${stage}/4`;
    });

    eventBus.on("PLAYER_LEVEL_UP", (level) => {
      this.dom.hudLevel.innerText = `Lv.${level}`;
    });
  }

  updateLobbyMetaUI() {
    const saveData = storage.data;
    this.dom.metaGems.innerText = saveData.gems;
    this.dom.metaHighscore.innerText = saveData.highScore;
    this.dom.metaBosskills.innerText = saveData.bossKills;

    this.dom.metaShopGrid.innerHTML = META_SHOP_ITEMS.map((item) => {
      const lvl = saveData.upgrades[item.key] || 0;
      const cost = item.baseCost * (lvl + 1);
      const isMax = lvl >= item.maxLevel;
      return `
        <button class="shop-btn" data-upgrade-key="${item.key}" data-base-cost="${item.baseCost}">
          <div style="display:flex; justify-content:space-between; font-weight:800; font-size:13px; color:#fee440;">
            <span>${item.name}</span>
            <span>Lv.${lvl}/${item.maxLevel}</span>
          </div>
          <div style="font-size:11px; color:#caf0f8; margin: 4px 0;">${item.desc}</div>
          <div style="font-size:11px; font-weight:800; color:${isMax ? "#00f5d4" : "#ffbe0b"};">
            ${isMax ? "✅ ĐÃ ĐẠT TỐI ĐA" : `Nâng Cấp: 💎 ${cost} Ngọc`}
          </div>
        </button>
      `;
    }).join("");

    this.dom.metaShopGrid.querySelectorAll(".shop-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.upgradeKey;
        const baseCost = Number(btn.dataset.baseCost);
        const res = storage.buyUpgrade(key, baseCost);
        if (res.ok) {
          sound.playEvolution();
        } else if (res.reason === "NO_GEMS") {
          alert(
            "Bạn chưa đủ Ngọc Huyền Bí! Hãy chơi và săn mồi để tích lũy thêm.",
          );
        }
      });
    });
  }

  initMatchHUD(speciesKey, roomId) {
    const spCfg = SPECIES_CONFIG[speciesKey];
    this.dom.hudSpecies.innerText = spCfg.name;
    this.dom.hudSkillName.innerText = spCfg.skillName;
    this.dom.hudEvoStage.innerText = EVOLUTION_FORMS[0].title;
    this.dom.hudRoomTag.innerText = `Phòng: ${roomId}`;
    this.dom.evoCounter.innerText = "1/4";
    this.dom.hudScore.innerText = "0";
    this.dom.hudLevel.innerText = "Lv.1";
    this.dom.growthBar.style.width = "0%";
    this.dom.lobbyScreen.classList.add("hidden");
    this.dom.gameoverScreen.classList.add("hidden");
  }

  updateHUD(player, survivalTime) {
    if (!player) return;

    this.dom.hudScore.innerText = player.score;
    this.dom.growthBar.style.width = `${Math.min(
      100,
      (player.xp / player.xpNext) * 100,
    )}%`;

    this.dom.hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
    this.dom.hudHpText.innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;

    if (this.dom.staminaBar) {
      this.dom.staminaBar.style.width = `${
        (player.stamina / player.maxStamina) * 100
      }%`;
      this.dom.staminaBar.classList.toggle("exhausted", player.isExhausted);
    }
    if (this.dom.staminaLabel) {
      this.dom.staminaLabel.innerText = player.isExhausted
        ? "⚠️ Đang hồi thể lực..."
        : "Giữ Chuột / Space: Bơi Nhanh";
      this.dom.staminaLabel.style.color = player.isExhausted
        ? "#ff4d6d"
        : "#64dfdf";
    }
    if (this.dom.mobileBoostBtn) {
      this.dom.mobileBoostBtn.classList.toggle("exhausted", player.isExhausted);
    }

    if (player.skillCooldownTimer > 0) {
      this.dom.skillBox.classList.add("cooldown");
      this.dom.hudSkillStatus.innerText = `${player.skillCooldownTimer.toFixed(1)}s`;
      this.dom.hudSkillStatus.style.color = "#adb5bd";
    } else {
      this.dom.skillBox.classList.remove("cooldown");
      this.dom.hudSkillStatus.innerText = "Sẵn Sàng [E]";
      this.dom.hudSkillStatus.style.color = "#00f5d4";
    }

    if (player.ultTimer > 0) {
      this.dom.ultBox.classList.remove("cooldown");
      this.dom.ultBox.classList.add("ult-ready");
      this.dom.hudUltStatus.innerText = `${player.ultTimer.toFixed(1)}s`;
      this.dom.hudUltStatus.style.color = "#ff758f";
    } else if (player.rage >= 100) {
      this.dom.ultBox.classList.remove("cooldown");
      this.dom.ultBox.classList.add("ult-ready");
      this.dom.hudUltStatus.innerText = "BẤM [R]!";
      this.dom.hudUltStatus.style.color = "#fee440";
    } else {
      this.dom.ultBox.classList.add("cooldown");
      this.dom.ultBox.classList.remove("ult-ready");
      this.dom.hudUltStatus.innerText = `${Math.floor(player.rage)}%`;
      this.dom.hudUltStatus.style.color = "#adb5bd";
    }

    let zoneName = "Trung Tâm";
    if (player.y > WORLD_SIZE * 0.72) zoneName = "Vực Sâu Nam";
    else if (player.y < WORLD_SIZE * 0.28) zoneName = "Nước Cạn Bắc";
    else if (player.x < WORLD_SIZE * 0.28) zoneName = "Rừng Tảo Tây";
    else if (player.x > WORLD_SIZE * 0.72) zoneName = "Hẻm Núi Đông";
    this.dom.hudZone.innerText = zoneName;

    const mins = String(Math.floor(survivalTime / 60)).padStart(2, "0");
    const secs = String(Math.floor(survivalTime % 60)).padStart(2, "0");
    this.dom.hudTime.innerText = `${mins}:${secs}`;
  }

  renderQuests(quests) {
    this.dom.questList.innerHTML = quests
      .map((q) => {
        const pct = Math.min(100, (q.current / q.target) * 100);
        return `
        <div class="quest-item ${q.done ? "done" : ""}">
          <div style="display:flex; justify-content:space-between; font-weight:600;">
            <span>${q.done ? "✅" : "🧬"} ${q.title}</span>
            <span>${q.current}/${q.target}</span>
          </div>
          <div class="quest-reward-tag">Thưởng: ${q.rewardText}</div>
          <div class="quest-progress-bg"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        </div>
      `;
      })
      .join("");
  }

  updateLeaderboard(player, remotePlayers, boss, survivalTime) {
    if (!player) return;
    const entries = [
      {
        name: `${player.name} (Bạn)`,
        score: player.score,
        type: "me",
      },
    ];

    Object.values(remotePlayers).forEach((rp) => {
      if (!rp) return;
      entries.push({
        name: `🌐 ${rp.name}`,
        score: rp.score || 0,
        type: "real-player",
      });
    });

    if (entries.length < 4) {
      entries.push({
        name: "👑 Leviathan",
        score: boss ? 4500 : 2800,
        type: "bot",
      });
      entries.push({
        name: "🦈 Megalodon AI",
        score: 1450 + Math.floor(survivalTime * 6),
        type: "bot",
      });
    }

    entries.sort((a, b) => b.score - a.score);

    this.dom.leaderboardList.innerHTML = entries
      .slice(0, 4)
      .map(
        (item, idx) => `
      <div class="lb-row ${item.type}">
        <span>#${idx + 1} ${item.name}</span>
        <span>${item.score}</span>
      </div>
    `,
      )
      .join("");
  }

  openUpgradeModal(player, particleSystem, onSelected) {
    const shuffled = [...ROGUELIKE_CARDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    this.dom.upgradeCardsContainer.innerHTML = shuffled
      .map(
        (card) => `
      <div class="upgrade-card" data-card-id="${card.id}">
        <div style="font-size: 34px; margin-bottom: 6px;">${card.icon}</div>
        <div style="font-size: 15px; font-weight: 800; color: #fee440; margin-bottom: 4px;">${card.title}</div>
        <div style="font-size: 12px; color: #caf0f8; line-height: 1.35;">${card.desc}</div>
      </div>
    `,
      )
      .join("");

    this.dom.upgradeCardsContainer
      .querySelectorAll(".upgrade-card")
      .forEach((el) => {
        el.addEventListener("click", () => {
          const card = ROGUELIKE_CARDS.find((c) => c.id === el.dataset.cardId);
          if (card && player) {
            card.apply(player);
            sound.playEvolution();
            particleSystem.addFloatingText(
              player.x,
              player.y - player.radius - 25,
              `✨ ${card.title.toUpperCase()}!`,
              "#fee440",
            );
          }
          this.dom.upgradeScreen.classList.add("hidden");
          onSelected();
        });
      });

    this.dom.upgradeScreen.classList.remove("hidden");
  }

  showEventBanner(text, durationMs = 4000) {
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.dom.eventBanner.innerText = text;
    this.dom.eventBanner.style.display = "block";
    this.bannerTimeout = setTimeout(() => {
      this.dom.eventBanner.style.display = "none";
    }, durationMs);
  }

  showGameOver(player, killerName, fishEatenCount, survivalTime, earnedGems) {
    let playTitle = "Thợ Săn Tập Sự";
    if (player.evoStage === 4) playTitle = "👑 CHÚA TỂ ĐẠI DƯƠNG";
    else if (fishEatenCount >= 35) playTitle = "🦈 ÁC MỘNG ĐÁY SÂU";
    else if (survivalTime >= 180) playTitle = "🐢 BẬC THẦY SINH TỒN";

    const evoTitle = EVOLUTION_FORMS[player.evoStage - 1].title;
    this.dom.gameoverTitleBadge.innerText = `Danh hiệu: ${playTitle}`;
    this.dom.gameoverStats.innerHTML = `
      ${killerName ? `Bị hạ gục bởi: <b style="color:#ff4d6d;">${killerName}</b><br>` : ""}
      Sinh vật: <b>${player.name}</b> (${player.cfg.name})<br>
      Tiến hóa: <b style="color:#fee440;">${evoTitle}</b><br>
      Điểm: <b>${player.score} XP</b> • Cấp: <b>Lv.${player.level}</b><br>
      Phần thưởng: <b style="color:#00f5d4;">+${earnedGems} 💎 Ngọc</b>
    `;
    this.dom.gameoverScreen.classList.remove("hidden");
  }
}
