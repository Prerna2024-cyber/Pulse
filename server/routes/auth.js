import { Router } from 'express';
import { pool } from '../db.js';
import { VALID_MARKETS } from '../../lib/market.js';

export const authRouter = Router();

// Minimal auth: username only, upserted on every login. `isNewUser` tells the
// frontend whether to show the market-picker onboarding step — new rows get
// the column default ('India') until the user explicitly picks one via the
// PUT below.
authRouter.post('/login', async (req, res, next) => {
  try {
    const username = (req.body?.username || '').trim();
    if (!username) return res.status(400).json({ error: 'username is required' });

    const { rows } = await pool.query(
      `INSERT INTO users (username) VALUES ($1)
       ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
       RETURNING id, username, preferred_market AS "preferredMarket", (xmax = 0) AS "isNewUser"`,
      [username]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// The onboarding step itself: user picks 'India' or 'US' on first login.
authRouter.put('/users/:username/market', async (req, res, next) => {
  try {
    const { market } = req.body || {};
    if (!VALID_MARKETS.includes(market)) {
      return res.status(400).json({ error: `market must be one of: ${VALID_MARKETS.join(', ')}` });
    }

    const { rows } = await pool.query(
      `UPDATE users SET preferred_market = $1 WHERE username = $2
       RETURNING id, username, preferred_market AS "preferredMarket"`,
      [market, req.params.username]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
