import { timeAgo, isStale } from '../../timeAgo.js';
import { dayChangeSignal } from '../../dayChange.js';

// The watchlist as the mockup's table, minus the Chart column: sparklines need
// a price history and market_data keeps exactly one row per ticker, so there
// is no series to draw. Storing history would mean a new table and a change to
// how the worker writes — a real feature, not a visual detail, so the column
// is gone rather than faked with random points.
//
// Everything the row does show is real, including the per-row staleness
// warning carried over from the existing watchlist.
export default function WatchlistTable({ items, currency, error, removingTicker, onRemove }) {
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
              Change
            </th>
            <th scope="col" className="col-action">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const stale = item.price != null && isStale(item.fetchedAt);
            const day = dayChangeSignal(item.dayChange, item.dayChangePercent);
            return (
              <tr key={item.ticker}>
                <td>
                  <div className="cell-name">
                    <span className="cell-avatar" aria-hidden="true">
                      {item.companyName.trim().charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <strong>{item.companyName}</strong>
                      <span className="muted small">
                        {item.ticker} · {item.exchange}
                      </span>
                    </div>
                  </div>
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
