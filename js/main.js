import { WORLD_SIZE, MAP_CONFIG } from "./data/mapsConfig.js";
import { createInitialQuests } from "./data/questsData.js";
import { eventBus } from "./core/EventBus.js";
import { storage } from "./core/StorageManager.js";
import { sound } from "./core/SoundSystem.js";
import { settings } from "./core/SettingsManager.js";
import { Camera } from "./core/Camera.js";
import { InputManager } from "./core/InputManager.js";
import { WorldRenderer } from "./graphics/WorldRenderer.js";
import { ParticleSystem } from "./graphics/ParticleSystem.js";
import {
  drawOffscreenThreatIndicators,
  drawMinimap,
} from "./graphics/MinimapRenderer.js";
import { Player } from "./entities/Player.js";
import { EnemyBot } from "./entities/EnemyBot.js";
import { BossLeviathan } from "./entities/BossLeviathan.js";
import { Pearl } from "./entities/Pickups.js";
import { triggerPlayerSkill } from "./systems/SkillSystem.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { PassiveAndAugmentSystem } from "./systems/PassiveAndAugmentSystem.js";
import { RoomSync } from "./network/RoomSync.js";
import { UIManager } from "./ui/UIManager.js";
import { AdminPanel } from "./ui/AdminPanel.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const miniCanvas = document.getElementById("minimapCanvas");
const miniCtx = miniCanvas.getContext("2d");

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);
window.addEventListener("resize", () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

const camera = new Camera();
const input = new InputManager(canvas);
const worldRenderer = new WorldRenderer();
const particleSystem = new ParticleSystem();
const combatSystem = new CombatSystem();
const passiveAndAugmentSystem = new PassiveAndAugmentSystem();
const roomSync = new RoomSync();
const ui = new UIManager();
const adminPanel = new AdminPanel(() => player, particleSystem, camera);

settings.applyToDOM();

let gameState = "AUTH";
let selectedSpecies = "fish";
let selectedMap = "coral";
let selectedGameMode = "classic";
let selectedRoomId = "PUBLIC";

let player = null;
let boss = null;
let bossSpawned = false;
let enemies = [];
let pearls = [];
let meatChunks = [];
let quests = [];

let survivalTime = 0;
let hitStopTimer = 0;
let zoneRadius = WORLD_SIZE * 0.75;
let worldEvent = null;
let nextEventTimer = 45;
let lbUpdateTimer = 0;
let autoSaveTimer = 0;
let lastTime = 0;

function updateQuestProgress(id, amount = 1) {
  let changed = false;
  quests.forEach((q) => {
    if (q.id === id && !q.done) {
      q.current = Math.min(q.target, q.current + amount);
      if (q.current >= q.target) {
        q.done = true;
        if (player) {
          player.evolveNextStage(particleSystem, camera);
          if (q.xpBonus) {
            player.addScore(
              q.xpBonus,
              worldEvent,
              selectedMap,
              particleSystem,
              camera,
            );
          }
        }
      }
      changed = true;
    }
  });
  if (changed) ui.renderQuests(quests);
}

function triggerRandomWorldEvent() {
  const events = [
    {
      type: "pearl_rain",
      name: "🌠 MƯA SAO BĂNG NGỌC TRAI! (+18 Ngọc Trai)",
      duration: 25,
    },
    {
      type: "bloodmoon",
      name: "🌕 THỦY TRIỀU ĐỎ! (NHÂN ĐÔI XP trong 25s)",
      duration: 25,
    },
    {
      type: "storm",
      name: "🌀 BÃO NGẦM ĐẠI DƯƠNG! (Hải lưu cuốn mạnh)",
      duration: 20,
    },
  ];
  const ev = events[Math.floor(Math.random() * events.length)];
  worldEvent = { ...ev, timer: ev.duration };
  ui.showEventBanner(ev.name, 5000);
  if (ev.type === "pearl_rain") {
    for (let i = 0; i < 18; i++) pearls.push(new Pearl());
  }
}

function startGame() {
  if (!storage.currentUser) {
    alert("Vui lòng đăng nhập tài khoản trước khi vào chơi!");
    return;
  }

  sound.resume();
  const inputName = document.getElementById("player-name-input").value.trim();
  const inputRoom = document
    .getElementById("room-id-input")
    .value.trim()
    .toUpperCase();
  const playerName = inputName || "Thủy Quái Chúa";
  selectedRoomId = inputRoom || "PUBLIC";
  selectedGameMode = document.getElementById("gamemode-select").value;

  const savedRun = storage.getSpeciesRun(selectedSpecies);

  worldRenderer.build(selectedMap);

  player = new Player(
    playerName,
    selectedSpecies,
    storage.data.upgrades,
    selectedMap,
    savedRun,
  );
  camera.reset(player.x, player.y);

  ui.initMatchHUD(selectedSpecies, selectedRoomId, player);

  if (savedRun && savedRun.score > 0) {
    ui.showEventBanner(
      `💾 KHÔI PHỤC ${player.cfg.name.toUpperCase()} (Lv.${player.level} • ${player.score} XP)!`,
      4000,
    );
  }

  boss = null;
  bossSpawned = false;
  zoneRadius = WORLD_SIZE * 0.72;
  worldEvent = null;
  nextEventTimer = 35;
  survivalTime = 0;
  lbUpdateTimer = 0;
  autoSaveTimer = 0;

  enemies = [];
  const totalEnemies = MAP_CONFIG[selectedMap].enemyCount;
  for (let i = 0; i < totalEnemies; i++) {
    const e = new EnemyBot(player.radius);
    if (Math.hypot(e.x - player.x, e.y - player.y) < 420) e.x += 550;
    enemies.push(e);
  }

  pearls = [];
  for (let i = 0; i < 22; i++) pearls.push(new Pearl());
  meatChunks = [];
  particleSystem.clear();
  combatSystem.reset();
  passiveAndAugmentSystem.clear();

  quests = createInitialQuests();
  if (savedRun && Array.isArray(savedRun.quests)) {
    savedRun.quests.forEach((sq) => {
      const targetQ = quests.find((q) => q.id === sq.id);
      if (targetQ) {
        targetQ.current = sq.current || 0;
        targetQ.done = !!sq.done;
      }
    });
  }
  ui.renderQuests(quests);

  gameState = "PLAYING";

  roomSync.joinRoom(
    selectedRoomId,
    selectedMap,
    () => player,
    () => gameState,
  );
}

function triggerGameOver(killerName = "") {
  if (gameState === "GAMEOVER") return;
  gameState = "GAMEOVER";
  roomSync.leaveRoom();

  const earnedGems = Math.floor(player.score / 25) + player.evoStage * 20;
  storage.data.gems += earnedGems;
  if (player.score > storage.data.highScore) {
    storage.data.highScore = player.score;
  }

  storage.clearSpeciesRun(player.species);

  ui.showGameOver(
    player,
    killerName,
    combatSystem.fishEatenCount,
    survivalTime,
    earnedGems,
  );
}

function togglePause() {
  if (gameState === "PLAYING") {
    gameState = "PAUSED";
    if (player) {
      storage.saveSpeciesRun(player, quests);
      ui.renderPauseBuildDetails(player);
    }
    ui.dom.pauseScreen.classList.remove("hidden");
  } else if (gameState === "PAUSED") {
    gameState = "PLAYING";
    ui.dom.pauseScreen.classList.add("hidden");
  }
}

eventBus.on("AUTH_STATE_CHANGED", (user) => {
  if (user) {
    if (gameState === "AUTH") gameState = "LOBBY";
  } else {
    roomSync.leaveRoom();
    player = null;
    gameState = "AUTH";
  }
});

eventBus.on("HIT_STOP", (duration) => {
  hitStopTimer = duration;
});

eventBus.on("PLAYER_DIED", (killerName) => {
  triggerGameOver(killerName);
});

// TIẾN HÓA MỖI DẠNG: Kích hoạt Nội Tại ở Dạng 2, 4, 6, 8 + Mở chọn Lõi Siêu Cấp
eventBus.on("PLAYER_EVOLVED", ({ stage }) => {
  if (player) {
    storage.saveSpeciesRun(player, quests);
    ui.renderAugmentAndPassiveHUD(player);

    if ([2, 4, 6, 8].includes(stage) && gameState === "PLAYING") {
      gameState = "UPGRADE";
      ui.enqueueAugment("super", player, particleSystem, () => {
        if (player) storage.saveSpeciesRun(player, quests);
        if (gameState === "UPGRADE") gameState = "PLAYING";
      });
    }
  }

  if (stage >= 3 && !bossSpawned) {
    bossSpawned = true;
    boss = new BossLeviathan(player ? player.radius : 60);
    ui.showEventBanner("⚠️ THỦY QUÁI LEVIATHAN ĐÃ THỨC TỈNH!", 5000);
    camera.shake = 20;
  }
});

eventBus.on("ADMIN_SPAWN_BOSS", () => {
  if (!player) return;
  bossSpawned = true;
  boss = new BossLeviathan(player.radius);
  boss.x = Math.min(WORLD_SIZE - 300, player.x + 420);
  boss.y = player.y;
  ui.showEventBanner("👑 ADMIN ĐÃ TRIỆU HỒI LEVIATHAN CHÚA TỂ!", 5000);
  camera.shake = 22;
});

// MỖI 2 CẤP ĐỘ: Mở chọn 1 Lõi Thường cộng dồn chỉ số
eventBus.on("PLAYER_LEVEL_UP", (level) => {
  if (player) storage.saveSpeciesRun(player, quests);
  if (level % 2 === 0 && player && gameState !== "GAMEOVER") {
    gameState = "UPGRADE";
    ui.enqueueAugment("common", player, particleSystem, () => {
      if (player) storage.saveSpeciesRun(player, quests);
      if (gameState === "UPGRADE") gameState = "PLAYING";
    });
  }
});

eventBus.on("BOSS_KILLED", () => {
  boss = null;
  bossSpawned = false;
  if (player) storage.saveSpeciesRun(player, quests);
});

eventBus.on("QUEST_PROGRESS", ({ id, amount }) => {
  updateQuestProgress(id, amount);
  if (id === "q2_pearls" && quests.find((q) => q.id === "q2_pearls")?.done) {
    updateQuestProgress("q4_pearls_master", amount);
  }
  if (
    id === "q2_pearls" &&
    quests.find((q) => q.id === "q4_pearls_master")?.done
  ) {
    updateQuestProgress("q7_supreme", amount);
  }
});

eventBus.on("ENEMY_EATEN", () => {
  updateQuestProgress("q1_hunt", 1);
  if (quests.find((q) => q.id === "q1_hunt")?.done) {
    updateQuestProgress("q3_apex", 1);
  }
  if (quests.find((q) => q.id === "q3_apex")?.done) {
    updateQuestProgress("q5_slayer", 1);
  }
  if (quests.find((q) => q.id === "q5_slayer")?.done) {
    updateQuestProgress("q6_god_hunt", 1);
  }
});

eventBus.on("SKILL_USED_FOR_QUEST", () => {
  if (quests[0]?.done && quests[1]?.done) {
    updateQuestProgress("q3_apex", 1);
  }
});

eventBus.on("INPUT_SKILL", () => {
  if (gameState === "PLAYING" && player) {
    triggerPlayerSkill(player, {
      enemies,
      remotePlayers: roomSync.remotePlayers,
      particleSystem,
      camera,
    });
  }
});

eventBus.on("INPUT_ULTIMATE", () => {
  if (gameState === "PLAYING" && player) {
    player.useUltimate(particleSystem, camera);
  }
});

eventBus.on("INPUT_PAUSE", togglePause);

eventBus.on("LOCAL_PLAYER_HIT", (hit) => {
  if (player && gameState === "PLAYING") {
    player.takeDamage(
      hit.dmg || 25,
      hit.fromX,
      hit.fromY,
      hit.attackerName || "Người Chơi Khác",
      particleSystem,
      camera,
    );
  }
});

eventBus.on("REMOTE_SKILL_EFFECT", (sk) => {
  particleSystem.addShockwave(
    sk.x,
    sk.y,
    sk.maxR || 150,
    sk.color || "#00f5d4",
  );
});

eventBus.on("REMOTE_DMG_POPUP", (sk) => {
  const txt = sk.isCrit ? `⚡ -${sk.dmg}!` : `💥 -${sk.dmg}`;
  particleSystem.addFloatingText(
    sk.x,
    sk.y - 25,
    txt,
    sk.isCrit ? "#fee440" : "#ff4d6d",
  );
});

document.querySelectorAll("#species-selector .card-option").forEach((card) => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll("#species-selector .card-option")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    selectedSpecies = card.dataset.species;
  });
});

