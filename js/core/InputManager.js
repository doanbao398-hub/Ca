import { eventBus } from "./EventBus.js";

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.isDown = false;
    this.mobileBoost = false;

    this.bindEvents();
  }

  get wantsBoost() {
    return this.isDown || this.mobileBoost;
  }

  bindEvents() {
    window.addEventListener("mousemove", (e) => {
      this.x = e.clientX;
      this.y = e.clientY;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.isDown = true;
      if (e.button === 2) eventBus.emit("INPUT_SKILL");
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.isDown = false;
    });

    window.addEventListener("blur", () => {
      this.isDown = false;
      this.mobileBoost = false;
    });

    window.addEventListener("contextmenu", (e) => e.preventDefault());

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        this.x = t.clientX;
        this.y = t.clientY;
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        const t = e.touches[0];
        this.x = t.clientX;
        this.y = t.clientY;
      },
      { passive: false }
    );

    const mobileBoostBtn = document.getElementById("mobile-boost-btn");
    if (mobileBoostBtn) {
      mobileBoostBtn.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.mobileBoost = true;
          mobileBoostBtn.classList.add("active");
        },
        { passive: false }
      );
      mobileBoostBtn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.mobileBoost = false;
          mobileBoostBtn.classList.remove("active");
        },
        { passive: false }
      );
    }

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") this.isDown = true;
      if (e.code === "KeyE") eventBus.emit("INPUT_SKILL");
      if (e.code === "KeyR") eventBus.emit("INPUT_ULTIMATE");
      if (e.code === "KeyP" || e.code === "Escape") eventBus.emit("INPUT_PAUSE");
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") this.isDown = false;
    });
  }
}
