import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase, goOffline, goOnline } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCITDWaNEthPPPwyE5h5mYyyxtpFIZNGvo",
  authDomain: "bustracker-5e6c4.firebaseapp.com",
  databaseURL: "https://bustracker-5e6c4-default-rtdb.firebaseio.com",
  projectId: "bustracker-5e6c4",
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
