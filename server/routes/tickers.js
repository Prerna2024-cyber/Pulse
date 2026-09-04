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
