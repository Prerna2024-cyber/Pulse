import { isStale, lastUpdatedLabel } from '../../timeAgo.js';
import { isWithinPollWindow } from '../../marketHours.js';

// Three stat cards, not the mockup's four. "Total Value" is gone: Pulse tracks
// watchlists, not holdings — there are no quantities or cost basis anywhere in
// the schema, so a portfolio value would be a number with nothing behind it.
//
// The three that remain each read straight off data already on screen.
export default function StatCards({ summary, mostWatched, market }) {
  // Only overdue while the market is being polled — see timeAgo.js. Outside
  // that window the reading is named by its session instead of its age.
  const polling = isWithinPollWindow(market);
  const stale = summary?.freshest ? isStale(summary.freshest, polling) : false;

  return (
    <ul className="stat-cards">
      <li className="stat-card">
        <span className="stat-icon stat-icon-blue" aria-hidden="true">
          📊
        </span>
        <div>
          <p className="stat-label">Total stocks</p>
          <p className="stat-value">{summary ? summary.count : '—'}</p>
          <p className="stat-hint">in your watchlist</p>
        </div>
      </li>

      <li className="stat-card">
        <span className="stat-icon stat-icon-violet" aria-hidden="true">
          👥
        </span>
        <div>
          <p className="stat-label">Most watched</p>
          <p className="stat-value">{mostWatched ? mostWatched.ticker : '—'}</p>
          <p className="stat-hint">
            {mostWatched
              ? `${mostWatched.watcherCount} watching in your market`
              : 'no watchers yet'}
          </p>
        </div>
      </li>

      <li className="stat-card">
        <span className="stat-icon stat-icon-green" aria-hidden="true">
          🕒
        </span>
        <div>
          <p className="stat-label">Last updated</p>
          {/* Same staleness rule as everywhere else: this never claims the
              data is current when it isn't — and, since the worker stopped
              polling closed markets, never calls a closed market a fault. */}
          <p className={`stat-value${stale ? ' stat-value-stale' : ''}`}>
            {stale && <span aria-hidden="true">⚠️ </span>}
            {summary?.freshest ? lastUpdatedLabel(summary.freshest, market) : '—'}
            {stale && <span className="sr-only"> — may be out of date</span>}
          </p>
          {/* "worker may be down" is only true when something was supposed to
              be writing. A closed market explains itself. */}
          <p className="stat-hint">
            {stale ? 'worker may be down' : polling ? 'live market data' : 'market closed'}
          </p>
        </div>
      </li>
    </ul>
  );
}
