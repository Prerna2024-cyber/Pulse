import { useCallback, useEffect, useState } from 'react';
import { getDiff } from '../api.js';
import { changeSignal, quietChangeLine } from '../changeSignal.js';
import { timeAgo, isStale } from '../timeAgo.js';
import StatusMessage from './StatusMessage.jsx';

// The distinct "what changed" view PROJECT_CONTEXT.md calls for — plain-
// language reasons, not a table of raw percentages. Calling the diff endpoint
// also overwrites the user's snapshots server-side, so opening this tab is the
// "checking in" moment the significance logic is built around. (The dashboard
// panel peeks instead, so it can show the same thing without consuming it.)
//
// Every watched stock is listed, not just the flagged ones: a view that showed
// only meaningful changes left the rest unaccounted for, so a quiet watchlist
// looked the same as a broken one. Flagged moves lead with icon, colour and a
// sentence; everything else is accounted for quietly underneath.
export default function WhatChangedView({ username, currency = '' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return getDiff(username)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (error) {
    return <StatusMessage icon="⚠️" tone="error" title="Couldn't check for changes" hint={error} />;
  }
  if (data === null) {
    return <StatusMessage icon="⏳" title="Checking what changed…" />;
  }

  const flagged = data.changes.filter((c) => c.isMeaningful);
  // Pending rows (no market_data yet) belong in the quiet list too — they're
  // on the watchlist, so leaving them out would under-report it.
  const quiet = [...data.changes.filter((c) => !c.isMeaningful), ...data.pending].sort((a, b) =>
    (a.companyName || a.ticker).localeCompare(b.companyName || b.ticker)
  );

  // The empty state now means one thing only: there is nothing to report on
  // because nothing is tracked.
  if (flagged.length === 0 && quiet.length === 0) {
    return (
      <StatusMessage
        icon="🔍"
        title="Your watchlist is empty"
        hint="Add a company from search or a sector to start tracking what changes."
      />
    );
  }

  return (
    <div className="view">
      <div className="view-header">
        <button className="btn btn-small" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Checking…' : '↻ Check again'}
        </button>
      </div>

      <section>
        <h2 className="changed-section-heading">
          {flagged.length > 0
            ? `Worth a look · ${flagged.length}`
            : 'Nothing meaningful moved since you last checked'}
        </h2>

        {flagged.length > 0 && (
          <ul className="changes">
            {flagged.map((change) => {
              const signal = changeSignal(change);
              return (
                <li key={change.ticker} className={`change-card change-${signal.tone}`}>
                  <span className="change-icon" aria-hidden="true">
                    {signal.icon}
                  </span>
                  <div>
                    <p className="change-summary">{change.summary}</p>
                    <span className="muted small">
                      {signal.label} · {change.ticker}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {quiet.length > 0 && (
        <section>
          <h2 className="changed-section-heading">No meaningful change · {quiet.length}</h2>
          <ul className="quiet-list">
            {quiet.map((row) => {
              const stale = row.hasData && isStale(row.fetchedAt);
              return (
                <li key={row.ticker} className="quiet-row">
                  <div className="quiet-text">
                    <p className="quiet-name">{row.companyName || row.ticker}</p>
                    <p className="quiet-line muted small">
                      {row.ticker} · {quietChangeLine(row)}
                    </p>
                  </div>

                  <div className="quiet-price">
                    {row.hasData ? (
                      <>
                        <span className="quiet-price-value">
                          {currency}
                          {Number(row.currentPrice).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className={stale ? 'small stale' : 'muted small'}>
                          {stale && <span aria-hidden="true">⚠️ </span>}
                          {timeAgo(row.fetchedAt)}
                          {stale && <span className="sr-only"> — may be out of date</span>}
                        </span>
                      </>
                    ) : (
                      <span className="muted small">no price yet</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
