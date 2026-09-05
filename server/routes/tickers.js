import { Router } from 'express';
import { pool } from '../db.js';
import { exchangesForMarket } from '../../lib/market.js';
import { loadUser } from '../middleware/loadUser.js';

export const tickersRouter = Router();

// Search by company name (schema.sql query #1), scoped to the caller's market.
tickersRouter.get('/tickers/search', loadUser, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'q is required' });

    const exchanges = exchangesForMarket(req.user.preferredMarket);
    const { rows } = await pool.query(
      `SELECT ticker, company_name AS "companyName", sector, exchange
       FROM tickers
       WHERE company_name ILIKE '%' || $1 || '%' AND exchange = ANY($2::text[])
       ORDER BY company_name
       LIMIT 10`,
      [q, exchanges]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Most-watched tickers across all users (schema.sql query #3), scoped to the
// caller's market like search and browse. This is the query idx_watchlist_ticker
// was built to serve.
//
// COUNT(*) is the watcher count rather than a row count: watchlist_items is
// UNIQUE (user_id, ticker), so one row per ticker per user already. Cast to
// ::int because pg hands back bigint as a string, which would render as one.
tickersRouter.get('/tickers/trending', loadUser, async (req, res, next) => {
  try {
    const exchanges = exchangesForMarket(req.user.preferredMarket);
    const { rows } = await pool.query(
      `SELECT w.ticker, t.company_name AS "companyName", t.sector, t.exchange,
              COUNT(*)::int AS "watcherCount"
       FROM watchlist_items w
       JOIN tickers t ON t.ticker = w.ticker
       WHERE t.exchange = ANY($1::text[])
       GROUP BY w.ticker, t.company_name, t.sector, t.exchange
       -- company_name breaks ties so the list doesn't reshuffle between
       -- loads when several tickers share a watcher count.
       ORDER BY "watcherCount" DESC, t.company_name
       LIMIT 10`,
      [exchanges]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Browse, optionally by sector (schema.sql query #2), scoped to the caller's market.
tickersRouter.get('/tickers', loadUser, async (req, res, next) => {
  try {
    const { sector } = req.query;
    const exchanges = exchangesForMarket(req.user.preferredMarket);
    const params = [exchanges];
    let where = 'exchange = ANY($1::text[])';
    if (sector) {
      params.push(sector);
      where += ` AND sector = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT ticker, company_name AS "companyName", sector, exchange
       FROM tickers WHERE ${where} ORDER BY company_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
