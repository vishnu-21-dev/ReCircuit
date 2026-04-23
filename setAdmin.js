const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDih5PI--od8rbqBtKzOzJGxpV5FPnBAZk",
    authDomain: "ideathon2026-ab2cf.firebaseapp.com",
    projectId: "ideathon2026-ab2cf",
    storageBucket: "ideathon2026-ab2cf.firebasestorage.app",
    messagingSenderId: "1046969850319",
    appId: "1:1046969850319:web:f564fec5c5fa51d20c1aba"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setAdminRole() {
    try {
        const adminUid = "0rN5ZHHqZBV33JmO8Oe04GZ9OBF3";
        await setDoc(doc(db, "roles", adminUid), {
            role: "admin"
        });
        console.log("Admin role set for UID:", adminUid);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

setAdminRole();
