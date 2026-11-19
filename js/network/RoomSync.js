import {
  ref,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onDisconnect,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db, myPlayerId, getServerNow } from "./FirebaseClient.js";
import { RemotePlayer } from "../entities/RemotePlayer.js";
import { eventBus } from "../core/EventBus.js";
import { EVOLUTION_FORMS } from "../data/evolutionTrees.js";

export class RoomSync {
  constructor() {
    this.currentRoomPath = null;
    this.myPlayerRef = null;
    this.syncInterval = null;
    this.unsubscribers = [];
    this.remotePlayers = {};
    this.getPlayerFn = null;
    this.getGameStateFn = null;

    this.bindBusEvents();
  }

  bindBusEvents() {
    eventBus.on("FORCE_SYNC_PLAYER", () => {
      if (this.getPlayerFn && this.getGameStateFn?.() === "PLAYING") {
        const p = this.getPlayerFn();
        if (p) this.pushPlayerState(p);
      }
    });

    eventBus.on("SKILL_BROADCAST", ({ x, y, maxR, color }) => {
      this.broadcastSkill(x, y, maxR, color);
    });

    eventBus.on("EMOTE_BROADCAST", (emoji) => {
      this.broadcastEmote(emoji);
    });

    eventBus.on("SEND_CHAT_MESSAGE", (text) => {
      this.sendChatMessage(text);
    });

    eventBus.on(
      "PVP_ATTACK",
      ({
        targetId,
        dmg,
        isCrit,
        fromX,
        fromY,
        attackerName,
        targetX,
        targetY,
      }) => {
        this.attackRemotePlayer(
          targetId,
          dmg,
          isCrit,
          fromX,
          fromY,
          attackerName,
          targetX,
          targetY,
        );
      },
    );
  }

  joinRoom(roomId, mapId, getPlayerFn, getGameStateFn) {
    this.leaveRoom();

    this.getPlayerFn = getPlayerFn;
    this.getGameStateFn = getGameStateFn;

    const cleanRoom =
      (roomId || "PUBLIC").toUpperCase().replace(/[^A-Z0-9_-]/g, "") ||
      "PUBLIC";
    this.currentRoomPath = `ocean_odyssey/rooms/${cleanRoom}_${mapId}`;
    this.myPlayerRef = ref(db, `${this.currentRoomPath}/players/${myPlayerId}`);

    onDisconnect(this.myPlayerRef).remove();

    const initialPlayer = getPlayerFn();
    if (initialPlayer) this.pushPlayerState(initialPlayer);

    this.syncInterval = setInterval(() => {
      const player = getPlayerFn();
      if (getGameStateFn() === "PLAYING" && player) {
        this.pushPlayerState(player);
      }
    }, 60);

    const joinTimestamp = getServerNow();

    // 1. Lắng nghe người chơi trong phòng
    const playersListRef = ref(db, `${this.currentRoomPath}/players`);
    const unsubPlayers = onValue(
      playersListRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const serverNow = getServerNow();
        let onlineCount = 0;

        Object.keys(this.remotePlayers).forEach((id) => {
          if (
            !data[id] ||
            (typeof data[id].lastSeen === "number" &&
              serverNow - data[id].lastSeen > 12000)
          ) {
            delete this.remotePlayers[id];
          }
        });

        Object.entries(data).forEach(([id, pData]) => {
          if (
            !pData ||
            typeof pData.x !== "number" ||
            typeof pData.y !== "number"
          ) {
            return;
          }
          if (
            typeof pData.lastSeen === "number" &&
            serverNow - pData.lastSeen > 12000
          ) {
            return;
          }

          onlineCount++;
          if (id === myPlayerId) return;

          if (!this.remotePlayers[id]) {
            this.remotePlayers[id] = new RemotePlayer(id, pData);
          } else {
            this.remotePlayers[id].syncFromNetwork(pData);
          }
        });

        eventBus.emit("ONLINE_COUNT_UPDATED", Math.max(1, onlineCount));
      },
      (error) => console.error("Lỗi đồng bộ Firebase:", error),
    );
    this.unsubscribers.push(unsubPlayers);

    // 2. Lắng nghe đòn đánh trúng mình
    const myHitsRef = ref(db, `${this.currentRoomPath}/hits/${myPlayerId}`);
    onDisconnect(myHitsRef).remove();
    const unsubHits = onChildAdded(myHitsRef, (snapshot) => {
      const hit = snapshot.val();
      if (hit && typeof hit.dmg === "number") {
        eventBus.emit("LOCAL_PLAYER_HIT", hit);
      }
      remove(snapshot.ref).catch(() => {});
    });
    this.unsubscribers.push(unsubHits);

    // 3. Lắng nghe sóng kỹ năng & hiệu ứng sát thương
    const skillsRef = ref(db, `${this.currentRoomPath}/skills`);
    const unsubSkills = onChildAdded(skillsRef, (snapshot) => {
      const sk = snapshot.val();
      if (
        !sk ||
        sk.sender === myPlayerId ||
        (typeof sk.ts === "number" && sk.ts < joinTimestamp - 3000)
      ) {
        return;
      }
      if (sk.type === "dmg_popup") {
        eventBus.emit("REMOTE_DMG_POPUP", sk);
      } else {
        eventBus.emit("REMOTE_SKILL_EFFECT", sk);
      }
    });
    this.unsubscribers.push(unsubSkills);

