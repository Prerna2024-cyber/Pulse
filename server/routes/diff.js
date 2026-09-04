import { Router } from 'express';
import { pool } from '../db.js';
import { exchangesForMarket } from '../../lib/market.js';
import { detectSignificantChange } from '../../lib/significance.js';
import { loadUser } from '../middleware/loadUser.js';

export const diffRouter = Router();

// The core "what changed" flow from PROJECT_CONTEXT.md: join watchlist +
// tickers + market_data + the user's snapshots, run each ticker through the
// significance logic, then overwrite the snapshots with current values so
// the *next* diff compares against what the user is seeing right now.
diffRouter.get('/users/:username/diff', loadUser, async (req, res, next) => {
  try {
    const exchanges = exchangesForMarket(req.user.preferredMarket);
    const { rows } = await pool.query(
      `SELECT w.ticker, t.company_name AS "companyName", t.exchange,
              m.price AS "currentPrice", m.volume AS "currentVolume", m.fetched_at AS "fetchedAt",
              s.price AS "previousPrice", s.volume AS "previousVolume", s.seen_at AS "seenAt"
       FROM watchlist_items w
       JOIN tickers t ON t.ticker = w.ticker
       LEFT JOIN market_data m ON m.ticker = w.ticker
       LEFT JOIN snapshots s ON s.user_id = w.user_id AND s.ticker = w.ticker
       WHERE w.user_id = $1 AND t.exchange = ANY($2::text[])
       ORDER BY t.company_name`,
      [req.user.id, exchanges]
    );

    // No market_data yet (worker hasn't polled this ticker) — nothing to
    // diff or snapshot, surface separately so the frontend can show a
    // "waiting for price data" state instead of treating it as unchanged.
    const withData = rows.filter((r) => r.currentPrice != null);
    const pending = rows
      .filter((r) => r.currentPrice == null)
      .map((r) => ({ ticker: r.ticker, companyName: r.companyName, hasData: false }));

    const changes = withData.map((r) => ({
      ...detectSignificantChange({
        ticker: r.ticker,
        companyName: r.companyName,
        current: { price: Number(r.currentPrice), volume: Number(r.currentVolume) },
        previous: r.previousPrice != null ? { price: Number(r.previousPrice), volume: Number(r.previousVolume) } : null,
      }),
      currentPrice: Number(r.currentPrice),
      currentVolume: Number(r.currentVolume),
      fetchedAt: r.fetchedAt,
      hasData: true,
    }));

    if (withData.length > 0) {
      const values = [];
      const placeholders = withData.map((r, i) => {
        const base = i * 4;
        values.push(req.user.id, r.ticker, r.currentPrice, r.currentVolume);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, now())`;
      });
      await pool.query(
        `INSERT INTO snapshots (user_id, ticker, price, volume, seen_at)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (user_id, ticker)
         DO UPDATE SET price = EXCLUDED.price, volume = EXCLUDED.volume, seen_at = EXCLUDED.seen_at`,
        values
      );
    }

    res.json({ changes, pending });
  } catch (err) {
    next(err);
  }
});
