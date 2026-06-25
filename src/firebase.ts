import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDWmQ9BmXsvph7gmFcFk1zIUdw7bUJq4Xo",
  authDomain: "veyin-a371e.firebaseapp.com",
  databaseURL: "https://veyin-a371e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "veyin-a371e",
  storageBucket: "veyin-a371e.firebasestorage.app",
  messagingSenderId: "1020110832896",
  appId: "1:1020110832896:web:3df47613828c27042edfe5",
  measurementId: "G-R44NKNW126"
};

// Initialize Firebase safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);

export function getActiveConfig() {
  return {
    projectId: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    apiKey: firebaseConfig.apiKey ? "Ready (Hidden)" : "Not Configured",
    status: "CONNECTED"
  };
}

export { app, auth, db };
