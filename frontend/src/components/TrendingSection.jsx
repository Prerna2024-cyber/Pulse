import { useCallback, useEffect, useState } from 'react';
import { getTrending } from '../api.js';

// What everyone else is tracking — discovery for beginners who don't yet know
// which tickers to look for, and the payoff for the GROUP BY that
// idx_watchlist_ticker exists to serve.
//
// `reloadKey` changes whenever the user's own watchlist changes, so the
// watcher counts don't sit one behind after they add or remove something.
export default function TrendingSection({ username, market, watchlistTickers, onAdd, reloadKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [addingTicker, setAddingTicker] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return getTrending(username)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [username]);

  // market is in the deps because the endpoint scopes by it — without it,
  // switching India/US would leave the previous market's list on screen.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, market, reloadKey]);

  async function handleAdd(ticker) {
    setAddingTicker(ticker);
    try {
      await onAdd(ticker);
    } finally {
      setAddingTicker(null);
    }
  }

  // A quiet failure here shouldn't shout — trending is a nice-to-have next to
  // the user's own watchlist, so it degrades to nothing rather than an alarm.
  if (error || rows === null || rows.length === 0) return null;

  return (
    <section className="trending">
      <h2 className="trending-heading">
        <span aria-hidden="true">🔥</span> Trending on Pulse
      </h2>
      <p className="muted small trending-sub">Most tracked by other people in your market</p>

      <ul className="trending-list">
        {rows.map((row) => {
          const alreadyWatching = watchlistTickers.has(row.ticker);
          return (
            <li key={row.ticker} className="trending-row">
              <span>
                <strong>{row.companyName}</strong>
                <span className="muted small">
                  {' · '}
                  {row.ticker} · {row.watcherCount} watching
                </span>
              </span>
              <button
                className="btn btn-small"
                onClick={() => handleAdd(row.ticker)}
                disabled={alreadyWatching || addingTicker === row.ticker}
              >
                {alreadyWatching ? 'Added' : addingTicker === row.ticker ? 'Adding…' : 'Add'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
