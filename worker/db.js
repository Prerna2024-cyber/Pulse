import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set (check .env)');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

export async function upsertMarketData(quotes) {
  if (quotes.length === 0) return;

  const COLUMNS = 6;
  const values = [];
  const placeholders = quotes.map((q, i) => {
    const base = i * COLUMNS;
    values.push(q.ticker, q.price, q.volume, q.dayChange ?? null, q.dayChangePercent ?? null, q.fetchedAt);
    return `(${Array.from({ length: COLUMNS }, (_, n) => `$${base + n + 1}`).join(', ')})`;
  });

  await pool.query(
    `
    INSERT INTO market_data (ticker, price, volume, day_change, day_change_percent, fetched_at)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (ticker)
    DO UPDATE SET price = EXCLUDED.price,
                  volume = EXCLUDED.volume,
                  day_change = EXCLUDED.day_change,
                  day_change_percent = EXCLUDED.day_change_percent,
                  fetched_at = EXCLUDED.fetched_at
    `,
    values
  );
}
