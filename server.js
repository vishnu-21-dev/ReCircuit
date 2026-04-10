require("dotenv").config();
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const express = require("express");
const cors = require("cors");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const { requireAuth, requireAdmin, requireShop, requireBuyer, requireRole } = require("./middleware/firebaseAuth");
const { getBuyerUid, getSellerUid } = require("./utils/identity");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==================== RATE LIMITING ====================
const rateLimitKey = (req, res) => (req.user?.uid ? `uid:${req.user.uid}` : ipKeyGenerator(req, res));
const rateLimitHandler = (req, res) => {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfter =
    resetTime instanceof Date
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : 1;

  return res.status(429).json({ error: "Too many requests", retryAfter });
};

const chatLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 20,
  keyGenerator: rateLimitKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 80,
  keyGenerator: rateLimitKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  // "Burst-friendly": allow up to the full limit quickly within the window.
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: rateLimitKey,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  // Avoid double-limiting routes that have dedicated limiters
  skip: (req) =>
    req.path.startsWith("/api/ai/") ||
    (req.method === "POST" && req.path.startsWith("/api/chat/")),
});

// Apply auth before AI limiter so keyGenerator can use req.user.uid
app.use("/api/ai", requireAuth, aiLimiter);

// Apply general limiter to everything else
app.use(generalLimiter);

function forbid(res) {
  return res.status(403).json({ error: "Forbidden" });
}

function isValidFirestoreDocId(id) {
  return typeof id === "string" && id.length > 0 && !id.includes("/");
}

async function assertListingOwnerOrAdmin({ listingId, req, res }) {
  if (req.user.role === "admin") return { ok: true, listing: null };
  const snap = await db.collection("listings").doc(listingId).get();
  if (!snap.exists) {
    res.status(404).json({ error: "Listing not found" });
    return { ok: false };
  }
  const listing = snap.data();
  const ownerUid = listing?.sellerUid || null;
  if (!ownerUid) {
    res.status(500).json({ error: "Listing missing sellerUid" });
    return { ok: false };
  }

  if (ownerUid !== req.user.uid) {
    forbid(res);
    return { ok: false };
  }
  return { ok: true, listing };
}

// Example: use `requireAuth` to protect routes and access `req.user`
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Role-based examples
app.get("/api/admin/ping", requireAuth, requireAdmin, (req, res) => {
  res.json({ ok: true, role: req.user.role, uid: req.user.uid });
});

app.get("/api/shop/ping", requireAuth, requireShop, (req, res) => {
  res.json({ ok: true, role: req.user.role, uid: req.user.uid });
});

app.get("/api/buyer/ping", requireAuth, requireBuyer, (req, res) => {
  res.json({ ok: true, role: req.user.role, uid: req.user.uid });
});

// Or: app.get("/api/something", requireAuth, requireRole("admin"), handler)

