import { storage } from "../core/StorageManager.js";
import { eventBus } from "../core/EventBus.js";
import { EVOLUTION_FORMS, MAX_PLAYER_LEVEL } from "../data/evolutionTrees.js";

const ADMIN_EMAILS = ["doanbao398@gmail.com"];

export class AdminPanel {
  constructor(getPlayerFn, particleSystem, camera) {
    this.getPlayerFn = getPlayerFn;
    this.particleSystem = particleSystem;
    this.camera = camera;
    this.isAdmin = false;
    this.panelEl = null;
    this.toggleBtn = null;

    this.injectUI();
    this.bindEvents();
  }

  injectUI() {
    const maxStage = EVOLUTION_FORMS.length;
    const maxForm = EVOLUTION_FORMS[maxStage - 1];

    const btn = document.createElement("button");
    btn.id = "btn-admin-toggle";
    btn.type = "button";
    btn.innerText = "👑 ADMIN";
    btn.style.cssText = `
      position: fixed;
      top: 56px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1.5px solid #fee440;
      background: linear-gradient(90deg, #3a0ca3, #7209b7);
      color: #fee440;
      font-weight: 900;
      font-size: 10px;
      cursor: pointer;
      box-shadow: 0 0 12px rgba(254, 228, 64, 0.45);
      display: none;
    `;
    document.body.appendChild(btn);
    this.toggleBtn = btn;

    const evoOptionsHtml = EVOLUTION_FORMS.map(
      (f) =>
        `<option value="${f.stage}">${f.title} (Lv.${f.minLevel}+)</option>`,
    ).join("");

    const modal = document.createElement("div");
    modal.id = "admin-modal";
    modal.className = "modal-screen hidden";
    modal.style.zIndex = "10000";
    modal.innerHTML = `
      <div class="lobby-container" style="width: 500px; border: 2px solid #fee440;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 style="color:#fee440; font-size:18px;">👑 BẢNG ĐIỀU KHIỂN ADMIN (${maxStage} DẠNG • MAX LV.${MAX_PLAYER_LEVEL})</h2>
          <button type="button" id="btn-close-admin" class="btn-hud" style="border-color:#ff4d6d; color:#ff758f;">✖ Đóng</button>
        </div>

        <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; font-weight:800; color:#00f5d4;">1. CHỈNH CHỈ SỐ TÀI KHOẢN & BẢNG XẾP HẠNG</div>
          
          <label style="font-size:11px; color:#caf0f8; display:flex; justify-content:space-between; align-items:center;">
            <span>💎 Số Ngọc Huyền Bí:</span>
            <input type="number" id="adm-gems" class="lobby-input" style="width:160px; padding:6px;" />
          </label>

          <label style="font-size:11px; color:#caf0f8; display:flex; justify-content:space-between; align-items:center;">
            <span>🏆 Kỷ Lục Điểm (Top Server):</span>
            <input type="number" id="adm-highscore" class="lobby-input" style="width:160px; padding:6px;" />
          </label>

          <label style="font-size:11px; color:#caf0f8; display:flex; justify-content:space-between; align-items:center;">
            <span>🐉 Số Boss Leviathan Hạ:</span>
            <input type="number" id="adm-bosskills" class="lobby-input" style="width:160px; padding:6px;" />
          </label>

          <label style="font-size:11px; color:#caf0f8; display:flex; justify-content:space-between; align-items:center;">
            <span>⚔️ Số Mạng PvP Hạ:</span>
            <input type="number" id="adm-pvpkills" class="lobby-input" style="width:160px; padding:6px;" />
          </label>

          <button type="button" id="btn-adm-save-meta" class="btn-play" style="width:100%; padding:10px; font-size:13px; margin-top:4px;">
            💾 LƯU & ĐỒNG BỘ LÊN SERVER
          </button>
        </div>

        <div style="background:rgba(0,0,0,0.4); padding:12px; border-radius:12px; display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; font-weight:800; color:#ff758f;">2. CAN THIỆP TRỰC TIẾP TRONG TRẬN ĐẤU</div>
          
          <div style="display:flex; gap:6px;">
            <input type="number" id="adm-match-score" class="lobby-input" style="flex:1; padding:6px;" placeholder="Điểm trận (XP)..." />
            <button type="button" id="btn-adm-set-score" class="btn-hud" style="border-color:#00f5d4; color:#00f5d4;">Đặt Điểm</button>
          </div>

          <div style="display:flex; gap:6px;">
            <input type="number" id="adm-match-level" min="1" max="${MAX_PLAYER_LEVEL}" class="lobby-input" style="flex:1; padding:6px;" placeholder="Cấp độ (1 - ${MAX_PLAYER_LEVEL})..." />
            <button type="button" id="btn-adm-set-level" class="btn-hud" style="border-color:#fee440; color:#fee440;">Đặt Cấp</button>
          </div>

          <div style="display:flex; gap:6px;">
            <select id="adm-evo-select" class="lobby-input" style="flex:1; padding:6px; text-align:left;">
              ${evoOptionsHtml}
            </select>
            <button type="button" id="btn-adm-apply-evo" class="btn-hud" style="border-color:#ffbe0b; color:#ffbe0b;">Biến Hình</button>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:4px;">
            <button type="button" id="btn-adm-evolve" class="btn-hud">🧬 Max Dạng ${maxStage} (${maxForm.shortTitle})</button>
            <button type="button" id="btn-adm-godmode" class="btn-hud">🛡️ Bật/Tắt Bất Tử</button>
            <button type="button" id="btn-adm-heal" class="btn-hud">💖 Hồi Đầy Máu & 100% Nộ</button>
            <button type="button" id="btn-adm-size" class="btn-hud">🐋 Phóng To Khổng Lồ (+40)</button>
            <button type="button" id="btn-adm-spawn-boss" class="btn-hud" style="grid-column: span 2; border-color:#ff006e; color:#ff758f;">
              🐉 Triệu Hồi Siêu Boss Leviathan
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.panelEl = modal;
  }

  bindEvents() {
    eventBus.on("AUTH_STATE_CHANGED", (user) => {
      const email = user?.email?.toLowerCase() || "";
      this.isAdmin = ADMIN_EMAILS.includes(email);
      this.toggleBtn.style.display = this.isAdmin ? "block" : "none";
      if (!this.isAdmin) this.panelEl.classList.add("hidden");
    });

    this.toggleBtn.addEventListener("click", () => this.toggle());

    window.addEventListener("keydown", (e) => {
      if (this.isAdmin && e.code === "F2") {
        e.preventDefault();
        this.toggle();
      }
    });

    document.getElementById("btn-close-admin").addEventListener("click", () => {
      this.panelEl.classList.add("hidden");
    });

    document
      .getElementById("btn-adm-save-meta")
      .addEventListener("click", () => {
        if (!this.isAdmin) return;
        storage.data.gems = Math.max(
          0,
          Number(document.getElementById("adm-gems").value) || 0,
        );
        storage.data.highScore = Math.max(
          0,
          Number(document.getElementById("adm-highscore").value) || 0,
        );
        storage.data.bossKills = Math.max(
          0,
          Number(document.getElementById("adm-bosskills").value) || 0,
        );
        storage.data.pvpKills = Math.max(
          0,
          Number(document.getElementById("adm-pvpkills").value) || 0,
        );
        storage.save();
        alert("✅ Đã cập nhật chỉ số Admin lên Firebase!");
      });

    document
      .getElementById("btn-adm-set-score")
      .addEventListener("click", () => {
        const p = this.getPlayerFn();
        if (!this.isAdmin || !p)
          return alert("Bạn cần vào trong phòng chơi trước!");
        const val = Math.max(
          0,
          Number(document.getElementById("adm-match-score").value) || 0,
        );
        p.score = val;
        p.recalculateRadius();
        if (val > storage.data.highScore) {
          storage.data.highScore = val;
          storage.save();
        }
        eventBus.emit("FORCE_SYNC_PLAYER");
      });

    document
      .getElementById("btn-adm-set-level")
      .addEventListener("click", () => {
        const p = this.getPlayerFn();
        if (!this.isAdmin || !p)
          return alert("Bạn cần vào trong phòng chơi trước!");
        const lvl = Math.min(
          MAX_PLAYER_LEVEL,
          Math.max(
            1,
            Number(document.getElementById("adm-match-level").value) || 1,
          ),
        );
        p.setLevel(lvl, this.particleSystem, this.camera);
        document.getElementById("adm-evo-select").value = String(p.evoStage);
      });

    document
      .getElementById("btn-adm-apply-evo")
      .addEventListener("click", () => {
        const p = this.getPlayerFn();
        if (!this.isAdmin || !p)
          return alert("Bạn cần vào trong phòng chơi trước!");
        const targetStage = Number(
          document.getElementById("adm-evo-select").value,
        );
        p.setEvoStage(targetStage, this.particleSystem, this.camera, false);
      });

    document.getElementById("btn-adm-evolve").addEventListener("click", () => {
      const p = this.getPlayerFn();
      if (!this.isAdmin || !p)
        return alert("Bạn cần vào trong phòng chơi trước!");
      const maxStage = EVOLUTION_FORMS.length;
      p.setEvoStage(maxStage, this.particleSystem, this.camera, false);
      document.getElementById("adm-evo-select").value = String(maxStage);
    });

    document.getElementById("btn-adm-godmode").addEventListener("click", () => {
      const p = this.getPlayerFn();
      if (!this.isAdmin || !p)
        return alert("Bạn cần vào trong phòng chơi trước!");
      p.invincibleTimer = p.invincibleTimer > 10 ? 0 : 9999;
      eventBus.emit("FORCE_SYNC_PLAYER");
      alert(
        p.invincibleTimer > 10
          ? "🛡️ Đã BẬT chế độ Bất Tử!"
          : "🛡️ Đã TẮT chế độ Bất Tử!",
      );
    });

    document.getElementById("btn-adm-heal").addEventListener("click", () => {
      const p = this.getPlayerFn();
      if (!this.isAdmin || !p)
        return alert("Bạn cần vào trong phòng chơi trước!");
      p.hp = p.maxHp;
      p.stamina = p.maxStamina;
      p.rage = 100;
      eventBus.emit("FORCE_SYNC_PLAYER");
    });

    document.getElementById("btn-adm-size").addEventListener("click", () => {
      const p = this.getPlayerFn();
      if (!this.isAdmin || !p)
        return alert("Bạn cần vào trong phòng chơi trước!");
      p.adminSizeBonus = Math.min(180, (p.adminSizeBonus || 0) + 40);
      p.recalculateRadius();
      eventBus.emit("FORCE_SYNC_PLAYER");
    });

    document
      .getElementById("btn-adm-spawn-boss")
      .addEventListener("click", () => {
        const p = this.getPlayerFn();
        if (!this.isAdmin || !p)
          return alert("Bạn cần vào trong phòng chơi trước!");
        eventBus.emit("ADMIN_SPAWN_BOSS");
        this.panelEl.classList.add("hidden");
      });
  }

  toggle() {
    if (!this.isAdmin) return;
    const isHidden = this.panelEl.classList.contains("hidden");
    if (isHidden) {
      document.getElementById("adm-gems").value = storage.data.gems;
      document.getElementById("adm-highscore").value = storage.data.highScore;
      document.getElementById("adm-bosskills").value = storage.data.bossKills;
      document.getElementById("adm-pvpkills").value =
        storage.data.pvpKills || 0;
      const p = this.getPlayerFn();
      document.getElementById("adm-match-score").value = p ? p.score : 0;
      document.getElementById("adm-match-level").value = p ? p.level : 1;
      if (p) {
        document.getElementById("adm-evo-select").value = String(p.evoStage);
      }
      this.panelEl.classList.remove("hidden");
    } else {
      this.panelEl.classList.add("hidden");
    }
  }
}

