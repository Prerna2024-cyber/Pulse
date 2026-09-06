import { Router } from 'express';
import { pool } from '../db.js';
import { exchangesForMarket } from '../../lib/market.js';
import { loadUser } from '../middleware/loadUser.js';

export const watchlistRouter = Router();

// LEFT JOIN market_data: a just-added ticker may not have a price yet (the
// worker polls on an interval) — list it anyway rather than hiding it, and
// let the caller show a "waiting for data" state instead of it silently
// disappearing.
watchlistRouter.get('/users/:username/watchlist', loadUser, async (req, res, next) => {
  try {
    const exchanges = exchangesForMarket(req.user.preferredMarket);
    const { rows } = await pool.query(
      `SELECT w.ticker, t.company_name AS "companyName", t.sector, t.exchange,
              m.price, m.volume, m.fetched_at AS "fetchedAt",
              m.day_change AS "dayChange", m.day_change_percent AS "dayChangePercent",
              m.day_open AS "dayOpen", m.previous_close AS "previousClose",
              m.day_high AS "dayHigh", m.day_low AS "dayLow"
       FROM watchlist_items w
       JOIN tickers t ON t.ticker = w.ticker
       LEFT JOIN market_data m ON m.ticker = w.ticker
       WHERE w.user_id = $1 AND t.exchange = ANY($2::text[])
       ORDER BY w.added_at DESC`,
      [req.user.id, exchanges]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.post('/users/:username/watchlist', loadUser, async (req, res, next) => {
  try {
    const ticker = (req.body?.ticker || '').trim().toUpperCase();
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });

    const { rows: tickerRows } = await pool.query('SELECT exchange FROM tickers WHERE ticker = $1', [ticker]);
    if (tickerRows.length === 0) return res.status(404).json({ error: `ticker "${ticker}" not found` });

    // Defense in depth: search/browse already scope by market, but this
    // blocks adding an out-of-market ticker directly (e.g. a stale client,
    // or the user switching markets between search and add).
    const exchanges = exchangesForMarket(req.user.preferredMarket);
    if (!exchanges.includes(tickerRows[0].exchange)) {
      return res.status(400).json({ error: `"${ticker}" isn't available in your market (${req.user.preferredMarket})` });
    }

    const { rows } = await pool.query(
      `INSERT INTO watchlist_items (user_id, ticker) VALUES ($1, $2)
       ON CONFLICT (user_id, ticker) DO NOTHING
       RETURNING ticker, added_at AS "addedAt"`,
      [req.user.id, ticker]
    );

    if (rows.length === 0) return res.status(200).json({ ticker, alreadyWatching: true });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.delete('/users/:username/watchlist/:ticker', loadUser, async (req, res, next) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const { rowCount } = await pool.query('DELETE FROM watchlist_items WHERE user_id = $1 AND ticker = $2', [
      req.user.id,
      ticker,
    ]);
    if (rowCount === 0) return res.status(404).json({ error: `"${ticker}" is not in your watchlist` });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
