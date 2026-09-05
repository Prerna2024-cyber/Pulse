const BASE = '/api';

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

export const getTrending = (username) =>
  request(`/tickers/trending?username=${encodeURIComponent(username)}`);

export const getWatchlist = (username) => request(`/users/${encodeURIComponent(username)}/watchlist`);

export const addTicker = (username, ticker) =>
  request(`/users/${encodeURIComponent(username)}/watchlist`, { method: 'POST', body: JSON.stringify({ ticker }) });

export const removeTicker = (username, ticker) =>
  request(`/users/${encodeURIComponent(username)}/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' });

export const getDiff = (username) => request(`/users/${encodeURIComponent(username)}/diff`);
