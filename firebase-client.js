import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Replace these values with the Web App configuration from Firebase Console.
// Firebase web config is not a server secret. Never put service-account keys here.
const firebaseConfig = {
  apiKey: "AIzaSyAgaUU0n51PSgVZcw5pcnw83vHT04hivjs",
  authDomain: "ribbon-rain.firebaseapp.com",
  projectId: "ribbon-rain",
  storageBucket: "ribbon-rain.firebasestorage.app",
  messagingSenderId: "219851913959",
  appId: "1:219851913959:web:916741f78e7fa464998042",
  measurementId: "G-FE9ZZLKVKK"
};
export const firebaseReady = Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("REPLACE_") && firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("REPLACE_"));
export const app = firebaseReady ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();
