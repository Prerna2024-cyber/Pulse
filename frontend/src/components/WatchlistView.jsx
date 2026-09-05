import { useCallback, useEffect, useState } from 'react';
import { getWatchlist, addTicker, removeTicker } from '../api.js';
import { timeAgo, isStale } from '../timeAgo.js';
import { dayChangeSignal } from '../dayChange.js';
import SearchBar from './SearchBar.jsx';
import StatusMessage from './StatusMessage.jsx';
import WatchlistHero from './WatchlistHero.jsx';
import TrendingSection from './TrendingSection.jsx';

export default function WatchlistView({ username, market, currency }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [removingTicker, setRemovingTicker] = useState(null);
  // Bumped on every add/remove so trending re-reads its watcher counts
  // instead of showing a figure that's one behind the user's own action.
  const [listVersion, setListVersion] = useState(0);

  const refresh = useCallback(() => {
    setError(null);
    return getWatchlist(username)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [username]);

  // market is a dependency because the endpoint filters by it server-side:
  // without it, switching India/US left the previous market's stocks on
  // screen until the tab was remounted.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, market]);

  async function handleAdd(ticker) {
    await addTicker(username, ticker);
    await refresh();
    setListVersion((v) => v + 1);
  }

  async function handleRemove(ticker) {
    setRemovingTicker(ticker);
    try {
      await removeTicker(username, ticker);
      await refresh();
      setListVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingTicker(null);
    }
  }

  const watchlistTickers = new Set((items || []).map((i) => i.ticker));

  return (
    <div className="view">
      <WatchlistHero username={username} items={error ? null : items} />

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
          {items.map((item) => {
            // Icon + color together, never color alone — the ⚠️ carries the
            // same signal for anyone who can't pick up the amber.
            const stale = item.price != null && isStale(item.fetchedAt);
            const day = dayChangeSignal(item.dayChange, item.dayChangePercent);
            return (
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
                      {day && (
                        <span className={`small day-change day-change-${day.tone}`}>
                          <span aria-hidden="true">{day.icon} </span>
                          {day.percentText}
                          <span className="sr-only"> {day.label}</span>
                        </span>
                      )}
                      <span className={stale ? 'small stale' : 'muted small'}>
                        {stale && <span aria-hidden="true">⚠️ </span>}
                        as of {timeAgo(item.fetchedAt)}
                        {stale && <span className="sr-only"> — may be out of date</span>}
                      </span>
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
            );
          })}
        </ul>
      )}

      <TrendingSection
        username={username}
        market={market}
        watchlistTickers={watchlistTickers}
        onAdd={handleAdd}
        reloadKey={listVersion}
      />
    </div>
  );
}
