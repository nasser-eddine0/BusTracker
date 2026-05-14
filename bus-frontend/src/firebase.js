import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCITDWaNEthPPPwyE5h5mYyyxtpFIZNGvo",
  authDomain: "bustracker-5e6c4.firebaseapp.com",
  databaseURL: "https://bustracker-5e6c4-default-rtdb.firebaseio.com",
  projectId: "bustracker-5e6c4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);