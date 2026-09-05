import { greeting } from '../greeting.js';
import { watchlistSummary, movementPhrase, stockCountPhrase } from '../watchlistSummary.js';
import { timeAgo, isStale } from '../timeAgo.js';

// The at-a-glance band above the list: who you are, what you're tracking, and
// how much of it moved — so the view answers "anything happening?" before the
// user reads a single row.
//
// `items` is null while the watchlist is still loading; the greeting renders
// anyway so the screen has something real in it instead of going blank.
export default function WatchlistHero({ username, items }) {
  const summary = items ? watchlistSummary(items) : null;
  const movement = summary ? movementPhrase(summary) : null;
  const stale = summary?.freshest ? isStale(summary.freshest) : false;

  return (
    <section className="hero">
      <h1 className="hero-greeting">
        {greeting()}, {username}
      </h1>

      {summary && (
        <p className="hero-stats muted small">
          {stockCountPhrase(summary.count)}
          {movement && ` · ${movement}`}
        </p>
      )}

      {summary?.freshest && (
        <p className={stale ? 'hero-updated small stale' : 'hero-updated muted small'}>
          {stale && <span aria-hidden="true">⚠️ </span>}
          Updated {timeAgo(summary.freshest)}
          {stale && <span className="sr-only"> — may be out of date</span>}
        </p>
      )}
    </section>
  );
}