document.querySelectorAll("#map-selector .card-option").forEach((card) => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll("#map-selector .card-option")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    selectedMap = card.dataset.map;
  });
});

document.querySelectorAll("#emote-bar .emote-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!player || gameState !== "PLAYING") return;
    const emoji = btn.dataset.emote;
    player.emote = emoji;
    player.emoteTimer = 2.8;
    eventBus.emit("EMOTE_BROADCAST", emoji);
  });
});

document.getElementById("skill-box").addEventListener("click", () => {
  eventBus.emit("INPUT_SKILL");
});
document.getElementById("ult-box").addEventListener("click", () => {
  eventBus.emit("INPUT_ULTIMATE");
});
document.getElementById("btn-pause").addEventListener("click", togglePause);
document.getElementById("btn-resume").addEventListener("click", togglePause);

document.getElementById("btn-quit-lobby").addEventListener("click", () => {
  if (player && player.hp > 0) {
    storage.saveSpeciesRun(player, quests);
  }
  roomSync.leaveRoom();
  player = null;
  ui.dom.pauseScreen.classList.add("hidden");
  ui.dom.lobbyScreen.classList.remove("hidden");
  gameState = "LOBBY";
});

document.getElementById("btn-mute").addEventListener("click", (e) => {
  const isMuted = sound.toggleMute();
  e.target.innerText = isMuted ? "🔇" : "🔊";
});

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", () => {
  ui.dom.gameoverScreen.classList.add("hidden");
  ui.dom.lobbyScreen.classList.remove("hidden");
  gameState = "LOBBY";
});

