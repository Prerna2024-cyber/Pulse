import { useEffect, useState } from 'react';
import { getLiveMarket } from '../api.js';
import { dayChangeSignal } from '../dayChange.js';
import { currencyForExchange } from '../currency.js';
import { isStale } from '../timeAgo.js';

// Real prices from market_data on the landing screen — the point is that a
// visitor can see the thing is actually running before signing up.
//
// Which means it has to stay honest: the label reads "Live" only while the
// data really is fresh, and falls back to "Delayed" past the same staleness
// threshold the watchlist uses. If the fetch fails there's nothing to prove,
// so the strip renders nothing rather than an error on the front door.
export default function LandingTicker() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getLiveMarket()
      .then((data) => !cancelled && setRows(data))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rows || rows.length === 0) return null;

  const freshest = rows.reduce(
    (latest, row) => (row.fetchedAt && (!latest || new Date(row.fetchedAt) > new Date(latest)) ? row.fetchedAt : latest),
    null
  );
  const stale = freshest ? isStale(freshest) : true;

  return (
    <div className="ticker-strip">
      <span className={`ticker-state${stale ? ' ticker-state-stale' : ''}`}>
        <span className="ticker-state-dot" aria-hidden="true" />
        {stale ? 'Delayed' : 'Live'}
      </span>

      <ul className="ticker-items">
        {rows.map((row) => {
          const day = dayChangeSignal(row.dayChange, row.dayChangePercent);
          return (
            <li key={row.ticker} className="ticker-item">
              <span className="ticker-symbol">{row.ticker}</span>
              <span className="ticker-price">
                {currencyForExchange(row.exchange)}
                {Number(row.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              {day && (
                <span className={`ticker-change day-change-${day.tone}`}>
                  <span aria-hidden="true">{day.icon} </span>
                  {day.percentText}
                  <span className="sr-only"> {day.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
