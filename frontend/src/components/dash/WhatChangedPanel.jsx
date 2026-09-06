import { changeSignal } from '../../changeSignal.js';
import { marketStatus } from '../../marketHours.js';
import MarketHoursBadge from './MarketHoursBadge.jsx';

// The core feature, given the weight the mockup never gave it: first thing
// under the greeting, full width, its own colour.
//
// It reads the diff in peek mode, so simply landing on the dashboard doesn't
// count as having checked. Marking it seen stays with the deliberate act of
// opening the What Changed view — otherwise every dashboard load would reset
// the baseline and there'd never be anything left to report.
export default function WhatChangedPanel({ data, error, market, onViewAll }) {
  const flagged = data ? data.changes.filter((c) => c.isMeaningful) : [];
  const hours = marketStatus(market);

  return (
    <section className="panel panel-changed">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">
            <span aria-hidden="true">🔔</span> What changed since you last checked
          </h2>
          <p className="panel-sub">
            Only moves worth your attention — past ±2% on price, or double the usual volume.
          </p>
          <MarketHoursBadge market={market} status={hours} />
        </div>
        <button className="link-button" onClick={onViewAll}>
          View all <span aria-hidden="true">→</span>
        </button>
      </div>

      {error && <p className="panel-empty error-text">Couldn't check for changes — {error}</p>}

      {!error && data === null && <p className="panel-empty muted">Checking what changed…</p>}

      {!error && data !== null && flagged.length === 0 && (
        <p className="panel-empty muted">
          <span aria-hidden="true">✅</span> Nothing meaningful moved since you last checked.
          {/* The likeliest reason for a quiet list, said plainly rather than
              leaving someone to wonder whether the app is broken. Only while
              shut: a change can still be waiting from an earlier session, so
              this explains an empty list, it doesn't promise one. */}
          {hours && !hours.isOpen && ' The market is closed, so prices aren\u2019t moving right now.'}
        </p>
      )}

      {flagged.length > 0 && (
        <ul className="changed-list">
          {flagged.map((change) => {
            const signal = changeSignal(change);
            return (
              <li key={change.ticker} className={`changed-row changed-row-${signal.tone}`}>
                <span className="changed-icon" aria-hidden="true">
                  {signal.icon}
                </span>
                <div className="changed-text">
                  <p className="changed-summary">{change.summary}</p>
                  <p className="changed-meta muted small">
                    {signal.label} · {change.ticker}
                  </p>
                </div>
                {change.priceChangePercent != null && (
                  <span className={`changed-pill changed-pill-${signal.tone}`}>
                    {change.priceChangePercent > 0 ? '+' : ''}
                    {change.priceChangePercent.toFixed(1)}%
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
