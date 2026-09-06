import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Railway exposes the database twice: a private-network address that never
// leaves their infrastructure, and a public proxy. Prefer the private one --
// it's faster, doesn't burn proxy bandwidth, and isn't reachable from the
// internet at all. DATABASE_URL remains the fallback for local development,
// where only the public proxy exists.
//
// Railway's own variable naming has varied (DATABASE_PRIVATE_URL in some
// templates, DATABASE_URL pointing at the private host in others), so both
// names are accepted rather than betting on one.
const connectionString = process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_PRIVATE_URL or DATABASE_URL must be set (check .env)');
}

export const pool = new Pool({ connectionString });

// pg emits 'error' on the pool when an *idle* client's connection drops
// (e.g. the DB proxy closing a connection that's sat unused between polls).
// Without a listener here, that's an unhandled EventEmitter error and Node
// kills the whole process — which is exactly what happened during a long-
// running poll loop. Log and keep going; the pool reconnects on next use.
pool.on('error', (err) => {
  console.error('[db] idle client error (pool recovers automatically):', err.message);
});

// Every ticker currently tracked by at least one user, with its exchange —
// the same dedup query PROJECT_CONTEXT.md describes ("SELECT DISTINCT ticker
// FROM watchlist_items"), joined to tickers so callers can route by exchange
// without a second query.
export async function getTrackedTickers() {
  const { rows } = await pool.query(`
    SELECT DISTINCT t.ticker, t.exchange
    FROM watchlist_items w
    JOIN tickers t ON t.ticker = w.ticker
  `);
  return rows;
}

// Builds "($1, $2, ...), ($n, ...)" for a multi-row insert, pushing each row's
// values onto `values` in step. Shared by both writes below so the two can't
// drift out of sync on placeholder arithmetic.
function buildRows(quotes, values, columnsFor) {
  const columnCount = columnsFor(quotes[0]).length;
  return quotes.map((q, i) => {
    const base = i * columnCount;
    values.push(...columnsFor(q));
    return `(${Array.from({ length: columnCount }, (_, n) => `$${base + n + 1}`).join(', ')})`;
  });
}

// market_data.price and price_history.price are NUMERIC(12, 4) — eight digits
// before the point — and volume is BIGINT. A value outside those bounds isn't
// merely wrong, it aborts the INSERT, and since a poll is written as one
// transaction that means one bad ticker discards every good quote alongside it.
//
// Verified against the live database: 1e15 and Infinity both raise "numeric
// field overflow", and NaN is *accepted* and stored as the literal NaN, which
// then renders as "NaN" in the watchlist. So finiteness alone isn't enough —
// the range matters too.
const MAX_NUMERIC_12_4 = 99999999.9999;
const MAX_BIGINT = 9223372036854775807;

function isStorablePrice(value) {
  return Number.isFinite(value) && Math.abs(value) <= MAX_NUMERIC_12_4;
}

function isStorableVolume(value) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_BIGINT;
}

// Drops quotes the database could not accept, so one unusable reading costs
// that ticker rather than the whole poll. This is the backstop, not the first
// line of defence — both fetchers already reject non-numeric price/volume, and
// anything caught here means a fetcher let something through, so it's logged
// per ticker rather than counted silently.
//
// Only price and volume are checked: they're NOT NULL and every row needs
// them. The optional columns all pass through toFiniteOrNull in the fetchers,
// so they're already either a finite number or null — but they share the same
// NUMERIC(12, 4) bound, so an out-of-range one is nulled rather than allowed
// to abort the write.
const OPTIONAL_NUMERIC_FIELDS = ['dayChange', 'dayChangePercent', 'dayOpen', 'previousClose', 'dayHigh', 'dayLow'];

export function rejectUnstorableQuotes(quotes) {
  const storable = [];
  for (const q of quotes) {
    if (!isStorablePrice(Number(q.price)) || !isStorableVolume(Number(q.volume))) {
      console.error(
        `[db] ${q.ticker}: dropped — price/volume outside what the schema can store ` +
          `(price=${q.price}, volume=${q.volume})`
      );
      continue;
    }
    const cleaned = { ...q };
    for (const field of OPTIONAL_NUMERIC_FIELDS) {
      const value = cleaned[field];
      if (value !== null && value !== undefined && !isStorablePrice(Number(value))) {
        console.error(`[db] ${q.ticker}: ${field}=${value} is out of range — storing null instead`);
        cleaned[field] = null;
      }
    }
    storable.push(cleaned);
  }
  return storable;
}

// One poll's quotes, written as one unit: market_data gets the latest reading
// per ticker, price_history gets an appended row per ticker.
//
// Both happen in a single transaction. They're two statements describing the
// same observation, and a history series with gaps where the upsert succeeded
// but the append didn't would be quietly wrong in a way nothing would surface
// later — the chart would just be missing points nobody could account for.
export async function recordQuotes(rawQuotes) {
  const quotes = rejectUnstorableQuotes(rawQuotes);
  if (quotes.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const latestValues = [];
    const latestRows = buildRows(quotes, latestValues, (q) => [
      q.ticker,
      q.price,
      q.volume,
      q.dayChange ?? null,
      q.dayChangePercent ?? null,
      q.dayOpen ?? null,
      q.previousClose ?? null,
      q.dayHigh ?? null,
      q.dayLow ?? null,
      q.fetchedAt,
    ]);

    await client.query(
      `
      INSERT INTO market_data (ticker, price, volume, day_change, day_change_percent,
                               day_open, previous_close, day_high, day_low, fetched_at)
      VALUES ${latestRows.join(', ')}
      ON CONFLICT (ticker)
      DO UPDATE SET price = EXCLUDED.price,
                    volume = EXCLUDED.volume,
                    day_change = EXCLUDED.day_change,
                    day_change_percent = EXCLUDED.day_change_percent,
                    day_open = EXCLUDED.day_open,
                    previous_close = EXCLUDED.previous_close,
                    day_high = EXCLUDED.day_high,
                    day_low = EXCLUDED.day_low,
                    fetched_at = EXCLUDED.fetched_at
      `,
      latestValues
    );

    // A row per poll regardless of whether the price moved, so the series has
    // an even cadence — a flat stretch is data, and inferring it later from
    // gaps would be guesswork.
    const historyValues = [];
    const historyRows = buildRows(quotes, historyValues, (q) => [
      q.ticker,
      q.price,
      q.volume,
      q.fetchedAt,
    ]);

    await client.query(
      `INSERT INTO price_history (ticker, price, volume, recorded_at)
       VALUES ${historyRows.join(', ')}`,
      historyValues
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    // Always back to the pool, or a failing poll leaks a connection each time
    // until the pool is exhausted and the worker wedges.
    client.release();
  }
}
