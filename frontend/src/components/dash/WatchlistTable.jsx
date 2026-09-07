import { timeAgo, isStale } from '../../timeAgo.js';
import { dayChangeSignal } from '../../dayChange.js';
import { dayRangeItems } from '../../dayRange.js';
import { marketStatusForExchange, isWithinPollWindowForExchange } from '../../marketHours.js';

// The watchlist as the mockup's table. There is still no inline Chart column:
// price_history now gives each ticker a real series, but a sparkline squeezed
// into a table cell on a phone is a few pixels of noise. The series is shown
// where it can be read instead — clicking a company opens its detail view, and
// the name cell is the control that gets you there.
//
// Everything the row does show is real, including the per-row staleness
// warning carried over from the existing watchlist.
export default function WatchlistTable({ items, currency, error, removingTicker, onRemove, onOpen }) {
  if (error) {
    return <p className="panel-empty error-text">Couldn't load your watchlist — {error}</p>;
  }
  if (items === null) {
    return <p className="panel-empty muted">Loading your watchlist…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="panel-empty muted">
        Nothing tracked yet — search above, or open a sector to find companies.
      </p>
    );
  }

  return (
    <div className="table-scroll">
      <table className="watchlist-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col" className="col-num">
              Price
            </th>
            <th scope="col" className="col-num">
              Day range
            </th>
            <th scope="col" className="col-num">
              Change
            </th>
            <th scope="col" className="col-action">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            // Scoped to this row's own exchange, like the session label below:
            // a price is only overdue while its market is being polled. Over a
            // weekend every row would otherwise carry a warning for data that
            // is exactly as current as it can be.
            const rowPolling = isWithinPollWindowForExchange(item.exchange);
            const stale = item.price != null && isStale(item.fetchedAt, rowPolling);
            const day = dayChangeSignal(item.dayChange, item.dayChangePercent);
            const range = dayRangeItems(item);
            // Scoped to this row's own exchange, not the viewer's selected
            // market. A watchlist is already market-scoped so the two always
            // agree today; keying off the row means it stays correct if that
            // ever changes. Recomputed each render, which the 60-second
            // refresh already drives.
            const rowMarket = marketStatusForExchange(item.exchange);
            // While the market is shut these figures are the last session's,
            // not today's — a Sunday viewer would otherwise read Friday's
            // range as today's. Only worth saying when there's a figure to
            // qualify.
            const lastSession = range.length > 0 && rowMarket !== null && !rowMarket.isOpen;
            return (
              <tr key={item.ticker}>
                {/* The name is the control, not the whole row: a row-wide
                    click target would swallow the remove button inside it, and
                    a <tr> can't be a button without losing the table
                    semantics screen readers navigate by. */}
                <td>
                  <button
                    type="button"
                    className="cell-name cell-name-button"
                    onClick={() => onOpen(item.ticker)}
                    aria-label={`Open ${item.companyName} detail and price chart`}
                  >
                    <span className="cell-avatar" aria-hidden="true">
                      {item.companyName.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="cell-name-text">
                      <strong>{item.companyName}</strong>
                      <span className="muted small">
                        {item.ticker} · {item.exchange}
                      </span>
                    </span>
                  </button>
                </td>

                <td className="col-num">
                  {item.price != null ? (
                    <>
                      <span className="cell-price">
                        {currency}
                        {Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className={stale ? 'small stale' : 'muted small'}>
                        {stale && <span aria-hidden="true">⚠️ </span>}
                        {timeAgo(item.fetchedAt)}
                        {stale && <span className="sr-only"> — may be out of date</span>}
                      </span>
                    </>
                  ) : (
                    <span className="muted small">waiting for price…</span>
                  )}
                </td>

                {/* Secondary to the price by design: no currency symbol (it's
                    the same instrument on the same row), lighter weight, and
                    each figure appears only if it's actually known. */}
                <td className="col-num">
                  {range.length > 0 ? (
                    <span className="cell-range">
                      {range.map((entry) => (
                        <span className="range-item" key={entry.key}>
                          <span className="range-key" aria-hidden="true">
                            {entry.key}
                          </span>
                          <span className="sr-only">{entry.label} </span>
                          {entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      ))}
                      {/* A clarifier, not a warning: no icon, no colour, just
                          quieter than the figures it qualifies. */}
                      {lastSession && <span className="range-note">Last session</span>}
                    </span>
                  ) : (
                    <span className="muted small">—</span>
                  )}
                </td>

                <td className="col-num">
                  {day ? (
                    <span className={`cell-change day-change-${day.tone}`}>
                      <span aria-hidden="true">{day.icon} </span>
                      {day.percentText}
                      <span className="sr-only"> {day.label}</span>
                    </span>
                  ) : (
                    <span className="muted small">—</span>
                  )}
                </td>

                <td className="col-action">
                  <button
                    className="btn btn-icon"
                    aria-label={`Remove ${item.companyName} from watchlist`}
                    onClick={() => onRemove(item.ticker)}
                    disabled={removingTicker === item.ticker}
                  >
                    {removingTicker === item.ticker ? '…' : '✕'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
