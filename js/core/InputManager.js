import { eventBus } from "./EventBus.js";
import { sound } from "./SoundSystem.js";
import { settings } from "./SettingsManager.js";

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.isMouseDown = false;
    this.isSpaceDown = false;
    this.isTouchBoost = false;

    this.joystick = {
      active: false,
      touchId: null,
      dx: 0,
      dy: 0,
      force: 0,
    };

    this.bindEvents();
  }

  get wantsBoost() {
    return this.isMouseDown || this.isSpaceDown || this.isTouchBoost;
  }

  get isClickMoveMode() {
    return (
      !settings.isMobileDevice || settings.data.mobileControlMode === "click"
    );
  }

  bindEvents() {
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("dragstart", (e) => e.preventDefault());

    window.addEventListener("blur", () => {
      this.isMouseDown = false;
      this.isSpaceDown = false;
      this.isTouchBoost = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (this.joystick.active) return;
      this.x = e.clientX;
      this.y = e.clientY;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        e.preventDefault();
        this.isMouseDown = true;
        sound.resume();
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.isMouseDown = false;
    });

    window.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      if (e.code === "Enter") {
        e.preventDefault();
        eventBus.emit("FOCUS_CHAT");
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        this.isSpaceDown = true;
        sound.resume();
      }
      if (e.code === "KeyE") eventBus.emit("INPUT_SKILL");
      if (e.code === "KeyR") eventBus.emit("INPUT_ULTIMATE");
      if (e.code === "Digit1") eventBus.emit("USE_BAG_SLOT", 0);
      if (e.code === "Digit2") eventBus.emit("USE_BAG_SLOT", 1);
      if (e.code === "Digit3") eventBus.emit("USE_BAG_SLOT", 2);
      if (e.code === "Escape") eventBus.emit("INPUT_PAUSE");
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") this.isSpaceDown = false;
    });

    this.bindVirtualJoystick();

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (!this.isClickMoveMode || this.joystick.active) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        this.x = touch.clientX;
        this.y = touch.clientY;
        sound.resume();
      },
      { passive: true },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (!this.isClickMoveMode || this.joystick.active) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        this.x = touch.clientX;
        this.y = touch.clientY;
      },
      { passive: true },
    );

    const mobileBoostBtn = document.getElementById("mobile-boost-btn");
    if (mobileBoostBtn) {
      mobileBoostBtn.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.isTouchBoost = true;
          mobileBoostBtn.classList.add("active");
          sound.resume();
        },
        { passive: false },
      );
      mobileBoostBtn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.isTouchBoost = false;
          mobileBoostBtn.classList.remove("active");
        },
        { passive: false },
      );
      mobileBoostBtn.addEventListener("touchcancel", () => {
        this.isTouchBoost = false;
        mobileBoostBtn.classList.remove("active");
      });
    }
  }

  bindVirtualJoystick() {
    const zone = document.getElementById("mobile-joystick-zone");
    const base = document.getElementById("mobile-joystick-base");
    const stick = document.getElementById("mobile-joystick-stick");
    if (!zone || !base || !stick) return;

    const maxDist = 42;

    const updateStickFromTouch = (touch) => {
      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = touch.clientX - centerX;
      const rawDy = touch.clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(maxDist, dist);
      const angle = Math.atan2(rawDy, rawDx);

      const offsetX = Math.cos(angle) * clampedDist;
      const offsetY = Math.sin(angle) * clampedDist;

      stick.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;

      if (dist > 6) {
        this.joystick.dx = Math.cos(angle);
        this.joystick.dy = Math.sin(angle);
        this.joystick.force = Math.min(1, clampedDist / maxDist);
      } else {
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        this.joystick.force = 0;
      }
    };

    const resetStick = () => {
      this.joystick.active = false;
      this.joystick.touchId = null;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
      this.joystick.force = 0;
      stick.style.transform = "translate(-50%, -50%)";
      base.classList.remove("active");
    };

    zone.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.joystick.active) return;
        const touch = e.changedTouches[0];
        if (!touch) return;

        this.joystick.active = true;
        this.joystick.touchId = touch.identifier;
        base.classList.add("active");
        sound.resume();
        updateStickFromTouch(touch);
      },
      { passive: false },
    );

    zone.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.joystick.active) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.joystick.touchId) {
            updateStickFromTouch(t);
            break;
          }
        }
      },
      { passive: false },
    );

    zone.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystick.touchId) {
            resetStick();
            break;
          }
        }
      },
      { passive: false },
    );

    zone.addEventListener("touchcancel", resetStick);
  }
}
