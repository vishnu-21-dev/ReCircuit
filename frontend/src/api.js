// Central API helper — all frontend data calls route through here
import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Complete frontend-only solution for hackathon demo
const USE_FRONTEND_ONLY = true;

// Mock data for complete demo
const mockData = {
  requests: [
    {
      id: "demo-1",
      category: "Mobile",
      brand: "Apple",
      model: "iPhone 11",
      part: "Screen",
      grade: "A",
      priceOffered: 3000,
      buyerId: "demo-user",
      status: "pending",
      createdAt: new Date().toISOString()
    },
    {
      id: "demo-2",
      category: "Mobile",
      brand: "Samsung",
      model: "Galaxy S20",
      part: "Battery",
      grade: "B",
      priceOffered: 2000,
      buyerId: "demo-user",
      status: "pending",
      createdAt: new Date().toISOString()
    }
  ],
  listings: [
    {
      id: "listing-1",
      brand: "Apple",
      model: "iPhone 11",
      part: "Screen",
      grade: "A",
      price: 5000,
      sellerId: "shop-1",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "listing-2",
      brand: "Samsung",
      model: "Galaxy S20",
      part: "Battery",
      grade: "B",
      price: 2500,
      sellerId: "shop-2",
      status: "active",
      createdAt: new Date().toISOString()
    }
  ],
  shops: [
    {
      id: "shop-1",
      name: "Tech Repair Shop",
      uid: "shop-1",
      status: "approved"
    }
  ]
};

async function apiFetch(path, options = {}) {
  if (USE_FRONTEND_ONLY) {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    
    // Handle different endpoints
    if (path === '/requests') {
      return { ...mockData.requests };
    } else if (path === '/listings') {
      return { ...mockData.listings };
    } else if (path === '/shops') {
      return { ...mockData.shops };
    } else if (path.startsWith('/requests') && options.method === 'POST') {
      const newRequest = { ...JSON.parse(options.body), id: 'demo-' + Date.now() };
      mockData.requests.push(newRequest);
      return newRequest;
    } else if (path.startsWith('/listings') && options.method === 'POST') {
      const newListing = { ...JSON.parse(options.body), id: 'demo-' + Date.now() };
      mockData.listings.push(newListing);
      return newListing;
    } else if (path.startsWith('/ai/compat-suggest')) {
      const data = JSON.parse(options.body);
      return {
        models: [`${data.brand} ${data.model} Pro`, `${data.brand} ${data.model} Max`],
        alternatives: [`${data.brand} ${data.model}`, `${data.brand} ${data.model} SE`],
        compatibility: 95
      };
    } else if (path.startsWith('/ai/price-suggest')) {
      const data = JSON.parse(options.body);
      const basePrice = data.grade === 'A' ? 3000 : data.grade === 'B' ? 2000 : 1500;
      return {
        suggestedPrice: basePrice,
        range: `Rs. ${basePrice - 500} - Rs. ${basePrice + 500}`,
        reasoning: `Price based on market analysis for ${data.grade} grade ${data.part} for ${data.brand} ${data.model}`,
        marketNote: "Competitive pricing based on current market conditions"
      };
    } else if (path === '/compatibility') {
      return {
        "iPhone 11": ["iPhone 11 Pro", "iPhone 11 Pro Max", "iPhone 12", "iPhone 12 Mini"],
        "iPhone 12": ["iPhone 12 Pro", "iPhone 12 Pro Max", "iPhone 13", "iPhone 13 Mini"],
        "Galaxy S20": ["Galaxy S20+", "Galaxy S20 Ultra", "Galaxy S21", "Galaxy S21 FE"],
        "Galaxy S21": ["Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S22", "Galaxy S22 FE"]
      };
    } else if (path === '/search/ai' && options.method === 'POST') {
      const queryData = JSON.parse(options.body);
      const query = queryData.query.toLowerCase();
      
      // Simple AI search mock
      let extractedIntent = { brand: "", model: "", part: "" };
      
      if (query.includes('iphone')) {
        extractedIntent.brand = "Apple";
        if (query.includes('11')) extractedIntent.model = "iPhone 11";
        if (query.includes('12')) extractedIntent.model = "iPhone 12";
        if (query.includes('screen')) extractedIntent.part = "Screen";
        if (query.includes('battery')) extractedIntent.part = "Battery";
      }
      
      if (query.includes('samsung') || query.includes('galaxy')) {
        extractedIntent.brand = "Samsung";
        if (query.includes('s20')) extractedIntent.model = "Galaxy S20";
        if (query.includes('s21')) extractedIntent.model = "Galaxy S21";
        if (query.includes('screen')) extractedIntent.part = "Screen";
        if (query.includes('battery')) extractedIntent.part = "Battery";
      }
      
      return {
        results: mockData.listings.filter(listing => {
          if (extractedIntent.brand && !listing.brand.toLowerCase().includes(extractedIntent.brand.toLowerCase())) return false;
          if (extractedIntent.model && !listing.model.toLowerCase().includes(extractedIntent.model.toLowerCase())) return false;
          if (extractedIntent.part && !listing.part.toLowerCase().includes(extractedIntent.part.toLowerCase())) return false;
          return true;
        }),
        extractedIntent,
        aiUsed: true,
        compatibilityUsed: true,
        message: "Found matching parts using AI search"
      };
    }
    return [];
  }

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
  return apiFetch(`/requests${qs ? `?${qs}` : ''}`);
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
