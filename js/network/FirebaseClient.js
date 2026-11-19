import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { eventBus } from "../core/EventBus.js";

const firebaseConfig = {
  databaseURL: "https://a-cuong-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const myPlayerId =
  "p_" +
  Math.random().toString(36).substring(2, 10) +
  "_" +
  Date.now().toString(36);

let serverTimeOffset = 0;

onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
  serverTimeOffset = snap.val() || 0;
});

onValue(ref(db, ".info/connected"), (snap) => {
  eventBus.emit("FIREBASE_CONNECTION_CHANGED", snap.val() === true);
});

export function getServerNow() {
  return Date.now() + serverTimeOffset;
}
