import 'dotenv/config';
import { pool, getTrackedTickers, recordQuotes } from './db.js';
import { fetchIndianQuotes } from './indianStockApi.js';
import { fetchUSQuotes } from './twelveData.js';

// India (self-hosted Cloudflare Worker proxy, no quota) and US (Twelve Data,
// 800 req/day free tier — one poll = one batched request, so 5 min keeps
// ~288 req/day, a comfortable margin) poll on independent intervals so
// India's cadence isn't held down by the US quota constraint.
const INDIA_POLL_INTERVAL_MS = Number(process.env.INDIA_POLL_INTERVAL_MS || 60 * 1000);
const US_POLL_INTERVAL_MS = Number(process.env.US_POLL_INTERVAL_MS || 5 * 60 * 1000);

// Comma-separated exchange codes to leave out of this run entirely — e.g.
// DISABLE_EXCHANGES=NASDAQ to run India-only and avoid spending Alpha
// Vantage quota while a continuous loop is up for unrelated testing.
const DISABLED_EXCHANGES = new Set(
  (process.env.DISABLE_EXCHANGES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

// Each group polls on its own interval. Add a new exchange here (and its
// column value in tickers) to route it without touching the poll loops.
const GROUPS = [
  { name: 'india', exchanges: new Set(['NSE', 'BSE']), fetcher: fetchIndianQuotes, intervalMs: INDIA_POLL_INTERVAL_MS },
  { name: 'us', exchanges: new Set(['NASDAQ']), fetcher: fetchUSQuotes, intervalMs: US_POLL_INTERVAL_MS },
];

if (DISABLED_EXCHANGES.size > 0) {
  console.log(`[worker] exchanges disabled for this run: ${[...DISABLED_EXCHANGES].join(', ')}`);
}

async function pollGroup(group) {
  const tickers = await getTrackedTickers();
  const tracked = tickers.filter((row) => group.exchanges.has(row.exchange));
  if (tracked.length === 0) return;

  const active = tracked.filter((row) => {
    if (DISABLED_EXCHANGES.has(row.exchange)) {
      console.log(`[worker:${group.name}] ${row.ticker} (${row.exchange}) skipped — exchange disabled for this run`);
      return false;
    }
    return true;
  });

  if (active.length === 0) {
    console.log(`[worker:${group.name}] no tickers are being watched, skipping poll`);
    return;
  }

  let quotes;
  try {
    quotes = await group.fetcher(active);
  } catch (err) {
    console.error(`[worker:${group.name}] fetch failed for ${active.map((g) => g.ticker).join(', ')}:`, err.message);
    return;
  }

  await recordQuotes(quotes);
  console.log(`[worker:${group.name}] recorded ${quotes.length}/${active.length} tracked tickers`);
}

async function warnAboutUnroutedExchanges() {
  const tickers = await getTrackedTickers();
  const routed = new Set(GROUPS.flatMap((g) => [...g.exchanges]));
  for (const row of tickers) {
    if (!routed.has(row.exchange)) {
      console.error(`[worker] no fetcher registered for exchange "${row.exchange}" (ticker ${row.ticker}), skipping`);
    }
  }
}

async function main() {
  console.log(
    `[worker] starting — india poll every ${INDIA_POLL_INTERVAL_MS}ms, us poll every ${US_POLL_INTERVAL_MS}ms`
  );

  await warnAboutUnroutedExchanges();
  await Promise.all(GROUPS.map((group) => pollGroup(group)));

  if (process.env.RUN_ONCE === 'true') {
    await pool.end();
    return;
  }

  for (const group of GROUPS) {
    setInterval(() => {
      pollGroup(group).catch((err) => console.error(`[worker:${group.name}] poll failed:`, err));
    }, group.intervalMs);
  }
}

main().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});
