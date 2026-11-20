import { eventBus } from "../core/EventBus.js";
import { storage } from "../core/StorageManager.js";
import { sound } from "../core/SoundSystem.js";
import { settings } from "../core/SettingsManager.js";
import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";
import { META_SHOP_ITEMS } from "../data/upgradesData.js";
import { TACTICAL_ITEMS } from "../data/itemsData.js";
import {
  BOSS_SKILL_CORES,
  ALL_BOSS_SKILL_IDS,
  getKeyLabel,
} from "../data/bossSkillsData.js";
import {
  COMMON_AUGMENTS,
  SUPER_AUGMENTS,
  MAX_SUPER_AUGMENTS,
  SYNERGY_TIERS,
} from "../data/augmentsData.js";
import {
  SPECIES_EVOLUTION_PASSIVES,
  getUnlockedPassives,
} from "../data/speciesPassivesData.js";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  myPlayerId,
} from "../network/FirebaseClient.js";

export class UIManager {
  constructor() {
    this.dom = {
      authScreen: document.getElementById("auth-screen"),
      lobbyScreen: document.getElementById("lobby-screen"),
      upgradeScreen: document.getElementById("upgrade-screen"),
      pauseScreen: document.getElementById("pause-screen"),
      gameoverScreen: document.getElementById("gameover-screen"),
      settingsScreen: document.getElementById("settings-screen"),
      rebirthModal: document.getElementById("rebirth-epic-modal"),
    };

    this.isRegisterMode = false;
    this.unreadChatCount = 0;
    this.currentSettingsTab = "general";
    this.pendingRebirthSpecies = null;

    this.listeningKeybindId = null;
    this.keybindErrorMsg = "";
    this.lastBossSkillsSignature = "";

    this.augmentQueue = [];
    this.isAugmentChoosing = false;
    this.currentAugmentType = null;
    this.currentAugmentPlayer = null;
    this.currentBossCoreData = null;
    this.superRerollLeft = 0;
    this.onAllAugmentsDone = null;

    this.bindAuthEvents();
    this.bindChatAndMobileEvents();
    this.bindHudPanelToggles();
    this.bindSettingsEvents();
    this.bindRebirthModalEvents();
    this.bindBusEvents();
    this.renderMetaShop();
  }

  bindRebirthModalEvents() {
    const closeRebirth = () => {
      this.pendingRebirthSpecies = null;
      this.dom.rebirthModal?.classList.add("hidden");
    };

    document
      .getElementById("btn-cancel-rebirth")
      ?.addEventListener("click", closeRebirth);

    document
      .getElementById("btn-confirm-rebirth")
      ?.addEventListener("click", () => {
        if (!this.pendingRebirthSpecies) return;
        const target = this.pendingRebirthSpecies;
        const res = storage.rebirthUnlockEpic(target);
        if (res.ok) {
          sound.playEvolution();
          closeRebirth();
          this.refreshEpicCardsState();
          this.renderSavedSpeciesBadges();
          eventBus.emit("EPIC_UNLOCKED", target);
        } else {
          alert("❌ Chưa đủ điều kiện Trùng Sinh để mở khóa!");
        }
      });
  }

  openRebirthModal(speciesKey) {
    const fishLvl = storage.getFishLevel();
    const spaceUnlocked = storage.isEpicUnlocked("space");
    const timeUnlocked = storage.isEpicUnlocked("time");

    if (speciesKey === "space") {
      if (spaceUnlocked) return true;
      if (fishLvl < 50) {
        alert(
          `🔒 KHÓA SỬ THI: CÁ KHÔNG GIAN\n\nĐiều kiện mở khóa:\n• Cá Kiếm Hoàng Kim đạt Cấp 50 (Hiện tại: Lv.${fishLvl}/50)\n• Xác nhận TRÙNG SINH (Reset toàn bộ chỉ số đã cày của Cá Kiếm về Lv.1).`,
        );
        return false;
      }
      this.pendingRebirthSpecies = "space";
      const titleEl = document.getElementById("rebirth-modal-title");
      const descEl = document.getElementById("rebirth-modal-desc");
      if (titleEl) titleEl.textContent = "🌌 TRÙNG SINH MỞ KHÓA: CÁ KHÔNG GIAN";
      if (descEl) {
        descEl.innerHTML = `
          Cá Kiếm Hoàng Kim của bạn đã đạt <b>Cấp ${fishLvl}</b> (đủ điều kiện Lv.50)!<br/><br/>
          ⚠️ <b>LƯU Ý QUAN TRỌNG:</b> Khi xác nhận Trùng Sinh, <b>toàn bộ cấp độ, điểm XP, dạng tiến hóa và lõi đã cày của Cá Kiếm Hoàng Kim sẽ được Reset về Cấp 1</b> để giải phong ấn <b>Cá Không Gian [SỬ THI]</b> vĩnh viễn!
        `;
      }
      this.dom.rebirthModal?.classList.remove("hidden");
      return false;
    }

    if (speciesKey === "time") {
      if (timeUnlocked) return true;
      if (!spaceUnlocked || fishLvl < 75) {
        alert(
          `🔒 KHÓA SỬ THI: CÁ THỜI GIAN\n\nĐiều kiện mở khóa bắt buộc:\n1. Đã mở khóa Cá Không Gian: ${spaceUnlocked ? "✅ Đã mở" : "❌ Chưa mở"}\n2. Cá Kiếm Hoàng Kim đạt Cấp 75 (Hiện tại: Lv.${fishLvl}/75)\n3. Xác nhận TRÙNG SINH (Reset toàn bộ chỉ số đã cày của Cá Kiếm về Lv.1).`,
        );
        return false;
      }
      this.pendingRebirthSpecies = "time";
      const titleEl = document.getElementById("rebirth-modal-title");
      const descEl = document.getElementById("rebirth-modal-desc");
      if (titleEl) titleEl.textContent = "⏳ TRÙNG SINH MỞ KHÓA: CÁ THỜI GIAN";
      if (descEl) {
        descEl.innerHTML = `
          Bạn đã sở hữu <b>Cá Không Gian</b> và Cá Kiếm Hoàng Kim đạt <b>Cấp ${fishLvl}</b> (đủ điều kiện Lv.75)!<br/><br/>
          ⚠️ <b>LƯU Ý QUAN TRỌNG:</b> Khi xác nhận Trùng Sinh, <b>toàn bộ cấp độ, điểm XP, dạng tiến hóa và lõi đã cày của Cá Kiếm Hoàng Kim sẽ được Reset về Cấp 1</b> để giải phong ấn <b>Cá Thời Gian [SỬ THI]</b> vĩnh viễn!
        `;
      }
      this.dom.rebirthModal?.classList.remove("hidden");
      return false;
    }

    return true;
  }

