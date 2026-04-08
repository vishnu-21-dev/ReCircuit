// Central API helper — all frontend data calls route through here
const API_BASE = '/api';

async function apiFetch(path, options = {}) {
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

export const getMatchesByUser = (userId) =>
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
