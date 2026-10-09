import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, goOffline, goOnline } from "firebase/database";
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseKeys.length > 0) {
  throw new Error(`Missing Firebase environment variables: ${missingFirebaseKeys.join(", ")}`);
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

let startedConnectionManager = false;

export function startFirebaseConnectionManager() {
  if (startedConnectionManager || typeof window === "undefined") return;

  startedConnectionManager = true;

  const handleOnline = () => {
    goOnline(db);
  };

  const handleOffline = () => {
    goOffline(db);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  if (!navigator.onLine) {
    goOffline(db);
  }
}
