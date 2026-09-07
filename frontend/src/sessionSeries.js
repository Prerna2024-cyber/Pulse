// What a session's price points can honestly be drawn as.
//
// Kept apart from the chart component because the interesting part isn't the
// SVG, it's deciding which of several thin cases a series is in — and those
// are worth testing without rendering anything.
//
// The rule throughout: never draw a line that implies more than the data
// supports. Two readings are a line segment, not a session; a ticker added at
// 2pm has no morning, and pretending otherwise by stretching its first point
// back to the open would invent a flat hour that never happened.

// Below this a "chart" is a line between two points, which reads as a trend
// while carrying none of the evidence for one. Three is the smallest number
// that can show a direction changing.
export const MIN_CHART_POINTS = 3;

// How late a first reading can be before the series is called partial. The
// India worker polls every 60s and the US every 300s, so this is several
// missed polls rather than ordinary jitter or a worker restart.
export const PARTIAL_AFTER_MINUTES = 15;

// Same rule as dayRange.js and dayChange.js: a missing figure is null, never
// 0. Number(null) and Number('') are both 0, so an absent price would sail
// through a bare isFinite check and be drawn as a real reading at zero —
// which on a price chart is a crash to the axis, not a gap.
function toFiniteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toTime(value) {
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

// Drops anything unusable rather than letting a NaN reach the axis maths,
// where it would silently poison min/max and blank the whole chart.
function usablePoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((p) => ({ t: toTime(p?.t), price: toFiniteOrNull(p?.price) }))
    .filter((p) => p.t !== null && p.price !== null)
    .sort((a, b) => a.t - b.t);
}

// Returns a discriminated result the view can switch on:
//
//   { state: 'no-session' }  the exchange has no schedule to bound a session
//   { state: 'empty' }       the session is bounded but nothing was recorded
//   { state: 'too-few', count }
//   { state: 'ok', points, domain, partial, startedAt, ... }
//
// `domain` always spans the whole session window, never just the points. A
// partial series therefore starts partway across the chart, which is the point
// — the gap is the message.
export function sessionSeries(points, session) {
  if (!session) return { state: 'no-session' };

  const start = toTime(session.start);
  const end = toTime(session.end);
  if (start === null || end === null) return { state: 'no-session' };

  const clean = usablePoints(points).filter((p) => p.t >= start && p.t <= end);

  if (clean.length === 0) return { state: 'empty' };
  if (clean.length < MIN_CHART_POINTS) return { state: 'too-few', count: clean.length };

  const prices = clean.map((p) => p.price);
  let lo = Math.min(...prices);
  let hi = Math.max(...prices);

  // A dead-flat session is a real outcome, not an error, but a zero-height
  // domain divides by zero when scaling. Give it a nominal band so the line
  // renders down the middle instead of vanishing.
  if (hi === lo) {
    const nudge = Math.abs(hi) * 0.001 || 0.5;
    lo -= nudge;
    hi += nudge;
  }

  // The x domain can legitimately have no width — at the opening bell the
  // session window is a single instant (see marketHours.js). Guarding here
  // keeps that out of the scale function rather than in every caller.
  const spanMs = Math.max(end - start, 1);

  const firstAt = clean[0].t;
  const partial = firstAt - start > PARTIAL_AFTER_MINUTES * 60_000;

  return {
    state: 'ok',
    points: clean,
    count: clean.length,
    domain: { start, end, spanMs, lo, hi },
    partial,
    startedAt: firstAt,
    first: clean[0].price,
    last: clean[clean.length - 1].price,
  };
}

// Whether the detail view should fetch again on this tick.
//
// The gate this replaces was the `isCurrent` flag off the last response, which
// is a fact about the moment that response was built and never re-evaluates.
// That left two holes. A view opened before the bell was told isCurrent:false
// and then had nothing to re-check it, so it sat on the previous session all
// morning while the market traded behind it. And a live session's window ends
// at *now*, so the last fetch before the close always stops short of the close
// itself — the final minutes are only ever visible to a request made after the
// bell, which the old gate had already stopped from happening.
//
// So the answer is recomputed each tick from the clock, and one settling fetch
// is allowed after a session the view actually watched has ended.
//
// `marketIsCurrent` comes from the viewer's own clock via sessionBoundsForExchange.
// It agrees with the server by construction — the drift sweep is what makes
// that safe to rely on rather than a guess about the server's answer.
export function shouldPollSession({ hasData, loadedSessionIsCurrent, marketIsCurrent }) {
  // The first load hasn't landed yet, so there is nothing to reason about.
  if (!hasData) return true;

  // Trading now: this is the ordinary case.
  if (marketIsCurrent) return true;

  // The bell has gone, but the data on screen was fetched while the session
  // was live, so its window stops short of the close. Exactly one more fetch
  // settles it — the response comes back with isCurrent:false, which makes
  // this false on the next tick and ends the polling.
  return loadedSessionIsCurrent === true;
}