const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ==================== AI COMPAT SUGGEST ====================
app.post("/api/ai/compat-suggest", async (req, res) => {
  const { category, brand, model } = req.body;
  if (!category || !brand || !model) {
    return res.status(400).json({ error: "Missing category, brand, or model" });
  }
  const prompt = `You are a consumer electronics compatibility expert. Given a ${category} part from ${brand} ${model}, list up to 8 other specific device models (from any brand) that are commonly compatible with parts from this device. Return ONLY a JSON array of strings, no explanation, no markdown, no backticks. Example: ["Samsung S21", "Samsung S22", "OnePlus 9"]`;
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    if (data.error) {
      return res.status(429).json({ error: "Quota exceeded or API error", detail: data.error.message });
    }
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const models = JSON.parse(clean);
    res.json({ models });
  } catch (err) {
    console.error("compat-suggest error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== BUYER REQUESTS ====================
app.get("/api/requests", requireAuth, async (req, res) => {
    try {
        const { buyerUid, status } = req.query;
        if (buyerUid && typeof buyerUid === "string" && req.user.role !== "admin" && buyerUid !== req.user.uid) {
            return forbid(res);
        }
        let baseRef = db.collection("requests");
        if (status) baseRef = baseRef.where("status", "==", status);

        const requestsMap = new Map();

        if (buyerUid) {
            const buyerUidSnap = await baseRef.where("buyerUid", "==", buyerUid).get();
            buyerUidSnap.forEach((docSnap) => requestsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        } else {
            const snapshot = await baseRef.get();
            snapshot.forEach((docSnap) => requestsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        }

        return res.json(Array.from(requestsMap.values()));
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/requests", requireAuth, async (req, res) => {
    try {
        const body = req.body || {};
        // Never trust identity fields from client
        if (Object.prototype.hasOwnProperty.call(body, "buyerUid")) {
            return res.status(400).json({ error: "Do not set buyerUid" });
        }

        const { category, brand, model, part, grade, priceOffered, force } = body;
        const buyerUid = req.user.uid;
        
        if (!force && buyerUid && part) {
            const existingSnapshot = await db.collection("requests")
                .where("buyerUid", "==", buyerUid)
                .where("status", "in", ["open", "active"])
                .get();

            let duplicateId = null;
            const newPartName = part.trim().toLowerCase();
            
            existingSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const existingPartName = (data.part || '').trim().toLowerCase();
                if (existingPartName === newPartName) {
                    duplicateId = docSnap.id;
                }
            });

            if (duplicateId) {
                return res.status(409).json({ error: "Duplicate request", duplicate: true, existingRequestId: duplicateId });
            }
        }

        const dateNow = new Date();
        const expiresAtDate = new Date(dateNow.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const docRef = await db.collection("requests").add({
            category,
            brand,
            model,
            part,
            grade,
            priceOffered,
            buyerUid,
            status: "open",
            createdAt: dateNow.toISOString(),
            updatedAt: dateNow.toISOString(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate)
        });
        res.json({ id: docRef.id, category, brand, model, part, grade, priceOffered, buyerUid, status: "open", expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate) });
    } catch (error) {
        console.error("Error creating request:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/requests/expire-old", requireAuth, requireAdmin, async (req, res) => {
    try {
        const now = admin.firestore.Timestamp.now();
        const snapshot = await db.collection("requests")
            .where("status", "==", "open")
            .where("expiresAt", "<=", now)
            .get();
        
        let expiredCount = 0;
        const batch = db.batch();
        
        snapshot.forEach(docSnap => {
            batch.update(docSnap.ref, { status: "expired", updatedAt: new Date().toISOString() });
            expiredCount++;
        });
        
        if (expiredCount > 0) {
            await batch.commit();
        }
        res.json({ expiredCount });
    } catch (error) {
        console.error("Error expiring old requests:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete("/api/requests/:id", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== "admin") {
            const snap = await db.collection("requests").doc(id).get();
            if (!snap.exists) return res.status(404).json({ error: "Request not found" });
            const data = snap.data();
            let requestBuyerUid;
            try {
                requestBuyerUid = getBuyerUid(data);
            } catch (e) {
                return res.status(500).json({ error: "Request missing buyer identity" });
            }
            if (requestBuyerUid !== req.user.uid) return forbid(res);
        }
        await db.collection("requests").doc(id).delete();
        res.json({ success: true, id });
    } catch (error) {
        console.error("Error deleting request:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SHOP LISTINGS ====================
app.get("/api/listings", async (req, res) => {
    try {
        const { category, brand, model, part, sellerUid } = req.query;
        let listRef = db.collection("listings");
        
        if (category) listRef = listRef.where("category", "==", category);
        if (brand) listRef = listRef.where("brand", "==", brand);
        if (model) listRef = listRef.where("model", "==", model);
        if (part) listRef = listRef.where("part", "==", part);

        const listingsMap = new Map();
        if (sellerUid) {
            const sellerUidSnap = await listRef.where("sellerUid", "==", sellerUid).get();
            sellerUidSnap.forEach((docSnap) => listingsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        } else {
            const snapshot = await listRef.get();
            snapshot.forEach((docSnap) => listingsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        }

        return res.json(Array.from(listingsMap.values()));
    } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/listings", requireAuth, requireShop, async (req, res) => {
    try {
        const sellerUid = req.user?.uid;
        if (!sellerUid) return res.status(401).json({ error: "Unauthorized" });

        // Verify the authenticated user owns a shop (never trust client-provided shopId)
        const shopSnap = await db
            .collection("shops")
            .where("uid", "==", sellerUid)
            .limit(1)
            .get();

        if (shopSnap.empty) {
            return res.status(403).json({ error: "User does not own a shop" });
        }

        const shopDoc = shopSnap.docs[0];
        const shopId = shopDoc.id;

        const body = req.body || {};
        // sellerUid must always be req.user.uid; reject override attempts.
        if (
            Object.prototype.hasOwnProperty.call(body, "sellerUid") ||
            Object.prototype.hasOwnProperty.call(body, "shopId")
        ) {
            return res.status(400).json({ error: "Do not set seller identity fields" });
        }

        // Whitelist safe fields from frontend
        const { title, price, category, brand, model } = body;

        if (!title || price === undefined || price === null || !category || !brand || !model) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            return res.status(400).json({ error: "Invalid price" });
        }

        const listing = {
            title: String(title).trim(),
            price: numericPrice,
            category: String(category).trim(),
            brand: String(brand).trim(),
            model: String(model).trim(),
            sellerUid,
            shopId,
            status: "available",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection("listings").add(listing);
        return res.status(201).json({ id: docRef.id, ...listing });
    } catch (error) {
        console.error("Error creating listing:", error);
        return res.status(500).json({ error: error.message });
    }
});

app.patch("/api/listings/:id", requireAuth, requireRole(["shop", "admin"]), async (req, res) => {
    try {
        const sellerUid = req.user?.uid;
        if (!sellerUid) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const docRef = db.collection("listings").doc(id);
        const snap = await docRef.get();
        if (!snap.exists) return res.status(404).json({ error: "Listing not found" });

        const listing = snap.data();
        const isAdmin = req.user?.role === "admin";
        const ownerUid = getSellerUid(listing); // fail-fast if missing
        const isOwner = ownerUid === sellerUid;
        if (!isAdmin && !isOwner) return res.status(403).json({ error: "Forbidden" });

        const body = req.body || {};
        // Reject attempts to override ownership/identity fields.
        if (
            Object.prototype.hasOwnProperty.call(body, "sellerUid") ||
            Object.prototype.hasOwnProperty.call(body, "shopId") ||
            Object.prototype.hasOwnProperty.call(body, "uid")
        ) {
            return res.status(400).json({ error: "Cannot modify listing ownership fields" });
        }
        const updates = {};

        if (Object.prototype.hasOwnProperty.call(body, "title")) {
            if (typeof body.title !== "string") return res.status(400).json({ error: "title must be a string" });
            const v = body.title.trim();
            if (!v) return res.status(400).json({ error: "title cannot be empty" });
            updates.title = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "category")) {
            if (typeof body.category !== "string") return res.status(400).json({ error: "category must be a string" });
            const v = body.category.trim();
            if (!v) return res.status(400).json({ error: "category cannot be empty" });
            updates.category = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "brand")) {
            if (typeof body.brand !== "string") return res.status(400).json({ error: "brand must be a string" });
            const v = body.brand.trim();
            if (!v) return res.status(400).json({ error: "brand cannot be empty" });
            updates.brand = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "model")) {
            if (typeof body.model !== "string") return res.status(400).json({ error: "model must be a string" });
            const v = body.model.trim();
            if (!v) return res.status(400).json({ error: "model cannot be empty" });
            updates.model = v;
        }

        if (Object.prototype.hasOwnProperty.call(body, "price")) {
            if (typeof body.price !== "number") return res.status(400).json({ error: "price must be a number" });
            if (!Number.isFinite(body.price) || body.price < 0) {
                return res.status(400).json({ error: "price must be a non-negative number" });
            }
            updates.price = body.price;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await docRef.update(updates);
        return res.json({ success: true, id });
    } catch (error) {
        console.error("Error updating listing:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/api/listings/:id", requireAuth, requireRole(["shop", "admin"]), async (req, res) => {
    try {
        const sellerUid = req.user?.uid;
        if (!sellerUid) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const docRef = db.collection("listings").doc(id);
        const snap = await docRef.get();
        if (!snap.exists) return res.status(404).json({ error: "Listing not found" });

        const listing = snap.data();
        const isAdmin = req.user?.role === "admin";
        const ownerUid = getSellerUid(listing); // fail-fast if missing
        const isOwner = ownerUid === sellerUid;
        if (!isAdmin && !isOwner) return res.status(403).json({ error: "Forbidden" });

        await docRef.delete();
        return res.json({ success: true, id });
    } catch (error) {
        console.error("Error deleting listing:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ==================== AI SEARCH ====================
app.post("/api/search/ai", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a search assistant for an electronics repair parts marketplace in India.
Extract the brand, model, and part name from this search query: "${query}"
Respond ONLY with a JSON object, no markdown, no backticks, no explanation.
Format: {"brand": "...", "model": "...", "part": "..."}`
          }]
        }]
      })
    });

    const geminiData = await geminiRes.json();
    console.log("Gemini raw response:", JSON.stringify(geminiData, null, 2));

    if (!geminiRes.ok || !geminiData.candidates) {
      console.error("Gemini API error:", geminiData);
      return res.json({
        results: [],
        parsed: { brand: "", model: "", part: "" },
        extractedIntent: { brand: "", model: "", part: "" },
        aiUsed: false,
        message: "AI unavailable, try keyword search"
      });
    }

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed = { brand: "", model: "", part: "" };
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", cleaned);
      return res.json({
        results: [],
        parsed,
        extractedIntent: parsed,
        aiUsed: false,
        message: "AI could not understand the query, try being more specific"
      });
    }

    const { brand, model, part } = parsed;

    let listingsRef = db.collection("listings");
    let snapshot = await listingsRef
      .where("status", "==", "active")
      .get();

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const matchesBrand = brand ? data.brand?.toLowerCase().includes(brand.toLowerCase()) : true;
      const matchesModel = model ? (data.model?.toLowerCase().includes(model.toLowerCase()) || (data.compatibleModels || []).some(m => m.toLowerCase().includes(model.toLowerCase()))) : true;
      const matchesPart = part ? data.part?.toLowerCase().includes(part.toLowerCase()) : true;
      if (matchesBrand && matchesModel && matchesPart) {
        results.push({ id: doc.id, ...data });
      }
    });

    return res.json({ results, parsed });
  } catch (err) {
    console.error("AI search error:", err);
    return res.status(500).json({ error: "AI search failed", details: err.message });
  }
});

// ==================== AI PRICE SUGGEST ====================
app.post("/api/ai/price-suggest", async (req, res) => {
  try {
    const { category, brand, model, part, grade } = req.body;
    if (!category || !brand || !model || !part || !grade) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const gradeLabels = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Poor' };
    const gradeLabel = gradeLabels[grade] || grade;

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a pricing expert for electronics repair parts in India, specifically Bangalore.
A seller wants to list the following part:
- Category: ${category}
- Brand: ${brand}
- Model: ${model}
- Part: ${part}
- Condition Grade: ${grade} (${gradeLabel})

Suggest a fair market price in Indian Rupees for this used spare part in the Indian repair market.
Consider that this is a second-hand part sold by a local repair shop, not a brand new OEM part.

Respond ONLY with a JSON object, no markdown, no backticks, no explanation:
{
  "suggestedPrice": <number, the single best price in rupees as integer>,
  "range": "<string, e.g. Rs. 800 - Rs. 1200>",
  "reasoning": "<1-2 sentences explaining the price>",
  "marketNote": "<optional 1 sentence about market conditions or tips>"
}`
          }]
        }]
      })
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok || !geminiData.candidates) {
      console.error("Gemini price suggest error:", geminiData);
      return res.status(503).json({ error: "AI unavailable" });
    }

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini price JSON:", cleaned);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Price suggestion error:", err);
    return res.status(500).json({ error: "Price suggestion failed", details: err.message });
  }
});

// ==================== MATCHES ====================
app.post("/api/matches", requireAuth, requireRole(["buyer", "shop"]), async (req, res) => {
    try {
        const data = req.body || {};
        // Never trust identity fields from client
        if (Object.prototype.hasOwnProperty.call(data, "buyerUid") || Object.prototype.hasOwnProperty.call(data, "sellerUid")) {
            return res.status(400).json({ error: "Do not set buyerUid/sellerUid in request body" });
        }

        let buyerUid = null;
        let sellerUid = null;

        if (req.user.role === "buyer") {
            buyerUid = req.user.uid;
            if (!data.listingId) {
                return res.status(400).json({ error: "listingId is required" });
            }
            const listingSnap = await db.collection("listings").doc(data.listingId).get();
            if (!listingSnap.exists) {
                return res.status(404).json({ error: "Listing not found" });
            }
            const listing = listingSnap.data();
            try {
                sellerUid = getSellerUid(listing);
            } catch (e) {
                return res.status(400).json({ error: "Listing missing seller identity" });
            }
        }

        if (req.user.role === "shop") {
            sellerUid = req.user.uid;
            // For shop-initiated match, derive buyerUid from requestId (never from client-provided identity fields)
            if (!data.requestId || typeof data.requestId !== "string") {
                return res.status(400).json({ error: "requestId is required" });
            }
            const requestSnap = await db.collection("requests").doc(data.requestId).get();
            if (!requestSnap.exists) return res.status(404).json({ error: "Request not found" });
            const request = requestSnap.data() || {};
            try {
                buyerUid = getBuyerUid(request);
            } catch (e) {
                return res.status(400).json({ error: "Request missing buyer identity" });
            }

            if (buyerUid === sellerUid) return forbid(res);

            // If listingId is provided, ensure it belongs to this shop.
            if (data.listingId) {
                const listingSnap = await db.collection("listings").doc(data.listingId).get();
                if (!listingSnap.exists) return res.status(404).json({ error: "Listing not found" });
                const listing = listingSnap.data() || {};
                let listingSellerUid = null;
                try {
                    listingSellerUid = getSellerUid(listing);
                } catch (e) {
                    return res.status(400).json({ error: "Listing missing seller identity" });
                }
                if (listingSellerUid !== sellerUid) return forbid(res);
            }
        }

        const docToWrite = {
            requestId: data.requestId || null,
            listingId: data.listingId || null,
            buyerUid,
            sellerUid,
            part: data.part || 'Component',
            partName: data.partName || data.part || 'Component',
            modelName: data.modelName || 'Unknown',
            status: data.status || "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection("matches").add(docToWrite);
        // Preserve response shape (includes buyerUid/sellerUid), but do not echo untrusted identity fields from client.
        res.json({ id: docRef.id, ...data, buyerUid, sellerUid });
    } catch (error) {
        console.error("Error creating match:", error);
        res.status(500).json({ error: error.message });
    }
});

async function getMatchById(req, res) {
    try {
        const { matchId } = req.params;
        if (!isValidFirestoreDocId(matchId)) {
            return res.status(400).json({ error: "Invalid matchId" });
        }

        const docSnap = await db.collection("matches").doc(matchId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: "Match not found" });
        }

        const data = docSnap.data() || {};
        let buyerUid;
        let sellerUid;
        try {
            buyerUid = getBuyerUid(data);
            sellerUid = getSellerUid(data);
        } catch (e) {
            return res.status(500).json({ error: "Match missing identity fields" });
        }
        const uid = req.user?.uid;

        if (!uid) return res.status(401).json({ error: "Unauthorized" });

        const allowed = uid === buyerUid || uid === sellerUid;
        if (!allowed) return res.status(403).json({ error: "Forbidden" });

        return res.json({ id: docSnap.id, ...data });
    } catch (error) {
        console.error("Error fetching match:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

async function getMatchesForCurrentUser(req, res) {
    try {
        const uid = req.user?.uid;
        if (!uid) return res.status(401).json({ error: "Unauthorized" });

        const matchesMap = new Map();

        // Strict identity source: req.user.uid only.
        // Return matches where buyerUid == uid OR sellerUid == uid.
        const [buyerUidSnap, sellerUidSnap] = await Promise.all([
            db.collection("matches").where("buyerUid", "==", uid).get(),
            db.collection("matches").where("sellerUid", "==", uid).get(),
        ]);

        buyerUidSnap.forEach((docSnap) => matchesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        sellerUidSnap.forEach((docSnap) => matchesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));

        return res.json(Array.from(matchesMap.values()));
    } catch (error) {
        console.error("Error fetching matches:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Refactored, non-conflicting routes
app.get("/api/matches/:matchId", requireAuth, getMatchById);
app.get("/api/matches", requireAuth, requireRole(["admin", "buyer", "shop"]), getMatchesForCurrentUser);

app.patch("/api/matches/:matchId/status", requireAuth, async (req, res) => {
    try {
        const { matchId } = req.params;
        const { status } = req.body;
        
        const docRef = db.collection("matches").doc(matchId);
        const matchSnap = await docRef.get();
        if (!matchSnap.exists) {
            return res.status(404).json({ error: "Match not found" });
        }
        if (req.user.role !== "admin") {
            const matchData = matchSnap.data();
            let buyerUid;
            let sellerUid;
            try {
                buyerUid = getBuyerUid(matchData);
                sellerUid = getSellerUid(matchData);
            } catch (e) {
                return res.status(500).json({ error: "Match missing identity fields" });
            }
            const allowed = buyerUid === req.user.uid || sellerUid === req.user.uid;
            if (!allowed) return forbid(res);
        }
        const matchData = matchSnap.data();
        const dateNow = new Date().toISOString();
        
        const updates = { 
            status, 
            updatedAt: dateNow 
        };
        
        if (!matchData.firstResponseAt) {
            updates.firstResponseAt = dateNow;
        }

        await docRef.update(updates);
        res.json({ success: true, id: matchId, status, firstResponseAt: updates.firstResponseAt });
    } catch (error) {
        console.error("Error updating match status:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CHAT ====================
app.post("/api/chat/:matchId", requireAuth, chatLimiter, async (req, res) => {
  try {
    const senderUid = req.user?.uid;
    if (!senderUid) return res.status(401).json({ error: "Unauthorized" });

    const { matchId } = req.params;
    const matchRef = db.collection("matches").doc(matchId);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      return res.status(404).json({ error: "Match not found" });
    }

    const match = matchSnap.data() || {};
    let buyerUid;
    let sellerUid;
    try {
      buyerUid = getBuyerUid(match);
      sellerUid = getSellerUid(match);
    } catch (e) {
      return res.status(500).json({ error: "Match missing identity fields" });
    }

    const allowed = senderUid === buyerUid || senderUid === sellerUid;
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { text } = req.body || {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const message = {
      text: text.trim(),
      senderUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const msgRef = await matchRef.collection("messages").add(message);
    return res.status(201).json({ success: true, id: msgRef.id });
  } catch (err) {
    console.error("Error sending chat message:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== REVIEWS ====================
app.post("/api/reviews", requireAuth, requireBuyer, async (req, res) => {
  try {
    // Identity is derived from auth; do not trust body identity fields.
    const { matchId, shopId, rating, comment } = req.body;
    if (!matchId || !shopId || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const buyerUid = req.user?.uid;
    if (!buyerUid) return res.status(401).json({ error: "Unauthorized" });

    const existing = await db.collection("reviews")
      .where("matchId", "==", matchId)
      .where("buyerUid", "==", buyerUid)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: "Review already submitted for this match" });
    }

    const docRef = await db.collection("reviews").add({
      matchId,
      buyerUid,
      shopId,
      rating: Number(rating),
      comment: comment || "",
      reply: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ id: docRef.id, matchId, buyerUid, shopId, rating, comment, reply: null });
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/shops/:shopId/reviews", async (req, res) => {
  try {
    const { shopId } = req.params;
    const snapshot = await db.collection("reviews")
      .where("shopId", "==", shopId)
      .orderBy("createdAt", "desc")
      .get();

    const reviews = [];
    snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
    res.json(reviews);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/reviews/:reviewId/reply", async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ error: "Reply text required" });

    const docRef = db.collection("reviews").doc(reviewId);
    const snap = await docRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Review not found" });

    await docRef.update({ reply, updatedAt: new Date() });
    res.json({ id: reviewId, reply });
  } catch (err) {
    console.error("Error adding reply:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== COMPATIBILITY ====================
app.get("/api/compatibility", async (req, res) => {
    try {
        const snapshot = await db.collection("compatibility").get();
        const compMap = {};
        snapshot.forEach(docSnap => {
            compMap[docSnap.id.replace(/-/g, '/')] = docSnap.data().compatibleWith || [];
        });
        res.json(compMap);
    } catch (error) {
        console.error("Error fetching compatibility:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SHOPS ====================
app.get("/api/shops/:shopId/response-time", async (req, res) => {
    try {
        const { shopId } = req.params;
        const shopSnap = await db.collection("shops").doc(shopId).get();
        if (!shopSnap.exists) {
            return res.status(404).json({ error: "Shop not found" });
        }
        const shopUid = shopSnap.data()?.uid || null;
        if (!shopUid) {
            return res.status(400).json({ error: "Shop missing uid" });
        }

        const [sellerUidSnap] = await Promise.all([
            db.collection("matches").where("sellerUid", "==", shopUid).get(),
        ]);

        const snapshotDocs = new Map();
        sellerUidSnap.forEach((d) => snapshotDocs.set(d.id, d));
        let totalMatches = 0;
        let totalHours = 0;
        
        snapshotDocs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.firstResponseAt && data.createdAt) {
                totalMatches++;
                const created = new Date(data.createdAt);
                const responded = new Date(data.firstResponseAt);
                const diffHours = (responded - created) / (1000 * 60 * 60);
                totalHours += diffHours;
            }
        });
        
        const averageResponseHours = totalMatches > 0 ? totalHours / totalMatches : null;
        res.json({ averageResponseHours, totalMatches });
    } catch (error) {
        console.error("Error fetching shop response time:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/api/shops", async (req, res) => {
    try {
        const { status } = req.query;
        let listRef = db.collection("shops");
        if (status) listRef = listRef.where("status", "==", status);
        
        const snapshot = await listRef.get();
        const shops = [];
        snapshot.forEach(docSnap => {
            shops.push({ id: docSnap.id, ...docSnap.data() });
        });
        res.json(shops);
    } catch (error) {
        console.error("Error fetching shops:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/shops/by-uid/:uid", async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection("shops").where("uid", "==", uid).get();
        if (snapshot.empty) {
            return res.status(404).json({ error: "Shop not found" });
        }
        const shopDoc = snapshot.docs[0];
        res.json({ id: shopDoc.id, ...shopDoc.data() });
    } catch (error) {
        console.error("Error fetching shop by UID:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/shops/:shopId", async (req, res) => {
    try {
        const { shopId } = req.params;
        const docSnap = await db.collection("shops").doc(shopId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: "Shop not found" });
        }
        res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        console.error("Error fetching shop:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/shops", async (req, res) => {
    try {
        const data = req.body;
        // If shopId is provided, use set (for backwards compat)
        if (data.shopId) {
            await db.collection("shops").doc(data.shopId).set({
                name: data.name,
                rating: data.rating || 0,
                tradesCompleted: data.tradesCompleted || 0,
                address: data.address,
                contact: data.contact,
                verified: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            res.json({ id: data.shopId, ...data });
        } else {
            // New shop registration (onboarding)
            const docRef = await db.collection("shops").add({
                uid: data.uid,
                shopName: data.shopName,
                ownerName: data.ownerName,
                phone: data.phone,
                city: data.city,
                area: data.area,
                lat: data.lat || null,
                lng: data.lng || null,
                categories: data.categories || [],
                shopPhotoUrl: data.shopPhotoUrl || '',
                status: 'pending',
                rejectionReason: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            res.json({ id: docRef.id, ...data, status: 'pending' });
        }
    } catch (error) {
        console.error("Error creating/updating shop:", error);
        res.status(500).json({ error: error.message });
    }
});

app.patch("/api/shops/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        updates.updatedAt = new Date().toISOString();
        await db.collection("shops").doc(id).update(updates);
        res.json({ success: true, id, ...updates });
    } catch (error) {
        console.error("Error updating shop:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== HEALTH CHECK ====================
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "ReCircuit API is running on Admin SDK" });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ReCircuit API running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});