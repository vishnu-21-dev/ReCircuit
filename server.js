require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        let aiUsed = false;
        let compatibilityUsed = false;
        let extractedIntent = { brand: "", model: "", part: "" };

        try {
            const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBKgGmo1ze4DOM2chQtKLXO8m3thVI_g0U", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract the device brand, device model, and part needed from this text. Return ONLY a valid JSON object with exactly these fields: { brand: string, model: string, part: string }. If any field cannot be determined, use an empty string. Do not include any explanation, markdown, or backticks. Text: ${query}`
                        }]
                    }]
                })
            });

            if (geminiRes.ok) {
                const data = await geminiRes.json();
                let text = data.candidates[0].content.parts[0].text.trim();
                
                // Parse JSON. Sometimes Gemini returns it wrapped in ```json
                if (text.startsWith("```json")) {
                    text = text.replace(/^```json/, "").replace(/```$/, "").trim();
                } else if (text.startsWith("```")) {
                    text = text.replace(/^```/, "").replace(/```$/, "").trim();
                }
                
                const parsed = JSON.parse(text);
                extractedIntent = {
                    brand: parsed.brand || "",
                    model: parsed.model || "",
                    part: parsed.part || ""
                };
                aiUsed = true;
            }
        } catch (error) {
            console.error("Gemini AI error:", error);
            aiUsed = false;
        }

        const snapshot = await db.collection("listings").where("status", "==", "available").get();
        const listings = [];
        snapshot.forEach(docSnap => listings.push({ id: docSnap.id, ...docSnap.data() }));

        let finalResults = [];
        let message = undefined;

        if (aiUsed) {
            const { brand, model, part } = extractedIntent;
            if (!brand && !model && !part) {
                return res.json({
                    results: [],
                    extractedIntent,
                    aiUsed: true,
                    compatibilityUsed: false,
                    message: "Could not understand the query, please try the filters below"
                });
            }

            let compModels = [];
            if (model) {
                const compSnap = await db.collection("compatibility").get();
                compSnap.forEach(docSnap => {
                    const docId = docSnap.id.replace(/-/g, '/');
                    if (docId.toLowerCase() === model.toLowerCase()) {
                        compModels = docSnap.data().compatibleWith || [];
                    }
                });
            }

            const cleanBrand = brand.toLowerCase();
            const cleanModel = model.toLowerCase();
            const cleanPart = part.toLowerCase();

            listings.forEach(listing => {
                let score = 0;
                let usedCompat = false;

                const lBrand = (listing.brand || "").toLowerCase();
                const lModel = (listing.model || "").toLowerCase();
                const lPart = (listing.part || "").toLowerCase();
                
                if (cleanBrand && lBrand.includes(cleanBrand)) score += 1;
                if (cleanModel && lModel.includes(cleanModel)) score += 1;
                if (cleanPart && lPart.includes(cleanPart)) score += 1;

                if (cleanModel && Array.isArray(listing.compatibleModels)) {
                    if (listing.compatibleModels.some(m => m.toLowerCase() === cleanModel)) {
                        score += 1;
                        usedCompat = true;
                    }
                }

                if (compModels.length > 0 && lModel) {
                    if (compModels.some(m => m.toLowerCase() === lModel)) {
                        score += 1;
                        usedCompat = true;
                    }
                }

                if (score > 0) {
                    finalResults.push({ ...listing, _score: score });
                    if (usedCompat) compatibilityUsed = true;
                }
            });

            finalResults.sort((a, b) => b._score - a._score);
            finalResults = finalResults.map(l => {
                const { _score, ...rest } = l;
                return rest;
            });
        } else {
            const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
            const filler = ["i", "my", "a", "the", "for", "need", "want", "is", "are", "not", "working", "broken", "dead", "cracked", "draining", "fast", "slow"];
            const searchTokens = tokens.filter(t => !filler.includes(t));

            listings.forEach(listing => {
                let score = 0;
                const fieldStr = `${listing.brand || ""} ${listing.model || ""} ${listing.part || ""}`.toLowerCase();
                searchTokens.forEach(t => {
                    if (fieldStr.includes(t)) score += 1;
                });
                if (score > 0) {
                    finalResults.push({ ...listing, _score: score });
                }
            });

            finalResults.sort((a, b) => b._score - a._score);
            finalResults = finalResults.map(l => {
                const { _score, ...rest } = l;
                return rest;
            });
            compatibilityUsed = false;
        }

        res.json({
            results: finalResults,
            extractedIntent,
            aiUsed,
            compatibilityUsed,
            ...(message && { message })
        });
    } catch (error) {
        console.error("AI search error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== MATCHES ====================
app.post("/api/matches", async (req, res) => {
    try {
        const data = req.body;
        const docRef = await db.collection("matches").add({
            requestId: data.requestId,
            listingId: data.listingId || null,
            buyerId: data.buyerId,
            sellerId: data.sellerId || data.shopId,
            part: data.part || 'Component',
            partName: data.partName || data.part || 'Component',
            modelName: data.modelName || 'Unknown',
            status: data.status || "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        res.json({ id: docRef.id, ...data });
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