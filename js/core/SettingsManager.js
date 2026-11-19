import { eventBus } from "./EventBus.js";

const SETTINGS_KEY = "ocean_odyssey_settings_v3";

const DEFAULT_SETTINGS = {
  sfxVolume: 0.8,
  muted: false,
  particleQuality: "high", // "high" | "medium" | "low"
  screenShake: true,
  showFloatingText: true,
  mouseSensitivity: 1.0,
  mobileControlMode: "joystick", // "joystick" (Mặc định) | "click"
  mobileButtonScale: 1.0,
  hudOpacity: 0.95,
};

export class SettingsManager {
  constructor() {
    this.isMobileDevice = this.detectMobile();
    this.data = this.load();
  }

  detectMobile() {
    return (
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
  }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
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

  reset() {
    this.data = { ...DEFAULT_SETTINGS };
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

    if (joystickZone) {
      if (this.isMobileDevice && this.data.mobileControlMode === "click") {
        joystickZone.style.display = "none";
      } else if (this.isMobileDevice) {
        joystickZone.style.display = "flex";
        joystickZone.style.transform = `scale(${scale})`;
        joystickZone.style.transformOrigin = "bottom left";
      }
    }

    if (actionCluster && this.isMobileDevice) {
      actionCluster.style.transform = `scale(${scale})`;
      actionCluster.style.transformOrigin = "bottom right";
    }
  }
}

export const settings = new SettingsManager();
