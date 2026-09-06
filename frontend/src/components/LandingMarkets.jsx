import { useEffect, useState } from 'react';
import { getLiveMarket } from '../api.js';
import { dayChangeSignal } from '../dayChange.js';
import { currencyForExchange } from '../currency.js';
import { isStale } from '../timeAgo.js';
import { isWithinPollWindowForExchange } from '../marketHours.js';

// The "Markets today" panel from the mockup, wired to real data.
//
// The mockup listed NIFTY 50 and SENSEX; Pulse doesn't ingest indices, only
// the individual tickers in market_data, so this shows those instead of
// inventing index values. The Live badge is honest too: it says Live only
// while the data really is, and falls back to Delayed past the same staleness
// threshold the watchlist uses.
//
// If the fetch fails there's nothing to prove, so the panel renders nothing
// rather than an error on the front door.
export default function LandingMarkets() {
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
    (latest, row) =>
      row.fetchedAt && (!latest || new Date(row.fetchedAt) > new Date(latest)) ? row.fetchedAt : latest,
    null
  );
  // These rows mix NSE and NASDAQ, so the badge asks whether *anything* on
  // show is currently being polled. If nothing is, the data can't be late —
  // the markets are shut, which is a third state, not a degraded "Delayed".
  const polling = rows.some((row) => isWithinPollWindowForExchange(row.exchange));
  const stale = freshest ? isStale(freshest, polling) : true;

  // Word and colour together, never colour alone — same rule as the rest of
  // the app. Only "Live" earns the breathing dot; the other two are static.
  const state = !polling ? 'closed' : stale ? 'stale' : 'live';
  const stateLabel = { closed: 'Closed', stale: 'Delayed', live: 'Live' }[state];

  return (
    <div className="markets-panel">
      <div className="markets-panel-head">
        <span className="markets-panel-title">Markets today</span>
        <span className={`markets-state markets-state-${state}`}>
          <span className="markets-state-dot" aria-hidden="true" />
          {stateLabel}
        </span>
      </div>

      <ul className="markets-rows">
        {rows.map((row) => {
          const day = dayChangeSignal(row.dayChange, row.dayChangePercent);
          return (
            <li key={row.ticker} className="markets-row">
              <span className="markets-row-name">{row.ticker}</span>
              <span className="markets-row-price">
                {currencyForExchange(row.exchange)}
                {Number(row.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className={`markets-row-change${day ? ` day-change-${day.tone}` : ''}`}>
                {day ? (
                  <>
                    {day.percentText}
                    <span className="sr-only"> {day.label}</span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
