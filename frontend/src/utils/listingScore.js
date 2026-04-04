export function calculateCompletenessScore(listing = {}) {
  let score = 0;
  const missing = [];

  if (listing.partName && listing.partName.trim() !== '') {
    score += 20;
  } else {
    missing.push('Add a part name');
  }

  if (listing.description && listing.description.trim().length > 30) {
    score += 20;
  } else {
    missing.push('Add a description longer than 30 characters');
  }

  const priceNum = Number(listing.price);
  if (priceNum > 0) {
    score += 20;
  } else {
    missing.push('Set a price greater than 0');
  }

  if (listing.condition && listing.condition.trim() !== '') {
    score += 20;
  } else {
    missing.push('Select a condition or grade');
  }

  const hasCompatible =
    (Array.isArray(listing.compatibleDevices) && listing.compatibleDevices.length > 0) ||
    (Array.isArray(listing.compatibleModels) && listing.compatibleModels.length > 0);

  if (hasCompatible) {
    score += 20;
  } else {
    missing.push('Add at least one compatible device or model');
  }

  return { score, missing };
}
