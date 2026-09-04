import { pool } from '../db.js';

// Auth is minimal by design (username only, no passwords/sessions — see
// README). Every user-scoped route resolves ?username= or :username to a
// real user row here, so search/browse/watchlist all filter by the same
// preferred_market consistently instead of each route re-deriving it.
export async function loadUser(req, res, next) {
  try {
    const username = req.params.username || req.query.username;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const { rows } = await pool.query(
      `SELECT id, username, preferred_market AS "preferredMarket" FROM users WHERE username = $1`,
      [username]
    );
    if (rows.length === 0) return res.status(404).json({ error: `user "${username}" not found` });

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}
