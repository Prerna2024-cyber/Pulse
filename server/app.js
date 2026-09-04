import express from 'express';
import { authRouter } from './routes/auth.js';
import { tickersRouter } from './routes/tickers.js';
import { watchlistRouter } from './routes/watchlist.js';
import { diffRouter } from './routes/diff.js';

export const app = express();
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
