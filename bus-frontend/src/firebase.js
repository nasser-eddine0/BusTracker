import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, goOffline, goOnline } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCITDWaNEthPPPwyE5h5mYyyxtpFIZNGvo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bustracker-5e6c4.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://bustracker-5e6c4-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bustracker-5e6c4",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);

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
