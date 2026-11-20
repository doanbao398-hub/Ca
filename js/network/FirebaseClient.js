import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { eventBus } from "../core/EventBus.js";

const firebaseConfig = {
  apiKey: "AIzaSyByTa0lOsKVkkAWGEh-tp_DrIjlHXEPaLY",
  authDomain: "a-cuong.firebaseapp.com",
  databaseURL: "https://a-cuong-default-rtdb.firebaseio.com",
  projectId: "a-cuong",
  storageBucket: "a-cuong.firebasestorage.app",
  messagingSenderId: "54402203787",
  appId: "1:54402203787:web:b4785391d9e7d6dc8b548e",
  measurementId: "G-TLCWT0WVSX",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return cred;
}

export const logoutUser = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
  eventBus.emit("AUTH_STATE_CHANGED", user);
});

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