    // 4. Lắng nghe Emote
    const emotesRef = ref(db, `${this.currentRoomPath}/emotes`);
    const unsubEmotes = onChildAdded(emotesRef, (snapshot) => {
      const em = snapshot.val();
      if (
        !em ||
        em.sender === myPlayerId ||
        (typeof em.ts === "number" && em.ts < joinTimestamp - 3000)
      ) {
        return;
      }
      const rp = this.remotePlayers[em.sender];
      if (rp) {
        rp.emote = em.emoji;
        rp.emoteTimer = 2.8;
      }
    });
    this.unsubscribers.push(unsubEmotes);

    // 5. Lắng nghe Chat Phòng Multiplayer
    const chatRef = ref(db, `${this.currentRoomPath}/chat`);
    const unsubChat = onChildAdded(chatRef, (snapshot) => {
      const msg = snapshot.val();
      if (
        !msg ||
        !msg.text ||
        (typeof msg.ts === "number" && msg.ts < joinTimestamp - 5000)
      ) {
        return;
      }
      const isMe = msg.sender === myPlayerId;
      eventBus.emit("CHAT_MESSAGE_RECEIVED", {
        senderName: msg.senderName || "Thủy Quái",
        text: msg.text,
        isMe,
      });

      if (!isMe && this.remotePlayers[msg.sender]) {
        this.remotePlayers[msg.sender].setChatBubble(msg.text, 5.0);
      }
    });
    this.unsubscribers.push(unsubChat);
  }

  sendChatMessage(rawText) {
    if (!this.currentRoomPath || !this.getPlayerFn) return;
    const player = this.getPlayerFn();
    if (!player) return;

    const cleanText = String(rawText || "")
      .trim()
      .slice(0, 80);
    if (!cleanText) return;

    player.setChatBubble(cleanText, 5.0);

    const id =
      "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const msgRef = ref(db, `${this.currentRoomPath}/chat/${id}`);
    set(msgRef, {
      sender: myPlayerId,
      senderName: String(player.name || "Người Chơi").slice(0, 16),
      text: cleanText,
      ts: serverTimestamp(),
    }).catch(() => {});

    setTimeout(() => remove(msgRef).catch(() => {}), 15000);
  }

  pushPlayerState(p) {
    if (!this.myPlayerRef || !p) return;
    const maxStage = EVOLUTION_FORMS.length;
    const safeRadius = Math.min(350, Math.max(10, Math.round(p.radius)));
    update(this.myPlayerRef, {
      name: String(p.name || "Người Chơi").slice(0, 16),
      x: Math.round(p.x),
      y: Math.round(p.y),
      angle: Number(p.angle.toFixed(2)),
      radius: safeRadius,
      species: p.species,
      evoStage: Math.min(maxStage, Math.max(1, p.evoStage)),
      level: Math.max(1, Math.round(p.level || 1)),
      score: Math.max(0, Math.round(p.score)),
      hp: Math.max(0, Math.ceil(p.hp)),
      maxHp: Math.max(1, Math.round(p.maxHp)),
      bounty: p.bounty || 0,
      isStealthed: !!p.isStealthed,
      invincible: p.invincibleTimer > 0,
      ult: p.ultTimer > 0,
      lastSeen: serverTimestamp(),
    }).catch(() => {});
  }

  broadcastSkill(x, y, maxR, color) {
    if (!this.currentRoomPath) return;
    const id =
      "sk_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const skRef = ref(db, `${this.currentRoomPath}/skills/${id}`);
    set(skRef, {
      type: "wave",
      sender: myPlayerId,
      x: Math.round(x),
      y: Math.round(y),
      maxR: Math.round(maxR),
      color,
      ts: serverTimestamp(),
    }).catch(() => {});
    setTimeout(() => remove(skRef).catch(() => {}), 2000);
  }

  broadcastEmote(emoji) {
    if (!this.currentRoomPath) return;
    const id =
      "em_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const emRef = ref(db, `${this.currentRoomPath}/emotes/${id}`);
    set(emRef, {
      sender: myPlayerId,
      emoji,
      ts: serverTimestamp(),
    }).catch(() => {});
    setTimeout(() => remove(emRef).catch(() => {}), 2500);
  }

  attackRemotePlayer(
    targetId,
    dmg,
    isCrit,
    fromX,
    fromY,
    attackerName,
    targetX,
    targetY,
  ) {
    if (!this.currentRoomPath) return;
    const id =
      "h_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const hitRef = ref(db, `${this.currentRoomPath}/hits/${targetId}/${id}`);
    set(hitRef, {
      dmg: Math.min(120, Math.max(1, Math.round(dmg))),
      isCrit: !!isCrit,
      fromX: Math.round(fromX),
      fromY: Math.round(fromY),
      attackerName: String(attackerName || "").slice(0, 16),
      ts: serverTimestamp(),
    }).catch(() => {});

    if (typeof targetX === "number" && typeof targetY === "number") {
      const popId =
        "dp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const popRef = ref(db, `${this.currentRoomPath}/skills/${popId}`);
      set(popRef, {
        type: "dmg_popup",
        sender: myPlayerId,
        x: Math.round(targetX),
        y: Math.round(targetY),
        dmg: Math.round(dmg),
        isCrit: !!isCrit,
        ts: serverTimestamp(),
      }).catch(() => {});
      setTimeout(() => remove(popRef).catch(() => {}), 1500);
    }
  }

  leaveRoom() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribers = [];

    if (this.myPlayerRef) {
      remove(this.myPlayerRef).catch(() => {});
      this.myPlayerRef = null;
    }
    this.remotePlayers = {};
    this.getPlayerFn = null;
    this.getGameStateFn = null;
  }
}
