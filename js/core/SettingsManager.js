import { eventBus } from "./EventBus.js";
import {
  BOSS_SKILL_CORES,
  ALL_BOSS_SKILL_IDS,
} from "../data/bossSkillsData.js";

const SETTINGS_KEY = "ocean_odyssey_settings_v5";

export const PROTECTED_NATIVE_KEYS = new Set([
  "KeyE",
  "KeyQ",
  "KeyR",
  "Space",
  "Digit1",
  "Digit2",
  "Digit3",
  "Enter",
  "NumpadEnter",
  "Escape",
  "F2",
]);

const DEFAULT_KEYBINDS = {};
ALL_BOSS_SKILL_IDS.forEach((id) => {
  DEFAULT_KEYBINDS[id] = BOSS_SKILL_CORES[id].defaultKey;
});

const DEFAULT_SETTINGS = {
  sfxVolume: 0.8,
  muted: false,
  particleQuality: "high",
  screenShake: true,
  showFloatingText: true,
  mouseSensitivity: 1.0,
  mobileControlMode: "joystick",
  mobileButtonScale: 1.0,
  hudOpacity: 0.95,
  keybinds: { ...DEFAULT_KEYBINDS },
};

export class SettingsManager {
  constructor() {
    this.isMobileDevice = this.detectMobile();
    this.data = this.load();
  }

  detectMobile() {
    return (
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      navigator.maxTouchPoints > 0
    );
  }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        keybinds: {
          ...DEFAULT_KEYBINDS,
          ...(parsed.keybinds || {}),
        },
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.data));
    } catch {}
    this.applyToDOM();
    eventBus.emit("SETTINGS_CHANGED", this.data);
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  getKeybind(skillId) {
    return (
      this.data?.keybinds?.[skillId] ||
      BOSS_SKILL_CORES[skillId]?.defaultKey ||
      ""
    );
  }

  setSkillKeybind(skillId, code) {
    if (!code || PROTECTED_NATIVE_KEYS.has(code)) {
      return {
        ok: false,
        reason: "PROTECTED",
        msg: "❌ Phím này thuộc bộ điều khiển / Skill gốc (E, Q, R, Space, 1-3) nên không thể gán đè!",
      };
    }

    const existingOwner = ALL_BOSS_SKILL_IDS.find(
      (id) => id !== skillId && this.getKeybind(id) === code,
    );
    if (existingOwner) {
      const ownerName =
        BOSS_SKILL_CORES[existingOwner]?.shortName || existingOwner;
      return {
        ok: false,
        reason: "DUPLICATE",
        msg: `❌ Phím này đang được gán cho [${ownerName}]. Vui lòng chọn phím khác!`,
      };
    }

    if (!this.data.keybinds) this.data.keybinds = { ...DEFAULT_KEYBINDS };
    this.data.keybinds[skillId] = code;
    this.save();
    return { ok: true };
  }

  resetKeybinds() {
    this.data.keybinds = { ...DEFAULT_KEYBINDS };
    this.save();
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
  }

  applyToDOM() {
    const uiLayer = document.getElementById("ui-layer");
    if (uiLayer) {
      uiLayer.style.opacity = String(this.data.hudOpacity ?? 0.95);
    }

    const joystickZone = document.getElementById("mobile-joystick-zone");
    const actionCluster = document.querySelector(".action-cluster-right");
    const scale = this.data.mobileButtonScale || 1.0;
    const isSmallScreen =
      this.isMobileDevice ||
      window.innerWidth <= 950 ||
      window.innerHeight <= 520;

    if (joystickZone) {
      if (isSmallScreen && this.data.mobileControlMode === "click") {
        joystickZone.style.display = "none";
      } else if (isSmallScreen) {
        joystickZone.style.display = "flex";
        joystickZone.style.transform = `scale(${scale})`;
        joystickZone.style.transformOrigin = "bottom left";
      }
    }

    if (actionCluster && isSmallScreen) {
      actionCluster.style.transform = `scale(${scale})`;
      actionCluster.style.transformOrigin = "bottom right";
    }
  }
}

export const settings = new SettingsManager();
