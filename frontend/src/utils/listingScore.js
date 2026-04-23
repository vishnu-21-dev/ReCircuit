export function calculateCompletenessScore(listing = {}) {
  let score = 0;
  const missing = [];

  // Check for part name (either part or partName)
  if ((listing.part && listing.part.trim() !== '') || (listing.partName && listing.partName.trim() !== '')) {
    score += 20;
  } else {
    missing.push('Add a part name');
  }

  // Description is optional, check category instead for dropdown scoring
  if (listing.category && listing.category.trim() !== '') {
    score += 20;
  } else {
    missing.push('Select a category');
  }

  const priceNum = Number(listing.price);
  if (priceNum > 0) {
    score += 20;
  } else {
    missing.push('Set a price greater than 0');
  }

  // Check for grade/condition (either grade or condition)
  if ((listing.grade && listing.grade.trim() !== '') || (listing.condition && listing.condition.trim() !== '')) {
    score += 20;
  } else {
    missing.push('Select a grade (A, B, C, or D)');
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
