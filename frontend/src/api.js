// Central API helper — all frontend data calls route through here
import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function apiFetch(path, options = {}) {
  // Disable authentication for hackathon demo
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const errorObj = new Error(err.error || `API error ${res.status}`);
    errorObj.status = res.status;
    errorObj.data = err;
    throw errorObj;
  }
  return res.json();
}

// ── Requests ──────────────────────────────────────────
export const getRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/requests-simple${qs ? `?${qs}` : ''}`);
};

export const createRequest = (data) =>
  apiFetch('/requests', { method: 'POST', body: JSON.stringify(data) });

export const deleteRequest = (id) =>
  apiFetch(`/requests/${id}`, { method: 'DELETE' });

export const expireOldRequests = () =>
  apiFetch('/requests/expire-old', { method: 'POST' });

// ── Compatibility ──────────────────────────────────────
export const getCompatibility = () =>
  apiFetch('/compatibility');

// ── Listings ──────────────────────────────────────────
export const getListings = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/listings${qs ? `?${qs}` : ''}`);
};

export const createListing = (data) =>
  apiFetch('/listings', { method: 'POST', body: JSON.stringify(data) });

export const deleteListing = (id) =>
  apiFetch(`/listings/${id}`, { method: 'DELETE' });

export const updateListing = (id, data) =>
  apiFetch(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// ── Matches ───────────────────────────────────────────
export const createMatch = (data) =>
  apiFetch('/matches', { method: 'POST', body: JSON.stringify(data) });

export const getMatches = (userId) =>
  apiFetch(`/matches/${userId}`);

export const getMatchDoc = (matchId) =>
  apiFetch(`/matches/doc/${matchId}`);

export const updateMatchStatus = (matchId, status) =>
  apiFetch(`/matches/${matchId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

// ── Shops ─────────────────────────────────────────────
export const getShops = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/shops${qs ? `?${qs}` : ''}`);
};

export const getShopByUid = (uid) =>
  apiFetch(`/shops/by-uid/${uid}`);

export const getShopById = (shopId) =>
  apiFetch(`/shops/${shopId}`);

export const createShop = (data) =>
  apiFetch('/shops', { method: 'POST', body: JSON.stringify(data) });

export const updateShop = (id, data) =>
  apiFetch(`/shops/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const fetchShopResponseTime = (shopId) =>
  apiFetch(`/shops/${shopId}/response-time`);

// ── AI Search ──────────────────────────────────────────
export const aiSearch = (query) =>
  apiFetch('/search/ai', { method: 'POST', body: JSON.stringify({ query }) });

export const geminiPriceSuggest = (data) =>
  apiFetch('/ai/price-suggest', { method: 'POST', body: JSON.stringify(data) });

export async function geminiCompatSuggest({ category, brand, model, part }) {
  const res = await fetch(`${API_BASE}/ai/compat-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, brand, model, part })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'compat-suggest failed');
  return data.models;
}

// ── Reviews ───────────────────────────────────────────
export const createReview = (data) =>
  apiFetch('/reviews', { method: 'POST', body: JSON.stringify(data) });

export const getShopReviews = (shopId) =>
  apiFetch(`/shops/${shopId}/reviews`);

export const replyToReview = (reviewId, reply) =>
  apiFetch(`/reviews/${reviewId}/reply`, { method: 'PUT', body: JSON.stringify({ reply }) });

// ── AI Visual Recognition ──────────────────────────────
export const visualRecognizePart = (imageBase64) =>
  apiFetch('/ai/visual-recognition', { method: 'POST', body: JSON.stringify({ imageBase64 }) });

// ── AI Fake Listing Detector ───────────────────────────
export const detectFakeListing = (data) =>
  apiFetch('/ai/detect-fake', { method: 'POST', body: JSON.stringify(data) });

// ── AI Grade Verification ──────────────────────────────
export const verifyGrade = (data) =>
  apiFetch('/ai/verify-grade', { method: 'POST', body: JSON.stringify(data) });
