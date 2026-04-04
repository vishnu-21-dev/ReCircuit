import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDih5PI--od8rbqBtKzOzJGxpV5FPnBAZk",
  authDomain: "ideathon2026-ab2cf.firebaseapp.com",
  projectId: "ideathon2026-ab2cf",
  storageBucket: "ideathon2026-ab2cf.firebasestorage.app",
  messagingSenderId: "1046969850319",
  appId: "1:1046969850319:web:f564fec5c5fa51d20c1aba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
