import { useState } from 'react';
import { changeSignal } from '../../changeSignal.js';
import { significanceSentence } from '../../significanceCopy.js';
import MarketStatus from './MarketStatus.jsx';
import SensitivityControl from './SensitivityControl.jsx';

// The core feature, given the weight the mockup never gave it: first thing
// under the greeting, full width, its own colour.
//
// It reads the diff in peek mode, so simply landing on the dashboard doesn't
// count as having checked. Marking it seen stays with the deliberate act of
// opening the What Changed view — otherwise every dashboard load would reset
// the baseline and there'd never be anything left to report.
export default function WhatChangedPanel({ data, error, hours, thresholds, onSaveThresholds, onViewAll }) {
  const flagged = data ? data.changes.filter((c) => c.isMeaningful) : [];
  // Folded away by default. The setting matters, but it's answered once and
  // then rarely revisited, and a permanent row of buttons above the changes
  // themselves would make the panel look like a control surface rather than
  // an answer.
  const [adjusting, setAdjusting] = useState(false);

  return (
    <section className="panel panel-changed">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">
            <span aria-hidden="true">🔔</span> What changed since you last checked
          </h2>
          {/* The user's own thresholds, not the old constants: this sentence
              is a promise about what the list below does and does not
              contain, so it has to track the setting. */}
          <p className="panel-sub">
            {significanceSentence(thresholds)}{' '}
            <button
              type="button"
              className="link-button sensitivity-toggle"
              aria-expanded={adjusting}
              onClick={() => setAdjusting((open) => !open)}
            >
              {adjusting ? 'Done' : 'Adjust'}
            </button>
          </p>
        </div>
        <button className="link-button" onClick={onViewAll}>
          View all <span aria-hidden="true">→</span>
        </button>
      </div>

      {adjusting && <SensitivityControl thresholds={thresholds} onSave={onSaveThresholds} />}

      <MarketStatus status={hours} />

      {error && <p className="panel-empty error-text">Couldn't check for changes — {error}</p>}

      {!error && data === null && <p className="panel-empty muted">Checking what changed…</p>}

      {!error && data !== null && flagged.length === 0 && (
        <p className="panel-empty muted">
          <span aria-hidden="true">✅</span> Nothing meaningful moved since you last checked.
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