  refreshEpicCardsState() {
    const fishLvl = storage.getFishLevel();
    const spaceUnlocked = storage.isEpicUnlocked("space");
    const timeUnlocked = storage.isEpicUnlocked("time");

    const spaceCard = document.getElementById("epic-card-space");
    const spaceLockEl = document.getElementById("lock-status-space");
    if (spaceCard && spaceLockEl) {
      if (spaceUnlocked) {
        spaceCard.classList.remove("locked-epic");
        spaceLockEl.textContent = "✅ ĐÃ MỞ KHÓA VĨNH VIỄN";
        spaceLockEl.style.color = "#06d6a0";
      } else {
        spaceCard.classList.add("locked-epic");
        if (fishLvl >= 50) {
          spaceLockEl.textContent = `✨ ĐỦ ĐIỀU KIỆN! BẤM ĐỂ TRÙNG SINH (Cá Kiếm Lv.${fishLvl}/50)`;
          spaceLockEl.style.color = "#fee440";
        } else {
          spaceLockEl.textContent = `🔒 Cần Cá Kiếm Lv.50 + Trùng Sinh (Hiện tại: Lv.${fishLvl}/50)`;
          spaceLockEl.style.color = "#ff758f";
        }
      }
    }

    const timeCard = document.getElementById("epic-card-time");
    const timeLockEl = document.getElementById("lock-status-time");
    if (timeCard && timeLockEl) {
      if (timeUnlocked) {
        timeCard.classList.remove("locked-epic");
        timeLockEl.textContent = "✅ ĐÃ MỞ KHÓA VĨNH VIỄN";
        timeLockEl.style.color = "#06d6a0";
      } else {
        timeCard.classList.add("locked-epic");
        if (spaceUnlocked && fishLvl >= 75) {
          timeLockEl.textContent = `✨ ĐỦ ĐIỀU KIỆN! BẤM ĐỂ TRÙNG SINH (Cá Kiếm Lv.${fishLvl}/75)`;
          timeLockEl.style.color = "#fee440";
        } else {
          const spaceTxt = spaceUnlocked
            ? "Đã có Cá Không Gian"
            : "Cần Cá Không Gian";
          timeLockEl.textContent = `🔒 ${spaceTxt} & Cá Kiếm Lv.75 (Lv.${fishLvl}/75)`;
          timeLockEl.style.color = "#ff758f";
        }
      }
    }
  }

  bindHudPanelToggles() {
    const lbPanel = document.getElementById("leaderboard-panel");
    const questPanel = document.getElementById("quest-panel");
    const btnLb = document.getElementById("btn-toggle-lb");
    const btnQuest = document.getElementById("btn-toggle-quest");

    btnLb?.addEventListener("click", () => {
      const isHidden = lbPanel?.classList.toggle("collapsed-panel");
      btnLb.classList.toggle("active-pill", !isHidden);
    });
    document.getElementById("btn-close-lb")?.addEventListener("click", () => {
      lbPanel?.classList.add("collapsed-panel");
      btnLb?.classList.remove("active-pill");
    });

    btnQuest?.addEventListener("click", () => {
      const isHidden = questPanel?.classList.toggle("collapsed-panel");
      btnQuest.classList.toggle("active-pill", !isHidden);
    });
    document
      .getElementById("btn-close-quest")
      ?.addEventListener("click", () => {
        questPanel?.classList.add("collapsed-panel");
        btnQuest?.classList.remove("active-pill");
      });

    document.querySelectorAll("#quick-bag-bar .bag-slot").forEach((slotEl) => {
      slotEl.addEventListener("click", () => {
        const idx = Number(slotEl.dataset.slot);
        eventBus.emit("USE_BAG_SLOT", idx);
      });
    });
  }

  bindAuthEvents() {
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const nameWrap = document.getElementById("register-name-wrap");
    const submitBtn = document.getElementById("btn-auth-submit");
    const errorEl = document.getElementById("auth-error-msg");

    tabLogin?.addEventListener("click", () => {
      this.isRegisterMode = false;
      tabLogin.classList.add("active");
      tabRegister?.classList.remove("active");
      nameWrap?.classList.add("hidden");
      if (submitBtn) submitBtn.textContent = "ĐĂNG NHẬP VÀO GAME";
      if (errorEl) errorEl.textContent = "";
    });

    tabRegister?.addEventListener("click", () => {
      this.isRegisterMode = true;
      tabRegister.classList.add("active");
      tabLogin?.classList.remove("active");
      nameWrap?.classList.remove("hidden");
      if (submitBtn) submitBtn.textContent = "TẠO TÀI KHOẢN MỚI";
      if (errorEl) errorEl.textContent = "";
    });

    document
      .getElementById("auth-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";
        const email = document.getElementById("auth-email").value.trim();
        const pass = document.getElementById("auth-password").value;
        const dispName = document
          .getElementById("auth-display-name")
          .value.trim();

        try {
          if (this.isRegisterMode) {
            await registerWithEmail(email, pass, dispName);
          } else {
            await loginWithEmail(email, pass);
          }
        } catch (err) {
          if (errorEl)
            errorEl.textContent = "❌ " + (err.message || "Lỗi xác thực!");
        }
      });

    document
      .getElementById("btn-google-login")
      ?.addEventListener("click", async () => {
        if (errorEl) errorEl.textContent = "";
        try {
          await loginWithGoogle();
        } catch (err) {
          if (errorEl)
            errorEl.textContent =
              "❌ " + (err.message || "Không thể đăng nhập Google!");
        }
      });

