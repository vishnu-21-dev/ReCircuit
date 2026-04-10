require("dotenv").config();
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Backfill migration:
 * - matches.buyerUid <- matches.buyerId (if buyerUid missing)
 * - matches.sellerUid <- matches.sellerId (if it looks like a Firebase uid)
 *   otherwise <- shops/{sellerId}.uid (if sellerId was a shop doc id)
 *
 * Safety:
 * - By default does NOT delete old fields.
 * - Set CLEANUP_OLD_FIELDS=true to delete buyerId/sellerId after backfill.
 */
async function main() {
  const cleanup = String(process.env.CLEANUP_OLD_FIELDS || "").toLowerCase() === "true";
  const shopUidCache = new Map(); // shopId -> uid|null

  async function getShopUid(shopId) {
    if (!shopId) return null;
    if (shopUidCache.has(shopId)) return shopUidCache.get(shopId);
    const snap = await db.collection("shops").doc(shopId).get();
    const uid = snap.exists ? snap.data()?.uid || null : null;
    shopUidCache.set(shopId, uid);
    return uid;
  }

  function looksLikeUid(value) {
    return typeof value === "string" && value.length >= 12 && !value.includes("/");
  }

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  const snap = await db.collection("matches").get();
  let batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    scanned++;
    const data = doc.data() || {};
    const patch = {};

    if (!data.buyerUid && typeof data.buyerId === "string" && data.buyerId && !data.buyerId.includes("/")) {
      patch.buyerUid = data.buyerId;
      if (cleanup) patch.buyerId = admin.firestore.FieldValue.delete();
    }

    if (!data.sellerUid) {
      const legacySellerId = data.sellerId || null;

      if (looksLikeUid(legacySellerId)) {
        patch.sellerUid = legacySellerId;
        if (cleanup) patch.sellerId = admin.firestore.FieldValue.delete();
      } else if (typeof legacySellerId === "string" && legacySellerId) {
        const uid = await getShopUid(legacySellerId);
        if (uid) {
          patch.sellerUid = uid;
          if (cleanup) patch.sellerId = admin.firestore.FieldValue.delete();
        }
      }
    } else if (cleanup && data.sellerId !== undefined) {
      // sellerUid already present; optionally remove legacy field
      patch.sellerId = admin.firestore.FieldValue.delete();
    }

    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }

    batch.update(doc.ref, patch);
    ops++;
    updated++;

    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();

  console.log(
    JSON.stringify(
      { ok: true, scanned, updated, skipped, cleanupOldFields: cleanup, cachedShops: shopUidCache.size },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("migrate_match_uids failed:", err);
  process.exit(1);
});

