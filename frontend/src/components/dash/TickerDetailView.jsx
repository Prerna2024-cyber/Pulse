import { useCallback, useEffect, useState } from 'react';
import { getTickerHistory } from '../../api.js';
import { sessionSeries, MIN_CHART_POINTS } from '../../sessionSeries.js';
import { dayChangeSignal } from '../../dayChange.js';
import { dayRangeItems } from '../../dayRange.js';
import { useAutoRefresh } from '../../useAutoRefresh.js';
import StatusMessage from '../StatusMessage.jsx';
import PriceChart from './PriceChart.jsx';

// Matches the dashboard's cadence — the India worker writes every 60s, so a
// faster chart refresh would redraw the same points.
const REFRESH_MS = 60 * 1000;

// When price_history started collecting. Stated in the empty-state copy
// because "nothing was recorded" is otherwise indistinguishable from a fault —
// a viewer looking at a NASDAQ chart on a Monday morning is seeing Friday's
// session, which genuinely predates this table.
const HISTORY_SINCE = '5 September 2026';

// A watchlist row opened up: the same figures the row already showed, plus the
// intraday line behind them.
//
// ONE SESSION ONLY, and no range switcher. price_history started collecting on
// 2026-09-05, so 5D and 1M would be a mostly-empty axis with a line across the
// gap. An absent control is honest; a control that returns nothing is not.
export default function TickerDetailView({ username, item, currency, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    return getTickerHistory(username, item.ticker)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [username, item.ticker]);

  useEffect(() => {
    load();
  }, [load]);

  // Only while the market is actually trading. Once it has shut the window is
  // fixed at the close, so every further request would return an identical
  // series — see the endpoint's note.
  useAutoRefresh(load, REFRESH_MS, data?.session?.isCurrent === true);

  const session = data?.session ?? null;
  const series = sessionSeries(data?.points, session);
  const day = dayChangeSignal(item.dayChange, item.dayChangePercent);
  const range = dayRangeItems(item);

  // Same wording as the watchlist row's "Last session" clarifier, for the same
  // reason: while the market is shut these figures describe the previous
  // session, and a viewer on a Sunday would otherwise read Friday's line as
  // today's.
  const sessionLabel = !session
    ? null
    : session.isCurrent
      ? `Today's session · ${session.openLabel}–${session.closeLabel} ${session.zoneLabel}`
      : `Last session · ${session.dayName} · ${session.openLabel}–${session.closeLabel} ${session.zoneLabel}`;

  // Direction over the session drives the line's colour. Deliberately the
  // chart's own first-to-last, not item.dayChange: the latter measures from
  // the previous close, so on a gap-down morning that recovers, the day is red
  // while the line on screen visibly rises. Colouring the line by the day's
  // change would contradict the shape directly above it.
  const tone =
    series.state !== 'ok' ? 'flat' : series.last > series.first ? 'up' : series.last < series.first ? 'down' : 'flat';

  return (
    <section className="panel detail-view">
      <button className="link-button detail-back" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to watchlist
      </button>

      <header className="detail-head">
        <span className="cell-avatar detail-avatar" aria-hidden="true">
          {item.companyName.trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <h2 className="detail-title">{item.companyName}</h2>
          <p className="muted small detail-sub">
            {item.ticker} · {item.exchange}
          </p>
        </div>
      </header>

      <div className="detail-price-row">
        {item.price != null && (
          <span className="detail-price">
            {currency}
            {Number(item.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
        {day && (
          <span className={`cell-change day-change-${day.tone}`}>
            <span aria-hidden="true">{day.icon} </span>
            {day.percentText}
            <span className="sr-only"> {day.label}</span>
          </span>
        )}
      </div>

      {sessionLabel && <p className="muted small detail-session">{sessionLabel}</p>}

      {error ? (
        <StatusMessage icon="⚠️" tone="error" title="Couldn't load the chart" hint={error} />
      ) : data === null ? (
        <p className="panel-empty muted">Loading this session…</p>
      ) : (
        <ChartArea series={series} session={session} tone={tone} item={item} currency={currency} />
      )}

      {/* The O/H/L the row already carried, restated here so the chart has its
          reference figures beside it rather than a screen away. */}
      {range.length > 0 && (
        <ul className="detail-stats">
          {range.map((entry) => (
            <li key={entry.key}>
              <span className="detail-stat-label">{entry.label}</span>
              <span className="detail-stat-value">
                {currency}
                {entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Every branch here is a real state the data can be in. None of them draws a
// line: a near-empty chart looks like a broken one, and the difference between
// "nothing recorded" and "recorded, but only twice" is worth saying out loud.
function ChartArea({ series, session, tone, item, currency }) {
  if (series.state === 'no-session') {
    return (
      <StatusMessage
        icon="🗓️"
        title="No trading session to chart"
        hint={`Pulse doesn't have market hours for ${item.exchange}, so it can't say which readings belong to a session.`}
      />
    );
  }

  if (series.state === 'empty') {
    return (
      <StatusMessage
        icon="📈"
        title={session.isCurrent ? 'No readings yet this session' : 'Nothing was recorded last session'}
        hint={
          session.isCurrent
            ? 'The worker writes a price every minute while the market is open — the first points should appear shortly.'
            : `Pulse only began keeping price history on ${HISTORY_SINCE}, so earlier sessions have nothing to draw.`
        }
      />
    );
  }

  if (series.state === 'too-few') {
    return (
      <StatusMessage
        icon="📉"
        title={`Only ${series.count} reading${series.count === 1 ? '' : 's'} so far`}
        hint={`A line needs at least ${MIN_CHART_POINTS} points to show a direction rather than imply one. ${
          session.isCurrent ? 'More arrive every minute the market is open.' : ''
        }`.trim()}
      />
    );
  }

  const startedAt = new Date(series.startedAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <>
      <PriceChart
        series={series}
        tone={tone}
        ariaLabel={`${item.companyName} price over ${
          session.isCurrent ? "today's session" : `${session.dayName}'s session`
        }: ${series.count} readings, from ${currency}${series.first.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })} to ${currency}${series.last.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`}
      />

      <div className="price-chart-axis" aria-hidden="true">
        <span>{session.openLabel}</span>
        <span>{session.isCurrent ? 'now' : session.closeLabel}</span>
      </div>

      {/* The empty left-hand side of a partial chart needs explaining, or it
          reads as missing data rather than a stock added part-way through. */}
      {series.partial && (
        <p className="muted small detail-partial">
          Tracking began at {startedAt}, so this session is shown from there — the earlier part of the day wasn't
          recorded for {item.ticker}.
        </p>
      )}
    </>
  );
}