    document.getElementById("btn-logout")?.addEventListener("click", () => {
      logoutUser().catch(() => {});
    });
  }

  bindChatAndMobileEvents() {
    document
      .getElementById("btn-dismiss-rotate")
      ?.addEventListener("click", () => {
        document
          .getElementById("rotate-device-overlay")
          ?.setAttribute("data-dismissed", "true");
      });

    const chatBox = document.getElementById("chat-box");
    const toggleBtn = document.getElementById("btn-toggle-chat");
    const badge = document.getElementById("chat-unread-badge");

    const openChat = () => {
      chatBox?.classList.remove("collapsed");
      this.unreadChatCount = 0;
      badge?.classList.add("hidden");
      toggleBtn?.classList.remove("has-unread");
      document.getElementById("chat-input")?.focus();
    };

    toggleBtn?.addEventListener("click", () => {
      if (chatBox?.classList.contains("collapsed")) openChat();
      else chatBox?.classList.add("collapsed");
    });

    document
      .getElementById("btn-close-chat")
      ?.addEventListener("click", () => chatBox?.classList.add("collapsed"));

    document.getElementById("chat-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = document.getElementById("chat-input");
      const txt = inp?.value.trim();
      if (txt) {
        eventBus.emit("SEND_CHAT_MESSAGE", txt);
        inp.value = "";
      }
      inp?.blur();
    });

    document
      .getElementById("btn-reroll-augment")
      ?.addEventListener("click", () => {
        if (this.currentAugmentType === "super" && this.superRerollLeft > 0) {
          this.superRerollLeft--;
          sound.playSkill();
          this.renderCurrentAugmentChoices();
        }
      });
  }

  stopKeybindCapture() {
    this.listeningKeybindId = null;
    eventBus.emit("KEYBIND_CAPTURE_STATE", false);
  }

  bindSettingsEvents() {
    const openBtns = [
      "btn-settings",
      "btn-lobby-settings",
      "btn-pause-settings",
    ];
    openBtns.forEach((id) => {
      document
        .getElementById(id)
        ?.addEventListener("click", () => this.openSettingsModal());
    });

    const closeModal = () => {
      this.stopKeybindCapture();
      this.keybindErrorMsg = "";
      this.dom.settingsScreen?.classList.add("hidden");
    };
    document
      .getElementById("btn-close-settings")
      ?.addEventListener("click", closeModal);
    document
      .getElementById("btn-save-close-settings")
      ?.addEventListener("click", closeModal);

    document
      .getElementById("btn-reset-settings")
      ?.addEventListener("click", () => {
        this.stopKeybindCapture();
        this.keybindErrorMsg = "";
        settings.reset();
        this.renderSettingsModal();
      });

    document
      .getElementById("btn-reset-keybinds")
      ?.addEventListener("click", () => {
        this.stopKeybindCapture();
        this.keybindErrorMsg = "";
        settings.resetKeybinds();
        this.renderKeybindsTab();
      });

    document.querySelectorAll(".settings-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.stopKeybindCapture();
        this.keybindErrorMsg = "";
        this.currentSettingsTab = btn.dataset.tab;
        this.renderSettingsModal();
      });
    });

    window.addEventListener("keydown", (e) => {
      if (!this.listeningKeybindId) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.code === "Escape") {
        this.stopKeybindCapture();
        this.renderKeybindsTab();
        return;
      }

      const res = settings.setSkillKeybind(this.listeningKeybindId, e.code);
      if (res.ok) {
        this.keybindErrorMsg = "";
        this.stopKeybindCapture();
        this.lastBossSkillsSignature = "";
      } else {
        this.keybindErrorMsg = res.msg;
        this.stopKeybindCapture();
      }
      this.renderKeybindsTab();
    });

    document
      .getElementById("set-sfx-volume")
      ?.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        settings.set("sfxVolume", val);
        const lbl = document.getElementById("set-sfx-val");
        if (lbl) lbl.textContent = `${Math.round(val * 100)}%`;
      });

    document.getElementById("set-sfx-mute")?.addEventListener("change", (e) => {
      settings.set("muted", e.target.checked);
      const muteBtn = document.getElementById("btn-mute");
      if (muteBtn) muteBtn.innerText = e.target.checked ? "🔇" : "🔊";
    });

    document
      .getElementById("set-particle-quality")
      ?.addEventListener("change", (e) => {
        settings.set("particleQuality", e.target.value);
      });

    document
      .getElementById("set-screen-shake")
      ?.addEventListener("change", (e) => {
        settings.set("screenShake", e.target.checked);
      });

    document
      .getElementById("set-floating-text")
      ?.addEventListener("change", (e) => {
        settings.set("showFloatingText", e.target.checked);
      });

    document
      .getElementById("set-mouse-sens")
      ?.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        settings.set("mouseSensitivity", val);
        const lbl = document.getElementById("set-sens-val");
        if (lbl) lbl.textContent = `${val.toFixed(1)}x`;
      });

    document
      .querySelectorAll('input[name="mobile-ctrl-mode"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (e.target.checked)
            settings.set("mobileControlMode", e.target.value);
        });
      });

    document
      .getElementById("set-mobile-btn-scale")
      ?.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        settings.set("mobileButtonScale", val);
        const lbl = document.getElementById("set-btn-scale-val");
        if (lbl) lbl.textContent = `${Math.round(val * 100)}%`;
      });

    document
      .getElementById("set-hud-opacity")
      ?.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        settings.set("hudOpacity", val);
        const lbl = document.getElementById("set-hud-opacity-val");
        if (lbl) lbl.textContent = `${Math.round(val * 100)}%`;
      });
  }

  openSettingsModal() {
    this.stopKeybindCapture();
    this.keybindErrorMsg = "";
    this.renderSettingsModal();
    this.dom.settingsScreen?.classList.remove("hidden");
  }

  renderKeybindsTab() {
    const listEl = document.getElementById("keybind-list");
    const errEl = document.getElementById("keybind-error-msg");
    if (errEl) errEl.textContent = this.keybindErrorMsg || "";
    if (!listEl) return;

    const lockedNativeHtml = `
      <div class="keybind-row locked-key">
        <span>🔒 <b>Skill Gốc Loài [E / Q / R]</b> (Được bảo vệ, không thể ghi đè)</span>
        <span style="color:#fee440;font-weight:900;">E / Q / R</span>
      </div>
    `;

    const bossRowsHtml = ALL_BOSS_SKILL_IDS.map((id) => {
      const cfg = BOSS_SKILL_CORES[id];
      const isListening = this.listeningKeybindId === id;
      const keyTxt = isListening
        ? "Nhấn phím..."
        : getKeyLabel(settings.getKeybind(id));
      return `
        <div class="keybind-row">
          <span>${cfg.icon} <b>${cfg.name}</b> <small style="color:#90e0ef;">(${cfg.bossType === "space" ? "Boss KG" : "Boss TG"})</small></span>
          <button type="button" class="keybind-btn ${isListening ? "listening" : ""}" data-skill-id="${id}">
            ${keyTxt}
          </button>
        </div>
      `;
    }).join("");

    listEl.innerHTML = lockedNativeHtml + bossRowsHtml;

    listEl.querySelectorAll(".keybind-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.listeningKeybindId = btn.dataset.skillId;
        this.keybindErrorMsg = "";
        eventBus.emit("KEYBIND_CAPTURE_STATE", true);
        this.renderKeybindsTab();
      });
    });
  }

  renderSettingsModal() {
    const isMobile =
      settings.isMobileDevice ||
      window.innerWidth <= 950 ||
      window.innerHeight <= 520;
    const d = settings.data;

    document.querySelectorAll(".settings-tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === this.currentSettingsTab);
    });

    document
      .getElementById("settings-tab-general")
      ?.classList.toggle("hidden", this.currentSettingsTab !== "general");
    document
      .getElementById("settings-tab-controls")
      ?.classList.toggle("hidden", this.currentSettingsTab !== "controls");
    document
      .getElementById("settings-tab-keybinds")
      ?.classList.toggle("hidden", this.currentSettingsTab !== "keybinds");

    if (this.currentSettingsTab === "keybinds") {
      this.renderKeybindsTab();
    }

    const badge = document.getElementById("settings-device-badge");
    if (badge) {
      badge.textContent = isMobile
        ? "📱 Thiết bị phát hiện: Điện Thoại / Cảm Ứng"
        : "💻 Thiết bị phát hiện: Máy Tính (PC / Laptop)";
    }

    document
      .getElementById("settings-pc-section")
      ?.classList.toggle("hidden", isMobile);
    document
      .getElementById("settings-mobile-section")
      ?.classList.toggle("hidden", !isMobile);

    const sfxEl = document.getElementById("set-sfx-volume");
    if (sfxEl) sfxEl.value = d.sfxVolume;
    const sfxVal = document.getElementById("set-sfx-val");
    if (sfxVal) sfxVal.textContent = `${Math.round(d.sfxVolume * 100)}%`;

    const muteEl = document.getElementById("set-sfx-mute");
    if (muteEl) muteEl.checked = !!d.muted;

    const partEl = document.getElementById("set-particle-quality");
    if (partEl) partEl.value = d.particleQuality;

    const shakeEl = document.getElementById("set-screen-shake");
    if (shakeEl) shakeEl.checked = d.screenShake !== false;

    const floatEl = document.getElementById("set-floating-text");
    if (floatEl) floatEl.checked = d.showFloatingText !== false;

    const sensEl = document.getElementById("set-mouse-sens");
    if (sensEl) sensEl.value = d.mouseSensitivity || 1.0;
    const sensVal = document.getElementById("set-sens-val");
    if (sensVal)
      sensVal.textContent = `${(d.mouseSensitivity || 1.0).toFixed(1)}x`;

    document.querySelectorAll('input[name="mobile-ctrl-mode"]').forEach((r) => {
      r.checked = r.value === (d.mobileControlMode || "joystick");
    });

    const scaleEl = document.getElementById("set-mobile-btn-scale");
    if (scaleEl) scaleEl.value = d.mobileButtonScale || 1.0;
    const scaleVal = document.getElementById("set-btn-scale-val");
    if (scaleVal)
      scaleVal.textContent = `${Math.round((d.mobileButtonScale || 1.0) * 100)}%`;

    const opEl = document.getElementById("set-hud-opacity");
    if (opEl) opEl.value = d.hudOpacity ?? 0.95;
    const opVal = document.getElementById("set-hud-opacity-val");
    if (opVal)
      opVal.textContent = `${Math.round((d.hudOpacity ?? 0.95) * 100)}%`;
  }

  renderSavedSpeciesBadges() {
    ["fish", "turtle", "croc", "diver", "space", "time"].forEach((sp) => {
      const tag = document.getElementById(`saved-tag-${sp}`);
      if (!tag) return;
      const run = storage.getSpeciesRun(sp);
      if (run && run.score > 0) {
        tag.textContent = `💾 Lv.${run.level} • Dạng ${run.evoStage}`;
        tag.classList.remove("hidden");
      } else {
        tag.classList.add("hidden");
      }
    });
  }

  bindBusEvents() {
    eventBus.on("AUTH_STATE_CHANGED", (user) => {
      if (user) {
        this.dom.authScreen?.classList.add("hidden");
        this.dom.lobbyScreen?.classList.remove("hidden");
        this.refreshEpicCardsState();

        const disp =
          user.displayName ||
          (user.email ? user.email.split("@")[0] : "Thủy Quái");
        const badge = document.getElementById("user-account-badge");
        if (badge) badge.textContent = `👤 ${disp}`;
        const nameInput = document.getElementById("player-name-input");
        if (nameInput && disp) nameInput.value = disp.slice(0, 16);
      } else {
        this.dom.lobbyScreen?.classList.add("hidden");
        this.dom.gameoverScreen?.classList.add("hidden");
        this.dom.pauseScreen?.classList.add("hidden");
        this.dom.rebirthModal?.classList.add("hidden");
        this.dom.authScreen?.classList.remove("hidden");
      }
    });

    eventBus.on("FIREBASE_CONNECTION_CHANGED", (connected) => {
      const badge = document.getElementById("firebase-status-badge");
      if (badge) {
        badge.textContent = connected
          ? "🟢 Máy chủ Online"
          : "🔴 Mất kết nối Server";
        badge.style.color = connected ? "#06d6a0" : "#ff4d6d";
      }
    });

    eventBus.on("SAVE_UPDATED", (data) => {
      const g = document.getElementById("meta-gems");
      if (g) g.textContent = data.gems ?? 0;
      const hs = document.getElementById("meta-highscore");
      if (hs) hs.textContent = (data.highScore ?? 0).toLocaleString();
      const bk = document.getElementById("meta-bosskills");
      if (bk) bk.textContent = data.bossKills ?? 0;
      this.renderMetaShop();
      this.renderSavedSpeciesBadges();
      this.refreshEpicCardsState();
    });

    eventBus.on("BAG_UPDATED", (inv) => {
      this.renderQuickBag(inv);
    });

    eventBus.on("BOSS_SKILLS_UPDATED", (player) => {
      this.lastBossSkillsSignature = "";
      this.renderBossSkillsHUD(player);
    });

    eventBus.on("SETTINGS_CHANGED", () => {
      this.lastBossSkillsSignature = "";
    });

    eventBus.on("GLOBAL_LB_UPDATED", (list) => {
      const box = document.getElementById("global-leaderboard-list");
      if (!box) return;
      if (!list.length) {
        box.innerHTML = `<div style="font-size:11px;color:#90e0ef;">Chưa có dữ liệu bảng vàng</div>`;
        return;
      }
      box.innerHTML = list
        .map(
          (item, i) => `
        <div class="global-lb-row">
          <span>#${i + 1} <b>${item.name}</b></span>
          <span style="color:#fee440;">${(item.highScore || 0).toLocaleString()}</span>
        </div>
      `,
        )
        .join("");
    });

    eventBus.on("ONLINE_COUNT_UPDATED", (count) => {
      const el = document.getElementById("hud-online-count");
      if (el) el.textContent = `${count} Online`;
    });

    eventBus.on("SHOW_BANNER", (text) => this.showEventBanner(text, 5500));

    eventBus.on("CHAT_BOSS_SPAWN", ({ text }) => {
      const list = document.getElementById("chat-messages");
      if (list) {
        const row = document.createElement("div");
        row.className = "chat-msg-row boss-spawn-msg";
        row.textContent = text;
        list.appendChild(row);
        list.scrollTop = list.scrollHeight;
      }
      const chatBox = document.getElementById("chat-box");
      if (chatBox?.classList.contains("collapsed")) {
        this.unreadChatCount++;
        const badge = document.getElementById("chat-unread-badge");
        if (badge) {
          badge.textContent = String(this.unreadChatCount);
          badge.classList.remove("hidden");
        }
        document.getElementById("btn-toggle-chat")?.classList.add("has-unread");
      }
    });

    eventBus.on("FOCUS_CHAT", () => {
      const chatBox = document.getElementById("chat-box");
      chatBox?.classList.remove("collapsed");
      this.unreadChatCount = 0;
      document.getElementById("chat-unread-badge")?.classList.add("hidden");
      document
        .getElementById("btn-toggle-chat")
        ?.classList.remove("has-unread");
      document.getElementById("chat-input")?.focus();
    });

    eventBus.on("CHAT_MESSAGE_RECEIVED", ({ senderName, text, isMe }) => {
      const list = document.getElementById("chat-messages");
      if (!list) return;
      const row = document.createElement("div");
      row.className = "chat-msg-row";
      const safeName = String(senderName).replace(/</g, "&lt;");
      const safeText = String(text).replace(/</g, "&lt;");
      row.innerHTML = `<b style="color:${isMe ? "#00f5d4" : "#fee440"}">[${safeName}]:</b> ${safeText}`;
      list.appendChild(row);
      list.scrollTop = list.scrollHeight;

      const chatBox = document.getElementById("chat-box");
      if (!isMe && chatBox?.classList.contains("collapsed")) {
        this.unreadChatCount++;
        const badge = document.getElementById("chat-unread-badge");
        if (badge) {
          badge.textContent = String(this.unreadChatCount);
          badge.classList.remove("hidden");
        }
        document.getElementById("btn-toggle-chat")?.classList.add("has-unread");
      }
    });
  }

  renderQuickBag(inventory = [null, null, null]) {
    document.querySelectorAll("#quick-bag-bar .bag-slot").forEach((slotEl) => {
      const idx = Number(slotEl.dataset.slot);
      const itemId = inventory[idx];
      const iconEl = slotEl.querySelector(".slot-icon");
      if (itemId && TACTICAL_ITEMS[itemId]) {
        const cfg = TACTICAL_ITEMS[itemId];
        slotEl.classList.remove("empty");
        slotEl.style.borderColor = cfg.color;
        slotEl.title = `${cfg.name}: ${cfg.desc}`;
        if (iconEl) iconEl.textContent = cfg.icon;
      } else {
        slotEl.classList.add("empty");
        slotEl.style.borderColor = "";
        slotEl.title = `Ô túi đồ ${idx + 1} (Trống)`;
        if (iconEl) iconEl.textContent = "";
      }
    });
  }

  renderBossSkillsHUD(player) {
    const bar = document.getElementById("boss-skills-bar");
    if (!bar || !player) return;

    const unlocked = player.getUnlockedBossSkillList();
    const sig = unlocked
      .map(
        (id) =>
          `${id}:${player.getBossSkillTier(id)}:${settings.getKeybind(id)}`,
      )
      .join("|");

    if (sig !== this.lastBossSkillsSignature) {
      this.lastBossSkillsSignature = sig;
      bar.innerHTML = "";
      unlocked.forEach((id) => {
        const cfg = BOSS_SKILL_CORES[id];
        if (!cfg) return;
        const tier = player.getBossSkillTier(id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `boss-skill-btn ${tier >= 2 ? "v2-awakened" : ""}`;
        btn.dataset.bossSkillId = id;
        btn.title =
          tier >= 2
            ? `${cfg.v2Name} (V2 Giới Hạn): ${cfg.v2Desc}`
            : `${cfg.name} (50% Sức Mạnh): ${cfg.desc}`;
        btn.innerHTML = `
          <span class="boss-skill-key">${getKeyLabel(settings.getKeybind(id))}</span>
          <span>${cfg.icon}</span>
          <span class="boss-skill-name">${cfg.shortName}${tier >= 2 ? " V2" : ""}</span>
          <span class="boss-skill-cd" style="font-size:9.5px;color:#fee440;"></span>
        `;
        btn.addEventListener("click", () => {
          eventBus.emit("INPUT_BOSS_SKILL", id);
        });
        bar.appendChild(btn);
      });
    }

    // Cập nhật hồi chiêu tại chỗ mà không phá DOM
    bar.querySelectorAll(".boss-skill-btn").forEach((btn) => {
      const id = btn.dataset.bossSkillId;
      const cd = player.bossSkillCooldowns?.[id] || 0;
      const cdEl = btn.querySelector(".boss-skill-cd");
      if (cd > 0) {
        btn.classList.add("cooldown");
        if (cdEl) cdEl.textContent = `${cd.toFixed(1)}s`;
      } else {
        btn.classList.remove("cooldown");
        if (cdEl) cdEl.textContent = "";
      }
    });
  }

  renderMetaShop() {
    const grid = document.getElementById("meta-shop-grid");
    if (!grid) return;
    grid.innerHTML = "";
    META_SHOP_ITEMS.forEach((item) => {
      const lv = storage.data.upgrades[item.key] || 0;
      const cost = item.baseCost * (lv + 1);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-btn";
      btn.innerHTML = `
        <div style="font-weight:800;font-size:12px;color:#fee440;">${item.name} (Lv.${lv}/${item.maxLevel})</div>
        <div style="font-size:10.5px;color:#caf0f8;margin:2px 0;">${item.desc}</div>
        <div style="font-size:11px;font-weight:900;color:#00f5d4;">${lv >= item.maxLevel ? "✅ ĐÃ TỐI ĐA" : `Nâng cấp: 💎 ${cost}`}</div>
      `;
      btn.addEventListener("click", () => {
        const res = storage.buyUpgrade(item.key, item.baseCost, item.maxLevel);
        if (res.ok) sound.playEat(3);
      });
      grid.appendChild(btn);
    });
  }

  initMatchHUD(selectedSpecies, roomId, player) {
    this.dom.lobbyScreen?.classList.add("hidden");
    this.dom.gameoverScreen?.classList.add("hidden");
    this.dom.pauseScreen?.classList.add("hidden");

    const spEl = document.getElementById("hud-species");
    if (spEl)
      spEl.textContent = SPECIES_CONFIG[selectedSpecies]?.name || "Sinh Vật";
    const roomEl = document.getElementById("hud-room-tag");
    if (roomEl) roomEl.textContent = `Phòng: ${roomId}`;
    const skEl = document.getElementById("hud-skill-name");
    if (skEl) skEl.textContent = player.cfg.skillName;

    const sk2Box = document.getElementById("skill2-box");
    const ultNameEl = document.getElementById("hud-ult-name");
    if (selectedSpecies === "space") {
      sk2Box?.classList.remove("hidden");
      if (ultNameEl) ultNameEl.textContent = "Hạ Cấp";
    } else if (selectedSpecies === "time") {
      sk2Box?.classList.remove("hidden");
      if (ultNameEl) ultNameEl.textContent = "Trường Thời Gian";
    } else {
      sk2Box?.classList.add("hidden");
      if (ultNameEl) ultNameEl.textContent = "Hóa Thần";
    }

    this.lastBossSkillsSignature = "";
    settings.applyToDOM();
    this.renderAugmentAndPassiveHUD(player);
    this.renderQuickBag(player.inventory);
    this.renderBossSkillsHUD(player);
  }

  enqueueAugment(type, player, particleSystem, onAllDoneCallback) {
    if (type === "super" && player.superAugments.length >= MAX_SUPER_AUGMENTS) {
      return;
    }
    if (onAllDoneCallback) this.onAllAugmentsDone = onAllDoneCallback;
    this.augmentQueue.push({ type, player, particleSystem });
    if (!this.isAugmentChoosing) {
      this.processNextAugment();
    }
  }

  enqueueBossCore(
    { bossType, skillId, rewardMode },
    player,
    particleSystem,
    onAllDoneCallback,
  ) {
    if (onAllDoneCallback) this.onAllAugmentsDone = onAllDoneCallback;
    this.augmentQueue.push({
      type: "boss_core",
      bossType,
      skillId,
      rewardMode,
      player,
      particleSystem,
    });
    if (!this.isAugmentChoosing) {
      this.processNextAugment();
    }
  }

  processNextAugment() {
    if (this.augmentQueue.length === 0) {
      this.isAugmentChoosing = false;
      this.currentAugmentType = null;
      this.currentBossCoreData = null;
      this.dom.upgradeScreen?.classList.add("hidden");
      if (this.onAllAugmentsDone) {
        const cb = this.onAllAugmentsDone;
        this.onAllAugmentsDone = null;
        cb();
      }
      return;
    }

    const next = this.augmentQueue.shift();
    if (
      next.type === "super" &&
      next.player.superAugments.length >= MAX_SUPER_AUGMENTS
    ) {
      this.processNextAugment();
      return;
    }

    this.isAugmentChoosing = true;
    this.currentAugmentType = next.type;
    this.currentAugmentPlayer = next.player;
    this.currentParticleSystem = next.particleSystem;
    this.currentBossCoreData = next.type === "boss_core" ? next : null;
    this.superRerollLeft = next.type === "super" ? 1 : 0;

    const titleEl = document.getElementById("augment-modal-title");
    const subEl = document.getElementById("augment-modal-sub");

    if (next.type === "boss_core") {
      const bossLabel =
        next.bossType === "space" ? "KHÔNG GIAN" : "THỜI GIAN";
      if (titleEl) {
        titleEl.textContent = `💠 RỚT LÕI SKILL BOSS ${bossLabel}! 💠`;
      }
      if (subEl) {
        subEl.textContent =
          "Lõi kỹ năng hiếm duy nhất — bấm vào thẻ để hấp thụ sức mạnh!";
      }
    } else if (next.type === "super") {
      if (titleEl)
        titleEl.textContent = `🌟 ĐỘT PHÁ TIẾN HÓA! CHỌN LÕI SIÊU CẤP (${next.player.superAugments.length + 1}/${MAX_SUPER_AUGMENTS}) 🌟`;
      if (subEl)
        subEl.textContent =
          "Chọn 1 Lõi Siêu Cấp (Hệ Cường Hóa / Hệ Nguyên Tố) để kích hoạt cộng hưởng!";
    } else {
      if (titleEl)
        titleEl.textContent = `⚡ LÕI CƯỜNG HÓA THƯỜNG (CẤP ${next.player.level}) ⚡`;
      if (subEl)
        subEl.textContent =
          "Tích lũy chỉ số vi mô vĩnh viễn suốt ván đấu (Không giới hạn số lượng)";
    }

    this.renderCurrentAugmentChoices();
    this.dom.upgradeScreen?.classList.remove("hidden");
  }

  renderCurrentAugmentChoices() {
    const container = document.getElementById("upgrade-cards-container");
    const rerollBtn = document.getElementById("btn-reroll-augment");
    if (!container || !this.currentAugmentPlayer) return;

    container.innerHTML = "";
    container.classList.remove("single-core-grid");
    const player = this.currentAugmentPlayer;

    if (rerollBtn) {
      if (this.currentAugmentType === "super") {
        rerollBtn.classList.remove("hidden");
        rerollBtn.disabled = this.superRerollLeft <= 0;
        rerollBtn.textContent =
          this.superRerollLeft > 0
            ? "🎲 Đổi Lại Bộ Lõi (1/1)"
            : "🎲 Đã Hết Lượt Đổi";
      } else {
        rerollBtn.classList.add("hidden");
      }
    }

    // CHỈ HIỂN THỊ DUY NHẤT 1 LÕI SKILL KHI RỚT TỪ BOSS SỬ THI
    if (this.currentAugmentType === "boss_core" && this.currentBossCoreData) {
      container.classList.add("single-core-grid");
      const { bossType, skillId, rewardMode } = this.currentBossCoreData;
      const core = skillId ? BOSS_SKILL_CORES[skillId] : null;
      const card = document.createElement("div");

      if (rewardMode === "mastery" || !core) {
        card.className = "upgrade-card boss-core-card boss-core-v2";
        card.innerHTML = `
          <div class="aug-system-tag">👑 TINH THÔNG TỐI THƯỢNG</div>
          <div style="font-size:44px;margin:6px 0;">✨</div>
          <div style="font-weight:900;color:#fee440;font-size:16px;">Hấp Thụ Tinh Hoa Boss</div>
          <div style="font-size:12.5px;color:#e0fbfc;margin-top:8px;line-height:1.45;">
            Bạn đã thức tỉnh V2 toàn bộ kỹ năng Boss này! Nhận ngay <b>+10% Sát Thương</b> & <b>+2.500 XP</b>.
          </div>
        `;
        card.addEventListener("click", () => {
          player.bitePower += 0.1;
          player.addScore(
            2500,
            null,
            player.selectedMap,
            this.currentParticleSystem,
            null,
          );
          sound.playEvolution();
          this.processNextAugment();
        });
        container.appendChild(card);
        return;
      }

      const isV2 = rewardMode === "true_v2" || rewardMode === "limited_v2";
      const isTrueV2 = rewardMode === "true_v2";
      const tagText = isTrueV2
        ? "🔥 THỨC TỈNH V2 CÙNG HỆ"
        : rewardMode === "limited_v2"
          ? "⚡ THỨC TỈNH V2 (GIỚI HẠN KHÁC HỆ)"
          : "💠 LÕI SKILL BOSS MỚI (50% SỨC MẠNH)";

      const noteHtml = isTrueV2
        ? `<span style="color:#06d6a0;font-weight:800;">• Cùng hệ: Nâng cấp màu sắc mới, hiệu ứng V2 mạnh mẽ & giảm hồi chiêu!</span>`
        : rewardMode === "limited_v2"
          ? `<span style="color:#ffbe0b;font-weight:800;">• Khác hệ (Đã mở full 3/3): Kích hoạt V2 Giới Hạn (màu & hiệu ứng mới, yếu hơn cùng hệ).</span>`
          : `<span style="color:#90e0ef;font-weight:800;">• Khác hệ: Thi triển với 50% sức mạnh cấp độ hiện tại (Lv.${player.level} → Lv.${Math.max(1, Math.round(player.level * 0.5))}).</span>`;

      card.className = `upgrade-card boss-core-card ${isV2 ? "boss-core-v2" : ""}`;
      card.innerHTML = `
        <div class="aug-system-tag">${tagText}</div>
        <div style="font-size:42px;margin:6px 0;">${core.icon}</div>
        <div style="font-weight:900;color:#fee440;font-size:16px;">${isV2 ? core.v2Name : core.name}</div>
        <div style="font-size:12px;color:#e0fbfc;margin-top:6px;line-height:1.45;">
          ${isV2 ? core.v2Desc : core.desc}<br/><br/>
          ${noteHtml}
        </div>
        <div style="margin-top:10px;font-size:11px;color:#00f5d4;font-weight:800;">
          Boss ${bossType === "space" ? "Không Gian" : "Thời Gian"} • Phím [${getKeyLabel(settings.getKeybind(skillId))}]
        </div>
      `;
      card.addEventListener("click", () => {
        player.unlockOrUpgradeBossSkill(skillId, rewardMode);
        sound.playEvolution();
        this.renderBossSkillsHUD(player);
        this.processNextAugment();
      });
      container.appendChild(card);
      return;
    }

    if (this.currentAugmentType === "super") {
      const available = SUPER_AUGMENTS.filter(
        (a) => !player.superAugments.includes(a.id),
      );
      const choices = [...available]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      const syn = player.getSynergies();

      choices.forEach((aug) => {
        const isEmp = aug.system === "empowerment";
        const nextCount = (isEmp ? syn.empowerment : syn.elemental) + 1;
        const card = document.createElement("div");
        card.className = `upgrade-card super-card system-${aug.system}`;
        card.innerHTML = `
          <div class="aug-system-tag">${aug.systemName} (${nextCount}/4)</div>
          <div style="font-size:38px;margin:4px 0;">${aug.icon}</div>
          <div style="font-weight:900;color:#fee440;font-size:15px;">${aug.name}</div>
          <div style="font-size:12px;color:#e0fbfc;margin-top:6px;line-height:1.4;">${aug.desc}</div>
        `;
        card.addEventListener("click", () => {
          player.equipSuperAugment(aug.id, this.currentParticleSystem);
          this.renderAugmentAndPassiveHUD(player);
          this.processNextAugment();
        });
        container.appendChild(card);
      });
    } else {
      const choices = [...COMMON_AUGMENTS]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      choices.forEach((aug) => {
        const card = document.createElement("div");
        card.className = "upgrade-card common-card";
        card.innerHTML = `
          <div class="aug-common-tag">Lõi Thường • Tích Lũy</div>
          <div style="font-size:34px;margin:4px 0;">${aug.icon}</div>
          <div style="font-weight:800;color:#00f5d4;font-size:14px;">${aug.name}</div>
          <div style="font-size:12px;color:#cdeae5;margin-top:6px;">${aug.desc}</div>
        `;
        card.addEventListener("click", () => {
          player.equipCommonAugment(aug, this.currentParticleSystem);
          this.renderAugmentAndPassiveHUD(player);
          this.processNextAugment();
        });
        container.appendChild(card);
      });
    }
  }

  renderAugmentAndPassiveHUD(player) {
    if (!player) return;

    const slotsEl = document.getElementById("hud-super-augments");
    if (slotsEl) {
      let html = "";
      for (let i = 0; i < MAX_SUPER_AUGMENTS; i++) {
        const augId = player.superAugments[i];
        const aug = augId ? SUPER_AUGMENTS.find((a) => a.id === augId) : null;
        if (aug) {
          html += `<div class="super-slot filled system-${aug.system}" title="${aug.name}: ${aug.desc}">${aug.icon}</div>`;
        } else {
          html += `<div class="super-slot empty" title="Ô Lõi Siêu Cấp (Mở khóa ở Tiến Hóa Dạng 2, 4, 6, 8)">+</div>`;
        }
      }

      const syn = player.getSynergies();
      if (syn.empowerment >= 2) {
        html += `<div class="synergy-pill emp" title="Cộng hưởng Hệ Cường Hóa">⚔️ ${syn.empowerment}/4</div>`;
      }
      if (syn.elemental >= 2) {
        html += `<div class="synergy-pill ele" title="Cộng hưởng Hệ Nguyên Tố">🔮 ${syn.elemental}/4</div>`;
      }
      if (player.commonAugments.length > 0) {
        html += `<div class="common-count-pill" title="Lõi Thường đã tích lũy">✨ x${player.commonAugments.length}</div>`;
      }
      slotsEl.innerHTML = html;
    }

    const passiveBar = document.getElementById("hud-species-passives");
    if (passiveBar) {
      const unlocked = getUnlockedPassives(player.species, player.evoStage);
      passiveBar.innerHTML = unlocked
        .map(
          (p) =>
            `<div class="passive-badge" title="[Dạng ${p.stage}] ${p.name}: ${p.desc}">${p.icon} ${p.name}</div>`,
        )
        .join("");
    }
  }

  renderPauseBuildDetails(player) {
    const box = document.getElementById("pause-build-summary");
    if (!box || !player) return;

    const syn = player.getSynergies();
    const superHtml =
      player.superAugments.length > 0
        ? player.superAugments
            .map((id) => {
              const a = SUPER_AUGMENTS.find((x) => x.id === id);
              return a
                ? `<div class="build-item"><b>${a.icon} ${a.name}</b> (${a.systemName}): ${a.desc}</div>`
                : "";
            })
            .join("")
        : `<div class="build-item locked">Chưa có Lõi Siêu Cấp (Nhận khi Tiến hóa Dạng 2, 4, 6, 8)</div>`;

    let synHtml = "";
    if (syn.empowerment >= 2) {
      const t = SYNERGY_TIERS.empowerment.tiers.find(
        (x) => x.count === syn.empowerment,
      );
      if (t)
        synHtml += `<div class="syn-active">⚔️ <b>${t.title}:</b> ${t.desc}</div>`;
    }
    if (syn.elemental >= 2) {
      const t = SYNERGY_TIERS.elemental.tiers.find(
        (x) => x.count === syn.elemental,
      );
      if (t)
        synHtml += `<div class="syn-active">🔮 <b>${t.title}:</b> ${t.desc}</div>`;
    }

    const bossSkillEntries = ALL_BOSS_SKILL_IDS.filter(
      (id) => player.getBossSkillTier(id) > 0,
    );
    const bossHtml = bossSkillEntries.length
      ? bossSkillEntries
          .map((id) => {
            const cfg = BOSS_SKILL_CORES[id];
            const tier = player.getBossSkillTier(id);
            const isTrueV2 = player.isBossSkillTrueV2(id);
            const badge =
              tier >= 2
                ? isTrueV2
                  ? "[V2 CÙNG HỆ]"
                  : "[V2 GIỚI HẠN]"
                : "[50% SỨC MẠNH]";
            return `<div class="build-item unlocked"><b>${cfg.icon} ${tier >= 2 ? cfg.v2Name : cfg.name}</b> ${badge}</div>`;
          })
          .join("")
      : `<div class="build-item locked">Chưa có Lõi Skill Boss Sử Thi (Rớt 1–2% khi hạ Boss KG/TG)</div>`;

    const allPassives = SPECIES_EVOLUTION_PASSIVES[player.species] || [];
    const passivesHtml = allPassives
      .map((p) => {
        const active = player.evoStage >= p.stage;
        return `<div class="build-item ${active ? "unlocked" : "locked"}">
          <b>${p.icon} [Dạng ${p.stage}] ${p.name}:</b> ${p.desc}
        </div>`;
      })
      .join("");

    box.innerHTML = `
      <div class="build-section-title">🌟 Lõi Siêu Cấp (${player.superAugments.length}/4) & Lõi Thường (x${player.commonAugments.length})</div>
      ${synHtml}
      ${superHtml}
      <div class="build-section-title" style="margin-top:8px;">💠 Lõi Skill Boss Sử Thi & Thức Tỉnh V2</div>
      ${bossHtml}
      <div class="build-section-title" style="margin-top:8px;">🧬 Nội Tại Tiến Hóa Đặc Thù</div>
      ${passivesHtml}
    `;
  }

  updateHUD(
    player,
    survivalTime,
    zoneLabel = "",
    spaceSystem = null,
    timeSystem = null,
  ) {
    if (!player) return;

    const evoForm =
      EVOLUTION_FORMS[player.evoStage - 1] ||
      EVOLUTION_FORMS[EVOLUTION_FORMS.length - 1];
    const evoStageEl = document.getElementById("hud-evo-stage");
    if (evoStageEl) {
      evoStageEl.textContent = evoForm.shortTitle;
      evoStageEl.classList.toggle("rainbow-badge", player.evoStage >= 8);
    }

    const zoneEl = document.getElementById("hud-zone");
    if (zoneEl && zoneLabel) zoneEl.textContent = zoneLabel;

    const hpText = document.getElementById("hud-hp-text");
    if (hpText)
      hpText.textContent = `${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)}`;
    const hpBar = document.getElementById("hp-bar");
    if (hpBar)
      hpBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;

    const lvEl = document.getElementById("hud-level");
    if (lvEl) lvEl.textContent = `Lv.${player.level}`;
    const scEl = document.getElementById("hud-score");
    if (scEl) scEl.textContent = player.score.toLocaleString();
    const grBar = document.getElementById("growth-bar");
    if (grBar)
      grBar.style.width = `${Math.min(100, (player.xp / player.xpNext) * 100)}%`;

    const stamBar = document.getElementById("stamina-bar");
    if (stamBar) {
      stamBar.style.width = `${(player.stamina / player.maxStamina) * 100}%`;
      stamBar.classList.toggle("exhausted", player.isExhausted);
    }

    const mobileBoostBtn = document.getElementById("mobile-boost-btn");
    if (mobileBoostBtn) {
      mobileBoostBtn.classList.toggle("exhausted", player.isExhausted);
    }

    const skillBox = document.getElementById("skill-box");
    const skillNameEl = document.getElementById("hud-skill-name");
    const skillSub = document.getElementById("hud-skill-status");

    if (player.species === "space" && spaceSystem) {
      const inside = spaceSystem.isInsideDomain(player);
      const s1V2 = player.getBossSkillTier("boss_space_1") >= 2 ? " V2" : "";
      const s2V2 = player.getBossSkillTier("boss_space_2") >= 2 ? " V2" : "";
      const s3V2 = player.getBossSkillTier("boss_space_3") >= 2 ? " V2" : "";

      if (inside) {
        skillBox?.classList.remove("cooldown");
        if (skillNameEl) skillNameEl.textContent = `Bước Nhảy${s1V2}`;
        if (skillSub) {
          skillSub.textContent = `${spaceSystem.domain.timer.toFixed(1)}s [E/Chạm]`;
        }
      } else {
        if (skillNameEl) skillNameEl.textContent = `Bành Trướng${s1V2}`;
        if (player.skillCooldownTimer > 0) {
          skillBox?.classList.add("cooldown");
          if (skillSub)
            skillSub.textContent = `${player.skillCooldownTimer.toFixed(1)}s`;
        } else {
          skillBox?.classList.remove("cooldown");
          if (skillSub) skillSub.textContent = "Sẵn Sàng [E]";
        }
      }

      const sk2Box = document.getElementById("skill2-box");
      const sk2Name = document.getElementById("hud-skill2-name");
      const sk2Sub = document.getElementById("hud-skill2-status");
      if (sk2Name)
        sk2Name.textContent = (inside ? "Chém Tuyệt Đối" : "Lát Cắt") + s2V2;
      if (player.skill2CooldownTimer > 0) {
        sk2Box?.classList.add("cooldown");
        if (sk2Sub)
          sk2Sub.textContent = `${player.skill2CooldownTimer.toFixed(1)}s`;
      } else {
        sk2Box?.classList.remove("cooldown");
        if (sk2Sub) sk2Sub.textContent = "Sẵn Sàng [Q]";
      }

      const ultBox = document.getElementById("ult-box");
      const ultName = document.getElementById("hud-ult-name");
      const ultSub = document.getElementById("hud-ult-status");
      if (ultName)
        ultName.textContent =
          (inside ? "Bóp Méo Ngay" : "Bán Lãnh Địa") + s3V2;
      if (player.skill3CooldownTimer > 0) {
        ultBox?.classList.add("cooldown");
        ultBox?.classList.remove("ult-ready");
        if (ultSub)
          ultSub.textContent = `${player.skill3CooldownTimer.toFixed(1)}s`;
      } else {
        ultBox?.classList.remove("cooldown");
        ultBox?.classList.add("ult-ready");
        if (ultSub) ultSub.textContent = "Sẵn Sàng [R]";
      }
    } else if (player.species === "time" && timeSystem) {
      const inside = timeSystem.isInsideDomain(player);
      const t1V2 = player.getBossSkillTier("boss_time_1") >= 2 ? " V2" : "";
      const t2V2 = player.getBossSkillTier("boss_time_2") >= 2 ? " V2" : "";
      const t3V2 = player.getBossSkillTier("boss_time_3") >= 2 ? " V2" : "";

      if (skillNameEl)
        skillNameEl.textContent = (inside ? "Bản Thể Thực" : "Dòng Chảy") + t1V2;
      if (player.skillCooldownTimer > 0) {
        skillBox?.classList.add("cooldown");
        if (skillSub)
          skillSub.textContent = `${player.skillCooldownTimer.toFixed(1)}s`;
      } else {
        skillBox?.classList.remove("cooldown");
        if (skillSub) skillSub.textContent = "Sẵn Sàng [E]";
      }

      const sk2Box = document.getElementById("skill2-box");
      const sk2Name = document.getElementById("hud-skill2-name");
      const sk2Sub = document.getElementById("hud-skill2-status");
      if (sk2Name) sk2Name.textContent = `Lồng Giam${t2V2}`;
      if (player.skill2CooldownTimer > 0) {
        sk2Box?.classList.add("cooldown");
        if (sk2Sub)
          sk2Sub.textContent = `${player.skill2CooldownTimer.toFixed(1)}s`;
      } else {
        sk2Box?.classList.remove("cooldown");
        if (sk2Sub) sk2Sub.textContent = "Sẵn Sàng [Q]";
      }

      const ultBox = document.getElementById("ult-box");
      const ultName = document.getElementById("hud-ult-name");
      const ultSub = document.getElementById("hud-ult-status");
      if (timeSystem.domain && !timeSystem.domain.rewindUsed) {
        ultBox?.classList.remove("cooldown");
        ultBox?.classList.add("ult-ready");
        if (ultName) ultName.textContent = `Tua Ngược 3s${t3V2}`;
        if (ultSub)
          ultSub.textContent = `${timeSystem.domain.timer.toFixed(1)}s [R]`;
      } else {
        if (ultName) ultName.textContent = `Trường Thời Gian${t3V2}`;
        if (player.skill3CooldownTimer > 0) {
          ultBox?.classList.add("cooldown");
          ultBox?.classList.remove("ult-ready");
          if (ultSub)
            ultSub.textContent = `${player.skill3CooldownTimer.toFixed(1)}s`;
        } else {
          ultBox?.classList.remove("cooldown");
          ultBox?.classList.add("ult-ready");
          if (ultSub) ultSub.textContent = "Sẵn Sàng [R]";
        }
      }
    } else {
      if (skillBox && skillSub) {
        if (player.skillCooldownTimer > 0) {
          skillBox.classList.add("cooldown");
          skillSub.textContent = `${player.skillCooldownTimer.toFixed(1)}s`;
        } else {
          skillBox.classList.remove("cooldown");
          skillSub.textContent = "Sẵn Sàng [E]";
        }
      }

      const ultBox = document.getElementById("ult-box");
      const ultSub = document.getElementById("hud-ult-status");
      if (ultBox && ultSub) {
        if (player.ultTimer > 0) {
          ultBox.classList.remove("cooldown");
          ultBox.classList.add("ult-ready");
          ultSub.textContent = `${player.ultTimer.toFixed(1)}s`;
        } else if (player.rage >= 100) {
          ultBox.classList.remove("cooldown");
          ultBox.classList.add("ult-ready");
          ultSub.textContent = "SẴN SÀNG [R]!";
        } else {
          ultBox.classList.add("cooldown");
          ultBox.classList.remove("ult-ready");
          ultSub.textContent = `Nộ: ${Math.floor(player.rage)}%`;
        }
      }
    }

    const mins = String(Math.floor(survivalTime / 60)).padStart(2, "0");
    const secs = String(Math.floor(survivalTime % 60)).padStart(2, "0");
    const timeEl = document.getElementById("hud-time");
    if (timeEl) timeEl.textContent = `${mins}:${secs}`;

    const evoRatioText = `${player.evoStage}/${EVOLUTION_FORMS.length}`;
    const evoCounter = document.getElementById("evo-counter");
    if (evoCounter) evoCounter.textContent = evoRatioText;
    const evoCounterPill = document.getElementById("evo-counter-pill");
    if (evoCounterPill) evoCounterPill.textContent = evoRatioText;

    this.renderAugmentAndPassiveHUD(player);
    this.renderBossSkillsHUD(player);
  }

  renderQuests(quests) {
    const list = document.getElementById("quest-list");
    if (!list) return;
    list.innerHTML = quests
      .map((q) => {
        const pct = Math.min(100, (q.current / q.target) * 100);
        return `
        <div class="quest-item ${q.done ? "done" : ""}">
          <div>${q.done ? "✅" : "🔹"} ${q.title} (${q.current}/${q.target})</div>
          <div class="quest-reward-tag">${q.rewardText}</div>
          <div class="quest-progress-bg"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        </div>
      `;
      })
      .join("");
  }

  updateLeaderboard(player, remotePlayers, boss) {
    const list = document.getElementById("leaderboard-list");
    if (!list || !player) return;

    const rows = [
      {
        name: `${player.name} (Lv.${player.level})`,
        score: player.score,
        cls: "me",
      },
      ...Object.entries(remotePlayers).map(([id, rp]) => ({
        name: `🌐 ${rp.name} (Lv.${rp.level || 1})`,
        score: rp.score || 0,
        cls: id === myPlayerId ? "me" : "real-player",
      })),
    ];

    if (boss) {
      rows.push({
        name: "🐉 LEVIATHAN",
        score: Math.max(0, Math.round(boss.hp * 3)),
        cls: "",
      });
    }

    rows.sort((a, b) => b.score - a.score);
    list.innerHTML = rows
      .slice(0, 5)
      .map(
        (r, idx) => `
      <div class="lb-row ${r.cls}">
        <span>#${idx + 1} ${r.name}</span>
        <span>${r.score.toLocaleString()}</span>
      </div>
    `,
      )
      .join("");
  }

  showEventBanner(text, duration = 4000) {
    const banner = document.getElementById("event-banner");
    if (!banner) return;
    banner.textContent = text;
    banner.style.display = "block";
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      banner.style.display = "none";
    }, duration);
  }

  showGameOver(player, killerName, fishEaten, survivalTime, earnedGems) {
    const badge = document.getElementById("gameover-title-badge");
    if (badge) {
      badge.textContent = killerName
        ? `⚔️ Bị hạ gục bởi: ${killerName}`
        : "🌊 Kết thúc hành trình đại dương";
    }
    const stats = document.getElementById("gameover-stats");
    if (stats) {
      stats.innerHTML = `
        Sinh vật: <b>${player.cfg.name}</b> • Đạt <b>Cấp ${player.level}</b> (Dạng ${player.evoStage})<br/>
        Tổng Điểm: <b style="color:#00f5d4">${player.score.toLocaleString()} XP</b> • Con mồi đã săn: <b>${fishEaten}</b><br/>
        Thời gian sinh tồn: <b>${Math.floor(survivalTime)}s</b> • Ngọc thưởng: <b style="color:#fee440">+${earnedGems} 💎</b>
      `;
    }
    this.dom.gameoverScreen?.classList.remove("hidden");
  }
}