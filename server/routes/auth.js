import { Router } from 'express';
import { pool } from '../db.js';
import { VALID_MARKETS } from '../../lib/market.js';
import { validateThresholds } from '../../lib/thresholds.js';

// Every response that describes a user returns the same shape, so the frontend
// never has to merge a partial user onto the one it already holds. The two
// thresholds are NUMERIC, which pg returns as strings — cast them here for the
// same reason loadUser does.
const USER_COLUMNS = `id, username, preferred_market AS "preferredMarket",
       price_threshold_percent AS "priceThresholdPercent",
       volume_multiplier AS "volumeMultiplier"`;

function toUser(row) {
  return {
    ...row,
    priceThresholdPercent: Number(row.priceThresholdPercent),
    volumeMultiplier: Number(row.volumeMultiplier),
  };
}

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
       RETURNING ${USER_COLUMNS}, (xmax = 0) AS "isNewUser"`,
      [username]
    );
    res.json(toUser(rows[0]));
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
       RETURNING ${USER_COLUMNS}`,
      [market, req.params.username]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
    res.json(toUser(rows[0]));
  } catch (err) {
    next(err);
  }
});

// What "significant" means, per user. The UI only ever sends one of three
// presets, but this is a plain HTTP endpoint and anything can call it, so the
// range check in lib/thresholds.js is the real boundary — not the fact that
// the buttons on screen happen to send sensible numbers.
//
// Both values are required together rather than patched individually: they're
// two halves of one setting ("how sensitive is Pulse"), and the presets move
// them in step.
authRouter.put('/users/:username/thresholds', async (req, res, next) => {
  try {
    const { thresholds, error } = validateThresholds(req.body);
    if (error) return res.status(400).json({ error });

    const { rows } = await pool.query(
      `UPDATE users SET price_threshold_percent = $1, volume_multiplier = $2
       WHERE username = $3
       RETURNING ${USER_COLUMNS}`,
      [thresholds.priceThresholdPercent, thresholds.volumeMultiplier, req.params.username]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
    res.json(toUser(rows[0]));
  } catch (err) {
    next(err);
  }
});
