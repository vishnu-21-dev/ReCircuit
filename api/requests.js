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
      const { buyerId, status } = req.query;
      let listRef = db.collection("requests");
      
      if (buyerId) listRef = listRef.where("buyerId", "==", buyerId);
      if (status) listRef = listRef.where("status", "==", status);
      
      const snapshot = await listRef.get();
      const requests = [];
      snapshot.forEach(docSnap => {
        requests.push({ id: docSnap.id, ...docSnap.data() });
      });
      res.json(requests);
    } else if (req.method === 'POST') {
      const { category, brand, model, part, grade, priceOffered, buyerId, force } = req.body;
      
      if (!force && buyerId && part) {
        const existingSnapshot = await db.collection("requests")
          .where("buyerId", "==", buyerId)
          .where("part", "==", part)
          .where("status", "in", ["pending", "matched"])
          .get();
        
        if (!existingSnapshot.empty) {
          return res.status(400).json({ 
            error: "You already have a pending or matched request for this part" 
          });
        }
      }
      
      const requestData = {
        category,
        brand,
        model,
        part,
        grade,
        priceOffered,
        buyerId,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection("requests").add(requestData);
      res.json({ id: docRef.id, ...requestData });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Requests API error:", error);
    res.status(500).json({ error: error.message });
  }
};
