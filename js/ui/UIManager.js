import { eventBus } from "../core/EventBus.js";
import { storage } from "../core/StorageManager.js";
import { sound } from "../core/SoundSystem.js";
import { settings } from "../core/SettingsManager.js";
import { SPECIES_CONFIG } from "../data/speciesConfig.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";
import { META_SHOP_ITEMS } from "../data/upgradesData.js";
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
    };

    this.isRegisterMode = false;
    this.unreadChatCount = 0;
    this.currentSettingsTab = "general";

    this.augmentQueue = [];
    this.isAugmentChoosing = false;
    this.currentAugmentType = null;
    this.currentAugmentPlayer = null;
    this.superRerollLeft = 0;
    this.onAllAugmentsDone = null;

    this.bindAuthEvents();
    this.bindChatAndMobileEvents();
    this.bindSettingsEvents();
    this.bindBusEvents();
    this.renderMetaShop();
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

    const closeModal = () => this.dom.settingsScreen?.classList.add("hidden");
    document
      .getElementById("btn-close-settings")
      ?.addEventListener("click", closeModal);
    document
      .getElementById("btn-save-close-settings")
      ?.addEventListener("click", closeModal);

    document
      .getElementById("btn-reset-settings")
      ?.addEventListener("click", () => {
        settings.reset();
        this.renderSettingsModal();
      });

    document.querySelectorAll(".settings-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.currentSettingsTab = btn.dataset.tab;
        this.renderSettingsModal();
      });
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
    this.renderSettingsModal();
    this.dom.settingsScreen?.classList.remove("hidden");
  }

  renderSettingsModal() {
    const isMobile = settings.isMobileDevice;
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

  bindBusEvents() {
    eventBus.on("AUTH_STATE_CHANGED", (user) => {
      if (user) {
        this.dom.authScreen?.classList.add("hidden");
        this.dom.lobbyScreen?.classList.remove("hidden");
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

    eventBus.on("SHOW_BANNER", (text) => this.showEventBanner(text, 4500));

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

    settings.applyToDOM();
    this.renderAugmentAndPassiveHUD(player);
  }

  // ========================================================
  // HÀNG ĐỢI LÕI SIÊU CẤP (DẠNG 2,4,6,8) & LÕI THƯỜNG (MỖI 2 CẤP)
  // ========================================================
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

  processNextAugment() {
    if (this.augmentQueue.length === 0) {
      this.isAugmentChoosing = false;
      this.currentAugmentType = null;
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
    this.superRerollLeft = next.type === "super" ? 1 : 0;

    const titleEl = document.getElementById("augment-modal-title");
    const subEl = document.getElementById("augment-modal-sub");

    if (next.type === "super") {
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
      <div class="build-section-title" style="margin-top:8px;">🧬 Nội Tại Tiến Hóa Đặc Thù</div>
      ${passivesHtml}
    `;
  }

  updateHUD(player, survivalTime) {
    if (!player) return;

    const evoForm =
      EVOLUTION_FORMS[player.evoStage - 1] ||
      EVOLUTION_FORMS[EVOLUTION_FORMS.length - 1];
    const evoStageEl = document.getElementById("hud-evo-stage");
    if (evoStageEl) evoStageEl.textContent = evoForm.shortTitle;

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
    const skillSub = document.getElementById("hud-skill-status");
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

    const mins = String(Math.floor(survivalTime / 60)).padStart(2, "0");
    const secs = String(Math.floor(survivalTime % 60)).padStart(2, "0");
    const timeEl = document.getElementById("hud-time");
    if (timeEl) timeEl.textContent = `${mins}:${secs}`;

    const evoCounter = document.getElementById("evo-counter");
    if (evoCounter)
      evoCounter.textContent = `${player.evoStage}/${EVOLUTION_FORMS.length}`;

    this.renderAugmentAndPassiveHUD(player);
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
