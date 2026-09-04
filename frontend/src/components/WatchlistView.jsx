import { useCallback, useEffect, useState } from 'react';
import { getWatchlist, addTicker, removeTicker } from '../api.js';
import { timeAgo } from '../timeAgo.js';
import SearchBar from './SearchBar.jsx';
import StatusMessage from './StatusMessage.jsx';

export default function WatchlistView({ username, currency }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [removingTicker, setRemovingTicker] = useState(null);

  const refresh = useCallback(() => {
    setError(null);
    return getWatchlist(username)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [username]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(ticker) {
    await addTicker(username, ticker);
    await refresh();
  }

  async function handleRemove(ticker) {
    setRemovingTicker(ticker);
    try {
      await removeTicker(username, ticker);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingTicker(null);
    }
  }

  const watchlistTickers = new Set((items || []).map((i) => i.ticker));

  return (
    <div className="view">
      <SearchBar username={username} watchlistTickers={watchlistTickers} onAdd={handleAdd} />

      {error && <StatusMessage icon="⚠️" tone="error" title="Couldn't load your watchlist" hint={error} />}

      {items === null && !error && <StatusMessage icon="⏳" title="Loading your watchlist…" />}

      {items !== null && items.length === 0 && (
        <StatusMessage
          icon="🔍"
          title="Your watchlist is empty"
          hint="Search for a company above to start tracking it."
        />
      )}

      {items !== null && items.length > 0 && (
        <ul className="watchlist">
          {items.map((item) => (
            <li key={item.ticker} className="watchlist-row">
              <div className="watchlist-row-main">
                <strong>{item.companyName}</strong>
                <span className="muted small">
                  {item.ticker} · {item.exchange}
                </span>
              </div>
              <div className="watchlist-row-price">
                {item.price != null ? (
                  <>
                    <span className="price">
                      {currency} {Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="muted small">as of {timeAgo(item.fetchedAt)}</span>
                  </>
                ) : (
                  <span className="muted small">waiting for price…</span>
                )}
              </div>
              <button
                className="btn btn-icon"
                aria-label={`Remove ${item.companyName} from watchlist`}
                onClick={() => handleRemove(item.ticker)}
                disabled={removingTicker === item.ticker}
              >
                {removingTicker === item.ticker ? '…' : '✕'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
