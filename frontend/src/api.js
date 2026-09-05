// Same-origin in development: Vite proxies /api straight to the Express
// server, so no host is needed and no CORS is involved. A deployed build has
// no such proxy, so the full backend origin is baked in at build time via
// VITE_API_BASE_URL (e.g. https://pulse-api.up.railway.app/api). Note it
// includes the /api suffix, because every path below is relative to it.
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  // DELETE returns 204 with no body — .json() on empty text throws, so treat
  // that as "no payload" rather than an error.
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export const login = (username) => request('/login', { method: 'POST', body: JSON.stringify({ username }) });

export const setMarket = (username, market) =>
  request(`/users/${encodeURIComponent(username)}/market`, { method: 'PUT', body: JSON.stringify({ market }) });

export const searchTickers = (username, q) =>
  request(`/tickers/search?q=${encodeURIComponent(q)}&username=${encodeURIComponent(username)}`);

// No username: this one is public, for the pre-login landing screen.
export const getLiveMarket = () => request('/market/live');

export const getTrending = (username) =>
  request(`/tickers/trending?username=${encodeURIComponent(username)}`);

export const getWatchlist = (username) => request(`/users/${encodeURIComponent(username)}/watchlist`);

export const addTicker = (username, ticker) =>
  request(`/users/${encodeURIComponent(username)}/watchlist`, { method: 'POST', body: JSON.stringify({ ticker }) });

export const removeTicker = (username, ticker) =>
  request(`/users/${encodeURIComponent(username)}/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' });

export const getDiff = (username) => request(`/users/${encodeURIComponent(username)}/diff`);

// Same diff, but leaves the snapshots alone — for surfaces that display what
// changed without that counting as the user having checked. See diff.js.
export const peekDiff = (username) =>
  request(`/users/${encodeURIComponent(username)}/diff?peek=1`);

export const getSectors = (username) =>
  request(`/tickers/sectors?username=${encodeURIComponent(username)}`);

export const getTickersBySector = (username, sector) =>
  request(`/tickers?sector=${encodeURIComponent(sector)}&username=${encodeURIComponent(username)}`);
