require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const shopUidCache = new Map(); // shopId -> uid|null

  async function getShopUid(shopId) {
    if (!shopId) return null;
    if (shopUidCache.has(shopId)) return shopUidCache.get(shopId);
    const snap = await db.collection("shops").doc(shopId).get();
    const uid = snap.exists ? snap.data()?.uid || null : null;
    shopUidCache.set(shopId, uid);
    return uid;
  }

  let listingsUpdated = 0;
  let matchesUpdated = 0;

  // ---- listings ----
  {
    const snap = await db.collection("listings").get();
    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data?.sellerUid) continue;

      const shopId = data?.shopId || data?.sellerId || null;
      const sellerUid = await getShopUid(shopId);
      if (!sellerUid) continue;

      batch.update(doc.ref, { sellerUid });
      ops++;
      listingsUpdated++;

      if (ops >= 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();
  }

  // ---- matches ----
  {
    const snap = await db.collection("matches").get();
    let batch = db.batch();
    let ops = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data?.sellerUid) continue;

      let sellerUid = null;

      // Prefer deriving from listing (authoritative)
      const listingId = data?.listingId || null;
      if (listingId) {
        const listingSnap = await db.collection("listings").doc(listingId).get();
        if (listingSnap.exists) {
          const listing = listingSnap.data();
          sellerUid = listing?.sellerUid || null;

          if (!sellerUid) {
            const shopId = listing?.shopId || listing?.sellerId || null;
            sellerUid = await getShopUid(shopId);
          }
        }
      }

      // Fallback: try old match fields
      if (!sellerUid) {
        const shopId = data?.sellerId || data?.shopId || null;
        sellerUid = await getShopUid(shopId);
      }

      if (!sellerUid) continue;

      batch.update(doc.ref, { sellerUid });
      ops++;
      matchesUpdated++;

      if (ops >= 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();
  }

  console.log(
    JSON.stringify(
      { ok: true, listingsUpdated, matchesUpdated, cachedShops: shopUidCache.size },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("migrate_seller_uid failed:", err);
  process.exit(1);
});

