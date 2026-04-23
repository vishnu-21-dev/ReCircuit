const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs } = require("firebase/firestore");

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

async function test() {
    try {
        console.log("Testing connection...");
        const docRef = await addDoc(collection(db, "test"), { timestamp: new Date() });
        console.log("Written with ID: ", docRef.id);
        
        const snapshot = await getDocs(collection(db, "test"));
        console.log("Read " + snapshot.size + " docs.");
        process.exit(0);
    } catch(e) {
        console.error("Error: ", e);
        process.exit(1);
    }
}

test();
