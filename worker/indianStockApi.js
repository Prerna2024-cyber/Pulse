// Fetches NSE/BSE quotes from a self-hosted instance of 0xramm's
// Indian-Stock-Market-API (Cloudflare Worker, Yahoo Finance-backed, no key
// needed): https://github.com/0xramm/Indian-Stock-Market-API
//
// It isn't a public hosted service — you deploy it yourself (`wrangler deploy`)
// or run it locally (`wrangler dev`, default http://localhost:8787) and point
// INDIAN_STOCK_API_BASE_URL at it.
//
// WHY ONE REQUEST PER TICKER, NOT ONE BATCHED CALL:
// this used to call /stock/list, which takes a comma-separated symbol list and
// returns every quote in a single request. That endpoint is documented as
// "batched, no sector field" and it is genuinely narrower — it returns only
// last_price, change, percent_change, volume, market_cap and pe_ratio. It has
// never returned previous_close, open, day_high or day_low in either response
// format, so those fields were not being discarded here; they were never
// arriving. Only /stock?symbol=ONE carries them.
//
// The cost of the switch is real: one poll is now N requests instead of 1.
// At the current handful of tracked Indian tickers on a 60s cadence that's
// still a small fraction of a Cloudflare Worker's free daily allowance, but it
// scales with watchlist size — roughly 1440 requests per ticker per day — so a
// watchlist in the high tens would want a slower INDIA_POLL_INTERVAL_MS or a
// split cadence (open/high/low move far more slowly than last_price).
//
// One thing does improve: a single bad symbol used to fail the whole batch and
// lose every quote in it. Now each ticker succeeds or fails on its own.

import { toFiniteOrNull } from '../lib/quote.js';

const BASE_URL = process.env.INDIAN_STOCK_API_BASE_URL || 'http://localhost:8787';
const REQUEST_TIMEOUT_MS = Number(process.env.INDIAN_STOCK_API_TIMEOUT_MS || 15000);

// Enough parallelism to keep a poll quick without opening a burst of sockets
// at the upstream worker all at once.
const MAX_CONCURRENT = Number(process.env.INDIAN_STOCK_API_CONCURRENCY || 4);

const SUFFIX_BY_EXCHANGE = { NSE: '.NS', BSE: '.BO' };

async function fetchOne({ ticker, exchange }, fetchedAt) {
  const suffix = SUFFIX_BY_EXCHANGE[exchange];
  if (!suffix) throw new Error(`Unknown Indian exchange "${exchange}" for ticker ${ticker}`);

  const url = `${BASE_URL}/stock?symbol=${encodeURIComponent(`${ticker}${suffix}`)}&res=num`;
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`request failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'unknown error');
  }

  const stock = body.data;
  if (stock.last_price == null || stock.volume == null) {
    throw new Error('missing price or volume in response');
  }

  // Everything past price and volume is optional — a quote without a day
  // change or without a session range is still a usable price, so each is
  // normalized to null rather than dropping the row.
  return {
    ticker,
    price: stock.last_price,
    volume: Math.trunc(stock.volume),
    dayChange: toFiniteOrNull(stock.change),
    dayChangePercent: toFiniteOrNull(stock.percent_change),
    dayOpen: toFiniteOrNull(stock.open),
    previousClose: toFiniteOrNull(stock.previous_close),
    dayHigh: toFiniteOrNull(stock.day_high),
    dayLow: toFiniteOrNull(stock.day_low),
    fetchedAt,
  };
}

// tickers: [{ ticker, exchange }] where exchange is 'NSE' or 'BSE'.
export async function fetchIndianQuotes(tickers) {
  if (tickers.length === 0) return [];

  // One timestamp for the whole poll, so every row written by this cycle
  // carries the same fetched_at — same as when this was a single request.
  const fetchedAt = new Date();
  const queue = [...tickers];
  const quotes = [];

  // A fixed pool of workers pulling from a shared queue: keeps at most
  // MAX_CONCURRENT requests in flight regardless of how long the list is.
  const runner = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      try {
        quotes.push(await fetchOne(next, fetchedAt));
      } catch (err) {
        // Logged, not thrown: one unavailable ticker shouldn't cost the poll
        // every other quote it already has.
        console.error(`[indianStockApi] ${next.ticker} (${next.exchange}): ${err.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, tickers.length) }, runner));
  return quotes;
}
