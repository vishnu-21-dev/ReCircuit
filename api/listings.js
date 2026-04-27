const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { sellerId, status } = req.query;
      let listRef = db.collection("listings");
      
      if (sellerId) listRef = listRef.where("sellerId", "==", sellerId);
      if (status) listRef = listRef.where("status", "==", status);
      
      const snapshot = await listRef.get();
      const listings = [];
      snapshot.forEach(docSnap => {
        listings.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(listings);
    } else if (req.method === 'POST') {
      const listingData = {
        ...req.body,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection("listings").add(listingData);
      res.json({ id: docRef.id, ...listingData });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Listings API error:", error);
    res.status(500).json({ error: error.message });
  }
};