window.addEventListener("beforeunload", () => {
  if (player && player.hp > 0 && gameState !== "GAMEOVER") {
    storage.saveSpeciesRun(player, quests);
  }
  roomSync.leaveRoom();
});

function gameLoop(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;

  if (gameState === "PAUSED" || gameState === "UPGRADE") {
    requestAnimationFrame(gameLoop);
    return;
  }

  if (hitStopTimer > 0) {
    hitStopTimer -= dt;
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameState === "PLAYING") {
    survivalTime += dt;

    autoSaveTimer += dt;
    if (autoSaveTimer >= 15 && player && player.hp > 0) {
      storage.saveSpeciesRun(player, quests);
      autoSaveTimer = 0;
    }

    if (selectedGameMode === "royale" && zoneRadius > 550) {
      zoneRadius -= 11 * dt;
    }

    nextEventTimer -= dt;
    if (nextEventTimer <= 0) {
      triggerRandomWorldEvent();
      nextEventTimer = 55;
    }
    if (worldEvent) {
      worldEvent.timer -= dt;
      if (worldEvent.timer <= 0) worldEvent = null;
    }
  }

  ctx.clearRect(0, 0, width, height);

  if (gameState === "PLAYING" && player) {
    player.update(dt, {
      input,
      camera,
      width,
      height,
      mapProps: worldRenderer.mapProps,
      worldEvent,
      selectedGameMode,
      selectedMap,
      zoneRadius,
      particleSystem,
    });
    passiveAndAugmentSystem.update(dt, {
      player,
      enemies,
      remotePlayers: roomSync.remotePlayers,
      boss,
      pearls,
      particleSystem,
      camera,
      input,
    });
    camera.follow(player, width, height, selectedMap);
    ui.updateHUD(player, survivalTime);
  }

  ctx.save();
  camera.applyTransform(ctx, width, height);

  worldRenderer.draw(
    ctx,
    {
      selectedMap,
      selectedGameMode,
      zoneRadius,
      worldEvent,
      camera,
      width,
      height,
      player,
      particleSystem,
    },
    time,
    dt,
  );

  passiveAndAugmentSystem.drawWorldEffects(ctx);

  if (Math.random() < 0.25) {
    particleSystem.addParticle(
      camera.x + (Math.random() - 0.5) * (width / camera.zoom),
      camera.y + (height / camera.zoom) * 0.5,
      "#fff",
      0,
      Math.random() * 4 + 2,
      true,
    );
  }

  pearls.forEach((p) => p.draw(ctx));
  meatChunks.forEach((m) => m.draw(ctx));

  if (boss && gameState === "PLAYING" && player) {
    boss.update(player, dt);
    boss.draw(ctx, time, true);
    boss.drawBossBar(ctx);
  }

  const targetCount = MAP_CONFIG[selectedMap].enemyCount;
  if (enemies.length < targetCount) {
    enemies.push(new EnemyBot(player ? player.radius : 21));
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update(
      player || { x: -9999, y: -9999, radius: 21 },
      dt,
      gameState,
      worldEvent,
    );

    if (
      Math.abs(e.x - camera.x) < (width / camera.zoom) * 0.78 &&
      Math.abs(e.y - camera.y) < (height / camera.zoom) * 0.78
    ) {
      const isDanger =
        player && e.radius > player.radius * 1.05 && player.ultTimer <= 0;
      e.draw(ctx, time, isDanger);
    }
  }

  Object.values(roomSync.remotePlayers).forEach((rp) => {
    rp.update(dt);
    const isDanger =
      player && rp.radius > player.radius * 1.08 && player.ultTimer <= 0;
    rp.draw(ctx, time, isDanger);
  });

  if (gameState === "PLAYING" && player) {
    combatSystem.update(dt, {
      player,
      pearls,
      meatChunks,
      enemies,
      remotePlayers: roomSync.remotePlayers,
      boss,
      particleSystem,
      camera,
      worldEvent,
      selectedMap,
      time,
    });
    player.draw(ctx, time, false);
  }

  particleSystem.updateAndDraw(ctx);
  ctx.restore();

  if (gameState === "PLAYING") {
    drawOffscreenThreatIndicators(ctx, {
      player,
      enemies,
      remotePlayers: roomSync.remotePlayers,
      camera,
      width,
      height,
    });
    drawMinimap(miniCtx, {
      player,
      enemies,
      pearls,
      boss,
      remotePlayers: roomSync.remotePlayers,
      selectedGameMode,
      zoneRadius,
    });

    lbUpdateTimer += dt;
    if (lbUpdateTimer >= 0.5) {
      ui.updateLeaderboard(player, roomSync.remotePlayers, boss, survivalTime);
      lbUpdateTimer = 0;
    }
  }

  requestAnimationFrame(gameLoop);
}

worldRenderer.build(selectedMap);
requestAnimationFrame(gameLoop);
