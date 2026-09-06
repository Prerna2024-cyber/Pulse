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

// One poll's quotes, written as one unit: market_data gets the latest reading
// per ticker, price_history gets an appended row per ticker.
//
// Both happen in a single transaction. They're two statements describing the
// same observation, and a history series with gaps where the upsert succeeded
// but the append didn't would be quietly wrong in a way nothing would surface
// later — the chart would just be missing points nobody could account for.
export async function recordQuotes(quotes) {
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
