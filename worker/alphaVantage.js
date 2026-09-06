// Fetches NASDAQ quotes from Alpha Vantage's GLOBAL_QUOTE endpoint.
//
// NOT currently wired up — worker/index.js imports fetchUSQuotes from
// twelveData.js instead (25 req/day here was too tight for continuous
// polling). Kept working in case you ever want to switch back; swap the
// import in index.js to re-enable it.
//
// Confirmed against this project's key: free tier is capped at 25 requests/day
// (not per-minute) — Alpha Vantage returns a 200 with an "Information" field
// instead of an error status when you're over the cap, so that's checked
// explicitly below rather than relying on res.ok. Calls are still made
// sequentially with a delay (tune ALPHA_VANTAGE_DELAY_MS) in case your key is
// on an older/higher-limit plan.

import { positiveIntFromEnv } from '../lib/env.js';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const DELAY_MS = positiveIntFromEnv('ALPHA_VANTAGE_DELAY_MS', 12000);
const REQUEST_TIMEOUT_MS = positiveIntFromEnv('ALPHA_VANTAGE_TIMEOUT_MS', 15000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// tickers: [{ ticker, exchange }] where exchange is 'NASDAQ'.
export async function fetchUSQuotes(tickers) {
  if (tickers.length === 0) return [];
  if (!API_KEY) throw new Error('ALPHA_VANTAGE_API_KEY is not set (check .env)');

  const quotes = [];
  for (let i = 0; i < tickers.length; i++) {
    const { ticker } = tickers[i];
    if (i > 0) await sleep(DELAY_MS);

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${API_KEY}`;
    let res;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (err) {
      console.error(`[alphaVantage] ${ticker}: request hung/failed before a response — ${err.message}`);
      continue;
    }
    if (!res.ok) {
      console.error(`[alphaVantage] ${ticker}: request failed ${res.status} ${res.statusText}`);
      continue;
    }
    const body = await res.json();
    const quote = body['Global Quote'];
    const price = quote?.['05. price'];
    const volume = quote?.['06. volume'];

    if (body.Note || body.Information) {
      console.error(`[alphaVantage] ${ticker}: rate limited or invalid key — ${body.Note || body.Information}`);
      continue;
    }
    if (!price || !volume) {
      console.error(`[alphaVantage] ${ticker}: no quote data returned (market closed or bad symbol)`);
      continue;
    }

    quotes.push({ ticker, price: Number(price), volume: Math.trunc(Number(volume)), fetchedAt: new Date() });
  }
  return quotes;
}
