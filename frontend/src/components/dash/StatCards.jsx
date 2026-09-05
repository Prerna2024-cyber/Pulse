import { timeAgo, isStale } from '../../timeAgo.js';

// Three stat cards, not the mockup's four. "Total Value" is gone: Pulse tracks
// watchlists, not holdings — there are no quantities or cost basis anywhere in
// the schema, so a portfolio value would be a number with nothing behind it.
//
// The three that remain each read straight off data already on screen.
export default function StatCards({ summary, mostWatched }) {
  const stale = summary?.freshest ? isStale(summary.freshest) : false;

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
              data is current when it isn't. */}
          <p className={`stat-value${stale ? ' stat-value-stale' : ''}`}>
            {stale && <span aria-hidden="true">⚠️ </span>}
            {summary?.freshest ? timeAgo(summary.freshest) : '—'}
            {stale && <span className="sr-only"> — may be out of date</span>}
          </p>
          <p className="stat-hint">{stale ? 'worker may be down' : 'live market data'}</p>
        </div>
      </li>
    </ul>
  );
}
