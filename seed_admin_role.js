const admin = require('firebase-admin');

// Initialize using Application Default Credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const ADMIN_UID = "0rN5ZHHqZBV33JmO8Oe04GZ9OBF3";

async function seedAdminRole() {
  try {
    await db.collection("roles").doc(ADMIN_UID).set({
      role: "admin"
    });
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error("Error setting admin role:", err);
    process.exit(1);
  }
}

seedAdminRole();
