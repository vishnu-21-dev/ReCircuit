require("dotenv").config();
const admin = require("firebase-admin");

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
});

const db = admin.firestore();

async function runTest() {
    try {
        console.log("1. Writing new data to Firestore...");
        
        // Define some sample data
        const newTeam = {
            teamName: "The Mavericks",
            project: "AI Code Assistant",
            members: 4,
            registeredAt: new Date()
        };

        // Add to a collection named "ideathon_teams"
        const docRef = await db.collection("ideathon_teams").add(newTeam);
        console.log(`✅ Successfully added team with Document ID: ${docRef.id}`);

        console.log("\n2. Fetching the data back from Firestore...");
        
        // Fetch it back
        const snapshot = await db.collection("ideathon_teams").doc(docRef.id).get();
        
        if (snapshot.exists) {
            console.log("✅ Successfully retrieved the document! Here is the data:");
            console.log(snapshot.data());
        } else {
            console.log("❌ Document not found.");
        }

        // Exit properly
        process.exit(0);
    } catch (error) {
        console.error("❌ Error interacting with database:", error);
        process.exit(1);
    }
}

runTest();
