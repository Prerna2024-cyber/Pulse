import { useCallback, useEffect, useState } from 'react';
import { getDiff } from '../api.js';
import { changeSignal } from '../changeSignal.js';
import StatusMessage from './StatusMessage.jsx';

// The distinct "what changed" view PROJECT_CONTEXT.md calls for — plain-
// language reasons, not a table of raw percentages. Calling the diff
// endpoint also overwrites the user's snapshots server-side, so opening this
// tab is the "checking in" moment the significance logic is built around.
export default function WhatChangedView({ username }) {
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

  return (
    <div className="view">
      <div className="view-header">
        <button className="btn btn-small" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Checking…' : '↻ Check again'}
        </button>
      </div>

      {flagged.length === 0 && (
        <StatusMessage
          icon="✅"
          tone="positive"
          title="Nothing meaningful changed"
          hint="Everything on your watchlist is within its normal range since you last checked."
        />
      )}

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

      {data.pending.length > 0 && (
        <p className="muted small pending-note">
          Still waiting on first price data for {data.pending.map((p) => p.companyName).join(', ')}.
        </p>
      )}
    </div>
  );
}
