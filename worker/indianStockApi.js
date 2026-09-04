// Fetches NSE/BSE quotes from a self-hosted instance of 0xramm's
// Indian-Stock-Market-API (Cloudflare Worker, Yahoo Finance-backed, no key
// needed): https://github.com/0xramm/Indian-Stock-Market-API
//
// It isn't a public hosted service — you deploy it yourself (`wrangler deploy`)
// or run it locally (`wrangler dev`, default http://localhost:8787) and point
// INDIAN_STOCK_API_BASE_URL at it.

const BASE_URL = process.env.INDIAN_STOCK_API_BASE_URL || 'http://localhost:8787';
const REQUEST_TIMEOUT_MS = Number(process.env.INDIAN_STOCK_API_TIMEOUT_MS || 15000);

const SUFFIX_BY_EXCHANGE = { NSE: '.NS', BSE: '.BO' };

// tickers: [{ ticker, exchange }] where exchange is 'NSE' or 'BSE'.
// Batched into one /stock/list call (the API mixes NSE/BSE symbols in a
// single request), res=num so fields come back as plain numbers.
export async function fetchIndianQuotes(tickers) {
  if (tickers.length === 0) return [];

  const symbolFor = new Map();
  const symbols = tickers.map(({ ticker, exchange }) => {
    const suffix = SUFFIX_BY_EXCHANGE[exchange];
    if (!suffix) throw new Error(`Unknown Indian exchange "${exchange}" for ticker ${ticker}`);
    const symbol = `${ticker}${suffix}`;
    symbolFor.set(symbol, ticker);
    return symbol;
  });

  const url = `${BASE_URL}/stock/list?symbols=${encodeURIComponent(symbols.join(','))}&res=num`;
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Indian Stock Market API request failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (body.status !== 'success') {
    throw new Error(`Indian Stock Market API returned an error: ${body.message || 'unknown error'}`);
  }

  const fetchedAt = new Date();
  const quotes = [];
  for (const stock of body.stocks || []) {
    const ticker = symbolFor.get(stock.ticker);
    if (!ticker || stock.error || stock.last_price == null || stock.volume == null) continue;
    quotes.push({ ticker, price: stock.last_price, volume: Math.trunc(stock.volume), fetchedAt });
  }
  return quotes;
}
