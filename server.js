require("dotenv").config();
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
let serviceAccount;
if (process.env.SERVICE_ACCOUNT_KEY) {
  try {
    // First try parsing as-is
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
  } catch (e) {
    try {
      // If that fails, try replacing escaped newlines
      serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'));
    } catch (e2) {
      console.error('Failed to parse SERVICE_ACCOUNT_KEY:', e2.message);
      serviceAccount = require("./serviceAccountKey.json");
    }
  }
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const GEMINI_KEY = process.env.GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const GROQ_KEY = process.env.GROQ_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ==================== AI COMPAT SUGGEST (GROQ) ====================
app.post("/api/ai/compat-suggest", async (req, res) => {
  const { category, brand, model, part } = req.body;
  if (!category || !brand || !model || !part) {
    return res.status(400).json({ error: "Missing category, brand, model, or part" });
  }
  const prompt = `You are a consumer electronics repair parts compatibility expert.

TASK: Given a specific part — "${part}" — from a ${category} device "${brand} ${model}", list up to 6 other device models where this EXACT SAME "${part}" part can physically fit and work as a drop-in replacement.

CRITICAL RULES:
- You are matching compatibility for ONE SPECIFIC PART: the "${part}".
- A "${part}" from ${brand} ${model} can ONLY fit in devices that share the exact same "${part}" hardware — same physical dimensions, same connector type, same ribbon cable, same mounting points.
- ONLY list devices from the SAME BRAND unless the devices literally share the same chassis/internal design (e.g., Redmi Note 13 Pro and Poco X6 Pro are rebadged versions of each other).
- For laptops: a ${brand} ${model} ${part} will almost NEVER fit a laptop from a different brand. Even within ${brand}, only very closely related models (same generation, same chassis) share parts.
- For smartphones: ${brand} sometimes reuses the same ${part} across 1-2 generations or regional variants of the same phone. Cross-brand is extremely rare.
- Do NOT guess. If you are unsure, return fewer results or an empty array. Accuracy is more important than quantity.
- NEVER include devices from a completely different brand family.

Return ONLY a JSON array of strings. No explanation, no markdown, no backticks. If no compatible models exist, return [].
Example for "Battery" from "Lenovo LOQ 15": ["Lenovo LOQ 15IRH8", "Lenovo LOQ 15AHP9"]`;
  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 512
      })
    });
    const groqData = await groqRes.json();
    if (!groqRes.ok || !groqData.choices) {
      console.error("Groq compat-suggest error:", groqData);
      return res.status(503).json({ error: "AI unavailable", detail: groqData });
    }
    const raw = groqData?.choices?.[0]?.message?.content || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const models = JSON.parse(clean);
    res.json({ models });
  } catch (err) {
    console.error("compat-suggest error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== BUYER REQUESTS ====================
app.get("/api/requests", async (req, res) => {
    try {
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
    } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/requests", async (req, res) => {
    try {
        const { category, brand, model, part, grade, priceOffered, buyerId, force } = req.body;
        
        if (!force && buyerId && part) {
            const existingSnapshot = await db.collection("requests")
                .where("buyerId", "==", buyerId)
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
            buyerId,
            status: "open",
            createdAt: dateNow.toISOString(),
            updatedAt: dateNow.toISOString(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate)
        });
        res.json({ id: docRef.id, category, brand, model, part, grade, priceOffered, buyerId, status: "open", expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate) });
    } catch (error) {
        console.error("Error creating request:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/requests/expire-old", async (req, res) => {
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

app.delete("/api/requests/:id", async (req, res) => {
    try {
        const { id } = req.params;
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
        const { category, brand, model, part, sellerId } = req.query;
        let listRef = db.collection("listings");
        
        if (category) listRef = listRef.where("category", "==", category);
        if (brand) listRef = listRef.where("brand", "==", brand);
        if (model) listRef = listRef.where("model", "==", model);
        if (part) listRef = listRef.where("part", "==", part);
        if (sellerId) listRef = listRef.where("sellerId", "==", sellerId);
        
        const snapshot = await listRef.get();
        const listings = [];
        snapshot.forEach(docSnap => {
            listings.push({ id: docSnap.id, ...docSnap.data() });
        });
        res.json(listings);
    } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/listings", async (req, res) => {
    try {
        const data = req.body;
        const docRef = await db.collection("listings").add({
            category: data.category,
            brand: data.brand,
            model: data.model,
            part: data.part,
            grade: data.grade,
            price: data.price,
            warranty: data.warranty || null,
            compatibleModels: data.compatibleModels || [],
            shopId: data.shopId,
            sellerId: data.sellerId || data.shopId,
            shopName: data.shopName || '',
            quantity: data.quantity || 1,
            videoUrl: data.videoUrl || null,
            imageUrl: data.imageUrl || null,
            aiPriceSuggestion: data.aiPriceSuggestion || null,
            aiGradeVerifyResult: data.aiGradeVerifyResult || null,
            aiFakeCheckResult: data.aiFakeCheckResult || null,
            aiRecognitionResult: data.aiRecognitionResult || null,
            status: "available",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        res.json({ id: docRef.id, ...data, status: "available" });
    } catch (error) {
        console.error("Error creating listing:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete("/api/listings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection("listings").doc(id).delete();
        res.json({ success: true, id });
    } catch (error) {
        console.error("Error deleting listing:", error);
        res.status(500).json({ error: error.message });
    }
});

app.patch("/api/listings/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        updates.updatedAt = new Date().toISOString();
        await db.collection("listings").doc(id).update(updates);
        res.json({ success: true, id, ...updates });
    } catch (error) {
        console.error("Error updating listing:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== AI SEARCH ====================
app.post("/api/search/ai", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required" });

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a search assistant for an electronics repair parts marketplace in India.
Extract the brand, model, and part name from this search query: "${query}"
Respond ONLY with a JSON object, no markdown, no backticks, no explanation.
Format: {"brand": "...", "model": "...", "part": "..."}`
        }],
        temperature: 0.2,
        max_tokens: 256
      })
    });

    const groqData = await groqRes.json();
    console.log("Groq search response:", JSON.stringify(groqData, null, 2));

    if (!groqRes.ok || !groqData.choices) {
      console.error("Groq search error:", groqData);
      return res.json({
        results: [],
        parsed: { brand: "", model: "", part: "" },
        extractedIntent: { brand: "", model: "", part: "" },
        aiUsed: false,
        message: "AI unavailable, try keyword search"
      });
    }

    const rawText = groqData?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed = { brand: "", model: "", part: "" };
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Groq JSON:", cleaned);
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
      .where("status", "==", "available")
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

    return res.json({ results, parsed, extractedIntent: parsed, aiUsed: true });
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

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `You are a pricing expert for USED, SALVAGED electronics repair parts in India (Bangalore local repair market).

A seller wants to list this PULLED/HARVESTED second-hand part:
- Category: ${category}
- Brand: ${brand}
- Model: ${model}
- Part: ${part}
- Condition Grade: ${grade} (${gradeLabel})

CRITICAL PRICING RULES — follow these strictly:
1. These are SALVAGED parts pulled from old/dead devices, NOT brand-new OEM replacements. Price them accordingly.
2. The buyer alternative is buying a BRAND NEW aftermarket or OEM part. Your suggested price MUST be dramatically lower than a new part — otherwise the buyer has zero reason to buy used.
3. Use these discount ranges off the NEW aftermarket replacement price:
   - Grade A (Excellent): 30-45% of new part price
   - Grade B (Good): 20-35% of new part price
   - Grade C (Fair): 10-25% of new part price
   - Grade D (Poor/Parts-only): 5-15% of new part price
4. For common parts like batteries, screens, charging ports — prices should be VERY low because new aftermarket replacements are cheap and widely available.
5. Think like a Bangalore SP Road / local repair market vendor. These are cash-and-carry salvage parts, not retail products.
6. The price must make a buyer think "this is a steal compared to buying new" — that's the whole point of a used parts marketplace.

Example calibration:
- A Grade A iPhone 13 battery should be around Rs. 200-400 (new aftermarket is ~Rs. 800-1200)
- A Grade B Samsung S23 screen should be around Rs. 1500-2500 (new aftermarket is ~Rs. 6000-10000)
- A Grade C laptop RAM stick (8GB) should be around Rs. 300-600 (new is ~Rs. 1800-2500)

Respond ONLY with a JSON object, no markdown, no backticks, no explanation:
{
  "suggestedPrice": <number, the single best price in rupees as integer — keep it LOW>,
  "range": "<string, e.g. Rs. 200 - Rs. 400>",
  "reasoning": "<1-2 sentences explaining why this price is attractive vs buying new>",
  "marketNote": "<1 sentence: what a new replacement costs, so the buyer sees the savings>"
}`
        }],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    const groqData = await groqRes.json();

    if (!groqRes.ok || !groqData.choices) {
      console.error("Groq price suggest error:", groqData);
      return res.status(503).json({ error: "AI unavailable" });
    }

    const rawText = groqData?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Groq price JSON:", cleaned);
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Price suggestion error:", err);
    return res.status(500).json({ error: "Price suggestion failed", details: err.message });
  }
});

// ==================== AI VISUAL RECOGNITION (GROQ VISION) ====================
app.post("/api/ai/visual-recognition", async (req, res) => {
  const { imageBase64, mimeType, partHint } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });
  try {
    const prompt = `You are an electronics repair parts expert. Analyze this image of an electronics part and respond in JSON only, no markdown, no backticks, no explanation:
{
  "category": "Smartphones|Laptops|Home Appliances|Consumer Electronics",
  "brand": "detected brand or empty string",
  "model": "detected model or empty string",
  "part": "Battery|Screen|Camera Module|Charging Port|Motherboard|Speaker|Keyboard|Trackpad|RAM|SSD/HDD|Cooling Fan|Hinge|Motor|Control Board|Compressor|Screen Panel|Mainboard|Power Board",
  "grade": "A|B|C|D",
  "gradeReason": "one sentence explanation of grade",
  "confidence": "high|medium|low"
}

Grading criteria:
- Grade A: Excellent, 90%+ intact, no visible damage, minimal wear
- Grade B: Good, 70-90% intact, minor scratches or light wear
- Grade C: Fair, 50-70% intact, visible damage, needs minor repair
- Grade D: Parts only, below 50% condition, heavy damage or broken`;

    const mime = mimeType || "image/jpeg";
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } }
          ]
        }],
        temperature: 0.2,
        max_tokens: 1024
      })
    });
    const groqData = await groqRes.json();
    if (!groqRes.ok || !groqData.choices) {
      console.error("Groq vision error:", groqData);
      return res.status(500).json({ error: "Vision analysis failed", details: groqData });
    }
    const rawText = groqData?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return res.json(parsed);
  } catch (err) {
    console.error("Visual recognition error:", err);
    return res.status(500).json({ error: "Visual recognition failed", details: err.message });
  }
});

// ==================== AI FAKE LISTING DETECTOR ====================
app.post("/api/ai/detect-fake", async (req, res) => {
  const { category, brand, model, part, grade, price, description } = req.body;
  if (!part || !brand) return res.status(400).json({ error: "part and brand required" });
  try {
    const prompt = `You are an expert in detecting fake or suspicious electronics parts listings. Analyze this listing and respond in JSON only, no markdown, no backticks:

{
  "isFake": true|false,
  "confidence": "high|medium|low",
  "reasons": ["reason1", "reason2"],
  "recommendation": "approve|flag|reject"
}

Listing details:
- Category: ${category}
- Brand: ${brand}
- Model: ${model}
- Part: ${part}
- Grade: ${grade}
- Price: ${price}
- Description: ${description}

Check for:
- Unrealistically low prices for high-grade parts
- Generic or suspicious descriptions
- Inconsistent brand/model/part combinations
- Common scam patterns in electronics parts market`;

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 512
      })
    });
    const groqData = await groqRes.json();
    if (!groqRes.ok || !groqData.choices) {
      console.error("Groq fake detect error:", groqData);
      return res.status(500).json({ error: "Fake detection failed", details: groqData });
    }
    const rawText = groqData?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error("Fake detection error:", err);
    res.status(500).json({ error: "Fake detection failed", details: err.message });
  }
});

// ==================== AI GRADE VERIFICATION (GROQ VISION) ====================
app.post("/api/ai/verify-grade", async (req, res) => {
  const { imageBase64, category, brand, model, part, claimedGrade } = req.body;
  if (!imageBase64 || !claimedGrade) return res.status(400).json({ error: "imageBase64 and claimedGrade required" });
  try {
    const prompt = `You are an electronics parts grading expert. Verify if this part matches the claimed grade "${claimedGrade}".

Respond in JSON only, no markdown, no backticks:
{
  "verifiedGrade": "A|B|C|D",
  "matchesClaimed": true|false,
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}

Grading criteria:
- Grade A: Excellent, 90%+ intact, no visible damage, minimal wear
- Grade B: Good, 70-90% intact, minor scratches or light wear
- Grade C: Fair, 50-70% intact, visible damage, needs minor repair
- Grade D: Parts only, below 50% condition, heavy damage or broken

Part details: ${category} ${brand} ${model} ${part}`;

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }],
        temperature: 0.2,
        max_tokens: 1024
      })
    });
    const groqData = await groqRes.json();
    if (!groqRes.ok || !groqData.choices) {
      console.error("Groq grade verify error:", groqData);
      return res.status(500).json({ error: "Grade verification failed", details: groqData });
    }
    const rawText = groqData?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (err) {
    console.error("Grade verification error:", err);
    res.status(500).json({ error: "Grade verification failed", details: err.message });
  }
});

// ==================== MATCHES ====================
app.post("/api/matches", async (req, res) => {
    try {
        const data = req.body;
        
        // Fetch listing if we have a listingId to extract AI metadata
        let listingData = {};
        if (data.listingId) {
            const listingSnap = await db.collection("listings").doc(data.listingId).get();
            if (listingSnap.exists) {
                listingData = listingSnap.data();
            }
        }

        // Fetch seller shop details
        const sellerId = data.sellerId || data.shopId;
        let sellerData = {};
        if (sellerId) {
            const shopSnap = await db.collection("shops").where("uid", "==", sellerId).get();
            if (!shopSnap.empty) {
                sellerData = shopSnap.docs[0].data();
            }
        }

        const matchDoc = {
            requestId: data.requestId,
            listingId: data.listingId || null,
            buyerId: data.buyerId,
            sellerId: sellerId,
            part: data.part || 'Component',
            partName: data.partName || data.part || 'Component',
            modelName: data.modelName || 'Unknown',
            grade: listingData.grade || data.grade || null,
            price: listingData.price || data.price || null,
            status: data.status || "pending",
            
            // Seller details for display
            sellerName: sellerData.shopName || 'Unknown Shop',
            sellerAddress: sellerData.area && sellerData.city ? `${sellerData.area}, ${sellerData.city}` : sellerData.address || null,
            sellerPhone: sellerData.phone || null,
            sellerRating: sellerData.rating || null,
            sellerTrades: sellerData.tradesCompleted || 0,
            
            // AI metadata copied from listing or request body
            videoUrl: listingData.videoUrl || data.videoUrl || null,
            imageUrl: listingData.imageUrl || data.imageUrl || null,
            aiPriceSuggestion: listingData.aiPriceSuggestion || data.aiPriceSuggestion || null,
            aiGradeVerifyResult: listingData.aiGradeVerifyResult || data.aiGradeVerifyResult || null,
            aiFakeCheckResult: listingData.aiFakeCheckResult || data.aiFakeCheckResult || null,
            aiRecognitionResult: listingData.aiRecognitionResult || data.aiRecognitionResult || null,
            
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection("matches").add(matchDoc);
        res.json({ id: docRef.id, ...matchDoc });
    } catch (error) {
        console.error("Error creating match:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/matches/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const buyerSnapshot = await db.collection("matches").where("buyerId", "==", userId).get();
        const shopSnapshot = await db.collection("matches").where("sellerId", "==", userId).get();
        
        const matchesMap = new Map();
        buyerSnapshot.forEach(docSnap => matchesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        shopSnapshot.forEach(docSnap => matchesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        
        const matches = Array.from(matchesMap.values());
        res.json(matches);
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/matches/doc/:matchId", async (req, res) => {
    try {
        const { matchId } = req.params;
        const docSnap = await db.collection("matches").doc(matchId).get();
        if (!docSnap.exists) {
            return res.status(404).json({ error: "Match not found" });
        }
        res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        console.error("Error fetching match:", error);
        res.status(500).json({ error: error.message });
    }
});

app.patch("/api/matches/:matchId/status", async (req, res) => {
    try {
        const { matchId } = req.params;
        const { status } = req.body;
        
        const docRef = db.collection("matches").doc(matchId);
        const matchSnap = await docRef.get();
        if (!matchSnap.exists) {
            return res.status(404).json({ error: "Match not found" });
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
        const snapshot = await db.collection("matches").where("sellerId", "==", shopId).get();
        let totalMatches = 0;
        let totalHours = 0;
        
        snapshot.forEach(docSnap => {
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
                status: 'approved',
                rejectionReason: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            res.json({ id: docRef.id, ...data, status: 'approved' });
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

app.get("/api/debug-env", (req, res) => {
  try {
    const envKey = process.env.SERVICE_ACCOUNT_KEY;
    if (!envKey) {
      return res.json({ 
        valid: false, 
        error: "SERVICE_ACCOUNT_KEY environment variable not found",
        usingFallback: true,
        envVarExists: false
      });
    }
    
    const key = JSON.parse(envKey);
    res.json({ 
      type: key.type, 
      project_id: key.project_id, 
      valid: true,
      usingFallback: false,
      envVarExists: true,
      keyLength: envKey.length
    });
  } catch(e) {
    res.json({ 
      valid: false, 
      error: e.message,
      usingFallback: true,
      envVarExists: !!process.env.SERVICE_ACCOUNT_KEY,
      keyLength: process.env.SERVICE_ACCOUNT_KEY?.length || 0
    });
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ReCircuit API running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});