import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionSeries, MIN_CHART_POINTS, PARTIAL_AFTER_MINUTES } from './sessionSeries.js';

// A Monday India session: 09:15–15:30 IST = 03:45–10:00 UTC.
const START = Date.UTC(2026, 8, 7, 3, 45);
const CLOSE = Date.UTC(2026, 8, 7, 10, 0);
const session = (end = CLOSE) => ({ start: new Date(START), end: new Date(end), isCurrent: false });

// n readings a minute apart, beginning `offsetMin` after the open.
const series = (n, offsetMin = 0, price = (i) => 100 + i) =>
  Array.from({ length: n }, (_, i) => ({
    t: new Date(START + (offsetMin + i) * 60_000).toISOString(),
    price: price(i),
  }));

test('a full session draws', () => {
  const out = sessionSeries(series(60), session());
  assert.equal(out.state, 'ok');
  assert.equal(out.count, 60);
  assert.equal(out.partial, false);
  assert.equal(out.first, 100);
  assert.equal(out.last, 159);
});

test('no session means nothing to draw against', () => {
  assert.equal(sessionSeries(series(60), null).state, 'no-session');
  assert.equal(sessionSeries(series(60), { start: 'nonsense', end: 'nonsense' }).state, 'no-session');
});

test('a session with no readings is empty, not broken', () => {
  assert.equal(sessionSeries([], session()).state, 'empty');
  assert.equal(sessionSeries(null, session()).state, 'empty');
});

test('too few points is reported rather than drawn', () => {
  for (let n = 1; n < MIN_CHART_POINTS; n += 1) {
    const out = sessionSeries(series(n), session());
    assert.equal(out.state, 'too-few', `${n} point(s)`);
    assert.equal(out.count, n);
  }
  assert.equal(sessionSeries(series(MIN_CHART_POINTS), session()).state, 'ok');
});

// The ticker-added-mid-session case: real data, drawn, but flagged so the
// empty left-hand side of the chart is explained rather than mysterious.
test('a series that starts late is partial but still drawn', () => {
  const out = sessionSeries(series(30, PARTIAL_AFTER_MINUTES + 1), session());
  assert.equal(out.state, 'ok');
  assert.equal(out.partial, true);
  assert.equal(out.startedAt, START + (PARTIAL_AFTER_MINUTES + 1) * 60_000);
});

test('ordinary poll jitter is not called partial', () => {
  assert.equal(sessionSeries(series(30, PARTIAL_AFTER_MINUTES), session()).partial, false);
});

// The domain is the session, not the data — otherwise a partial series would
// stretch to fill the chart and look complete.
test('the domain always spans the whole session', () => {
  const out = sessionSeries(series(10, 200), session());
  assert.equal(out.domain.start, START);
  assert.equal(out.domain.end, CLOSE);
  assert.equal(out.domain.spanMs, CLOSE - START);
});

test('readings outside the session window are excluded', () => {
  const before = [{ t: new Date(START - 60 * 60_000).toISOString(), price: 1 }];
  const after = [{ t: new Date(CLOSE + 60 * 60_000).toISOString(), price: 999 }];
  const out = sessionSeries([...before, ...series(5), ...after], session());
  assert.equal(out.count, 5);
  assert.equal(out.first, 100);
  assert.equal(out.last, 104);
});

test('unusable readings are dropped, not allowed to poison the axis', () => {
  const junk = [
    { t: 'not-a-date', price: 5 },
    { t: new Date(START + 60_000).toISOString(), price: 'abc' },
    { t: new Date(START + 120_000).toISOString(), price: null },
  ];
  const out = sessionSeries([...junk, ...series(4)], session());
  assert.equal(out.state, 'ok');
  assert.equal(out.count, 4);
  assert.ok(Number.isFinite(out.domain.lo) && Number.isFinite(out.domain.hi));
});

test('points arrive sorted even if the caller\'s were not', () => {
  const shuffled = [...series(5)].reverse();
  const out = sessionSeries(shuffled, session());
  assert.deepEqual(out.points.map((p) => p.price), [100, 101, 102, 103, 104]);
});

// A stock that did not move all session is a real outcome; a zero-height
// domain would divide by zero when scaling.
test('a flat session gets a drawable band', () => {
  const out = sessionSeries(series(10, 0, () => 250), session());
  assert.equal(out.state, 'ok');
  assert.ok(out.domain.hi > out.domain.lo);
  assert.ok(out.domain.lo < 250 && out.domain.hi > 250);
});

test('a flat session at zero still gets a band', () => {
  const out = sessionSeries(series(10, 0, () => 0), session());
  assert.ok(out.domain.hi > out.domain.lo);
});

// At the opening bell start === end (see marketHours.js). Nothing should
// divide by that.
test('a zero-width session never yields a zero span', () => {
  // Only readings at exactly the open can fall inside a window of no width,
  // so this is the one shape that reaches the guard.
  const atBell = Array.from({ length: 3 }, () => ({ t: new Date(START).toISOString(), price: 100 }));
  const out = sessionSeries(atBell, session(START));
  assert.equal(out.state, 'ok');
  assert.ok(out.domain.spanMs >= 1);
});

test('Date objects and ISO strings are both accepted', () => {
  const asDates = series(5).map((p) => ({ t: new Date(p.t), price: p.price }));
  assert.deepEqual(sessionSeries(asDates, session()).points, sessionSeries(series(5), session()).points);
});

// --- polling gate ---------------------------------------------------------

import { shouldPollSession } from './sessionSeries.js';

test('the first load always goes ahead', () => {
  assert.equal(shouldPollSession({ hasData: false, loadedSessionIsCurrent: false, marketIsCurrent: false }), true);
});

test('a live session keeps polling', () => {
  assert.equal(shouldPollSession({ hasData: true, loadedSessionIsCurrent: true, marketIsCurrent: true }), true);
});

// The hole that let a view opened before the bell sit on the previous session
// all morning: the market opens, and nothing on screen had re-checked.
test('polling starts when the market opens under an already-open view', () => {
  const beforeBell = { hasData: true, loadedSessionIsCurrent: false, marketIsCurrent: false };
  assert.equal(shouldPollSession(beforeBell), false);
  assert.equal(shouldPollSession({ ...beforeBell, marketIsCurrent: true }), true);
});

// A live window ends at *now*, so the last in-session fetch never contains the
// close. One request after the bell is what completes the session.
test('one settling fetch is allowed after the bell, then it stops', () => {
  const justClosed = { hasData: true, loadedSessionIsCurrent: true, marketIsCurrent: false };
  assert.equal(shouldPollSession(justClosed), true);

  // That fetch returns isCurrent:false, which ends it.
  assert.equal(shouldPollSession({ ...justClosed, loadedSessionIsCurrent: false }), false);
});

test('a closed market that was never watched live does not poll', () => {
  assert.equal(
    shouldPollSession({ hasData: true, loadedSessionIsCurrent: false, marketIsCurrent: false }),
    false
  );
});
