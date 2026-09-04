// Fetches NASDAQ quotes from Twelve Data's /quote endpoint. Replaces Alpha
// Vantage (25 req/day on this project's key) — this key's free tier is
// 800 requests/day, which is enough to run US tickers on the same
// continuous polling loop as the Indian side instead of manual on-demand
// fetches. All NASDAQ tickers go in one comma-separated `symbol=` request
// per poll, same batching approach as the Indian fetcher.

const API_KEY = process.env.TWELVE_DATA_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.TWELVE_DATA_TIMEOUT_MS || 15000);

// tickers: [{ ticker, exchange }] where exchange is 'NASDAQ'.
export async function fetchUSQuotes(tickers) {
  if (tickers.length === 0) return [];
  if (!API_KEY) throw new Error('TWELVE_DATA_API_KEY is not set (check .env)');

  const symbols = tickers.map((t) => t.ticker);
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${API_KEY}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    console.error(`[twelveData] request hung/failed before a response — ${err.message}`);
    return [];
  }
  if (!res.ok) {
    console.error(`[twelveData] request failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const body = await res.json();
  // A single symbol returns a flat quote object; multiple symbols return
  // { SYMBOL: quote, ... }. Normalize to the multi-symbol shape so the loop
  // below doesn't need to special-case count === 1.
  const bySymbol = symbols.length === 1 ? { [symbols[0]]: body } : body;

  const fetchedAt = new Date();
  const quotes = [];
  for (const symbol of symbols) {
    const quote = bySymbol[symbol];
    if (!quote || quote.status === 'error') {
      console.error(`[twelveData] ${symbol}: ${quote?.message || 'no data returned'}`);
      continue;
    }
    const price = Number(quote.close);
    const volume = Number(quote.volume);
    if (!Number.isFinite(price) || !Number.isFinite(volume)) {
      console.error(`[twelveData] ${symbol}: missing/invalid price or volume in response`);
      continue;
    }
    quotes.push({ ticker: symbol, price, volume: Math.trunc(volume), fetchedAt });
  }
  return quotes;
}
