import 'dotenv/config';
import { pool, getTrackedTickers, recordQuotes } from './db.js';
import { installProcessGuards } from '../lib/processGuards.js';
import { fetchIndianQuotes } from './indianStockApi.js';
import { fetchUSQuotes } from './twelveData.js';
import { isWithinPollWindow, marketStatus, POST_CLOSE_GRACE_MINUTES } from '../lib/marketHours.js';

// This process runs unattended for hours. A stray rejection anywhere in a
// poll cycle would otherwise end it silently and it would never come back.
//
// Exit on an uncaught exception only where something will restart us. Railway
// injects RAILWAY_ENVIRONMENT into every deploy, so this is strict in
// production and lenient on a laptop, where exiting would just mean staying
// down. Nothing to remember to configure, and nothing to forget.
const SUPERVISED = Boolean(process.env.RAILWAY_ENVIRONMENT);
installProcessGuards('worker', { exitOnUncaught: SUPERVISED });

// India (self-hosted Cloudflare Worker proxy) and US (Twelve Data) poll on
// independent intervals so India's cadence isn't held down by the US quota.
//
// Twelve Data bills per SYMBOL, not per request — a batched call for N symbols
// costs N credits. An earlier note here claimed the opposite and concluded the
// 5-minute cadence left "a comfortable margin"; it did not. At 3 US tickers,
// round-the-clock polling cost 288 x 3 = 864 credits/day against a free-tier
// limit of 800/day (and 8/minute), so the US side ran out before midnight.
// Confirmed against the live /api_usage endpoint, which reports
// plan_daily_limit 800 and plan_limit 8.
//
// Polling only while the market is open is what brings that back under the
// limit: ~6.5h of NASDAQ session at 5 minutes is ~78 polls x 3 symbols = ~234
// credits/day. The Indian side drops from ~8,640 requests/day to ~2,250 for
// the same reason. Both numbers scale with ticker count, so they are a
// starting margin rather than a permanent one.
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

// Polling a closed market re-fetches a price that cannot have changed, which
// costs quota and stores nothing new. Set to true to poll regardless — useful
// for `npm run worker:once` outside trading hours, when skipping every group
// would otherwise make a manual check look broken.
const IGNORE_MARKET_HOURS = process.env.IGNORE_MARKET_HOURS === 'true';

// Each group polls on its own interval. Add a new exchange here (and its
// column value in tickers) to route it without touching the poll loops.
// `market` keys into lib/marketHours.js, which owns the trading calendar.
const GROUPS = [
  { name: 'india', market: 'India', exchanges: new Set(['NSE', 'BSE']), fetcher: fetchIndianQuotes, intervalMs: INDIA_POLL_INTERVAL_MS },
  { name: 'us', market: 'US', exchanges: new Set(['NASDAQ']), fetcher: fetchUSQuotes, intervalMs: US_POLL_INTERVAL_MS },
];

if (DISABLED_EXCHANGES.size > 0) {
  console.log(`[worker] exchanges disabled for this run: ${[...DISABLED_EXCHANGES].join(', ')}`);
}

async function pollGroup(group) {
  // Checked before the database is touched: a closed market shouldn't cost a
  // query every minute either. Logged every time rather than silently — an
  // idle worker and a broken one look identical in the logs otherwise. This
  // replaces the "recorded" line one-for-one, so it adds no log volume.
  if (!IGNORE_MARKET_HOURS && !isWithinPollWindow(group.market)) {
    const status = marketStatus(group.market);
    const reason = status ? `${status.exchange} is closed. ${status.detail}.` : 'market is closed.';
    console.log(`[worker:${group.name}] skipped, idle by design — ${reason}`);
    return;
  }

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

// A poll that can't throw. The fetch inside pollGroup is already guarded, but
// the database write isn't, and a failed write used to reach main() unhandled
// and take the process with it.
async function safePoll(group) {
  try {
    await pollGroup(group);
  } catch (err) {
    console.error(`[worker:${group.name}] poll failed:`, err.message);
  }
}

async function main() {
  console.log(
    `[worker] starting — india poll every ${INDIA_POLL_INTERVAL_MS}ms, us poll every ${US_POLL_INTERVAL_MS}ms`
  );
  console.log(
    IGNORE_MARKET_HOURS
      ? '[worker] IGNORE_MARKET_HOURS=true — polling regardless of trading hours'
      : `[worker] polling only during market hours, plus ${POST_CLOSE_GRACE_MINUTES} min past the close`
  );

  // A one-shot run is a manual check, so let it fail loudly and exit non-zero
  // — that's the useful behaviour for something a person is watching.
  const runOnce = process.env.RUN_ONCE === 'true';
  if (runOnce) {
    await warnAboutUnroutedExchanges();
    await Promise.all(GROUPS.map((group) => pollGroup(group)));
    await pool.end();
    return;
  }

  // The continuous worker is the opposite: it has to outlive a bad moment.
  // A database or upstream hiccup at boot is usually transient and the loop
  // below would have recovered on the next tick, but the first poll's failure
  // reached main() and exited — and with nothing supervising this process,
  // exiting means staying down until someone notices.
  try {
    await warnAboutUnroutedExchanges();
  } catch (err) {
    console.error('[worker] could not check exchange routing:', err.message);
  }

  await Promise.all(GROUPS.map((group) => safePoll(group)));

  for (const group of GROUPS) {
    setInterval(() => safePoll(group), group.intervalMs);
  }
}

main().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});
