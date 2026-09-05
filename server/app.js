import express from 'express';
import { authRouter } from './routes/auth.js';
import { tickersRouter } from './routes/tickers.js';
import { watchlistRouter } from './routes/watchlist.js';
import { diffRouter } from './routes/diff.js';

export const app = express();

// In development the frontend is same-origin: Vite proxies /api to this
// server, so the browser never makes a cross-origin request. Deployed, they're
// on different hosts entirely (a static host for the frontend, Railway for
// this), and without these headers the browser blocks every call before it
// leaves the page.
//
// An explicit allowlist rather than '*': this API takes a username in the path
// and will happily act on it, so anything that can reach it can modify a
// watchlist. Keeping it to the origins we actually serve costs nothing and
// means a stray site can't drive it from someone else's browser.
//
// CORS_ORIGIN is a comma-separated list. Unset means no cross-origin access,
// which is the correct default for local development.
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const { origin } = req.headers;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    // The response varies by Origin, so a cache must not serve one origin's
    // response to another.
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  // Preflight ends here — it never needs to reach a route.
  if (req.method === 'OPTIONS') return res.sendStatus(origin && ALLOWED_ORIGINS.has(origin) ? 204 : 403);
  next();
});

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', authRouter);
app.use('/api', tickersRouter);
app.use('/api', watchlistRouter);
app.use('/api', diffRouter);

app.use((req, res) => res.status(404).json({ error: 'not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'malformed JSON body' });
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});
