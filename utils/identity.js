function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function getBuyerUid(doc) {
  const buyerUid = doc?.buyerUid;
  if (isNonEmptyString(buyerUid)) return buyerUid;
  throw new Error("Missing buyerUid");
}

function getSellerUid(doc) {
  const sellerUid = doc?.sellerUid;
  if (isNonEmptyString(sellerUid)) return sellerUid;
  throw new Error("Missing sellerUid");
}

module.exports = { getBuyerUid, getSellerUid };

