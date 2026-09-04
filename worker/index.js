import 'dotenv/config';
import { pool, getTrackedTickers, upsertMarketData } from './db.js';
import { fetchIndianQuotes } from './indianStockApi.js';
import { fetchUSQuotes } from './twelveData.js';

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 5 * 60 * 1000);

// Comma-separated exchange codes to leave out of this run entirely — e.g.
// DISABLE_EXCHANGES=NASDAQ to run India-only and avoid spending Alpha
// Vantage quota while a continuous loop is up for unrelated testing.
const DISABLED_EXCHANGES = new Set(
  (process.env.DISABLE_EXCHANGES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

// Exchange -> which fetch function owns it. Add a new exchange here (and its
// column value in tickers) to route it without touching the poll loop.
const FETCHERS_BY_EXCHANGE = {
  NSE: fetchIndianQuotes,
  BSE: fetchIndianQuotes,
  NASDAQ: fetchUSQuotes,
};

if (DISABLED_EXCHANGES.size > 0) {
  console.log(`[worker] exchanges disabled for this run: ${[...DISABLED_EXCHANGES].join(', ')}`);
}

async function pollOnce() {
  const tickers = await getTrackedTickers();
  if (tickers.length === 0) {
    console.log('[worker] no tickers are being watched, skipping poll');
    return;
  }

  const byExchange = new Map();
  for (const row of tickers) {
    if (DISABLED_EXCHANGES.has(row.exchange)) {
      console.log(`[worker] ${row.ticker} (${row.exchange}) skipped — exchange disabled for this run`);
      continue;
    }
    const fetcher = FETCHERS_BY_EXCHANGE[row.exchange];
    if (!fetcher) {
      console.error(`[worker] no fetcher registered for exchange "${row.exchange}" (ticker ${row.ticker}), skipping`);
      continue;
    }
    if (!byExchange.has(fetcher)) byExchange.set(fetcher, []);
    byExchange.get(fetcher).push(row);
  }

  const allQuotes = [];
  for (const [fetcher, group] of byExchange) {
    try {
      const quotes = await fetcher(group);
      allQuotes.push(...quotes);
    } catch (err) {
      console.error(`[worker] fetch failed for ${group.map((g) => g.ticker).join(', ')}:`, err.message);
    }
  }

  await upsertMarketData(allQuotes);
  console.log(`[worker] upserted ${allQuotes.length}/${tickers.length} tracked tickers`);
}

async function main() {
  console.log(`[worker] starting, poll interval ${POLL_INTERVAL_MS}ms`);
  await pollOnce();

  if (process.env.RUN_ONCE === 'true') {
    await pool.end();
    return;
  }

  setInterval(() => {
    pollOnce().catch((err) => console.error('[worker] poll failed:', err));
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});
