import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  marketStatus,
  marketStatusForExchange,
  isWithinPollWindow,
  POST_CLOSE_GRACE_MINUTES,
} from './marketHours.js';
// Node has no Vite fs restriction, so the test can reach the UI's copy even
// though the frontend itself can't reach lib/. See the drift sweep at the end.
import { marketStatus as uiMarketStatus } from '../frontend/src/marketHours.js';

const at = (iso) => new Date(iso);

// 2026-09-07 is a Monday; 2026-09-04 a Friday; 2026-09-05 a Saturday.

test('the poll window opens with the market', () => {
  // 03:44Z = 09:14 IST (one minute early); 03:45Z = 09:15 IST exactly.
  assert.equal(isWithinPollWindow('India', at('2026-09-07T03:44:00Z')), false);
  assert.equal(isWithinPollWindow('India', at('2026-09-07T03:45:00Z')), true);
});

test('the poll window runs past the close so the settled price is captured', () => {
  // 10:00Z = 15:30 IST, the bell. The market reads closed immediately...
  assert.equal(marketStatus('India', at('2026-09-07T10:00:00Z')).isOpen, false);
  // ...but the worker keeps polling through the grace period.
  assert.equal(isWithinPollWindow('India', at('2026-09-07T10:00:00Z')), true);
  assert.equal(isWithinPollWindow('India', at('2026-09-07T10:04:00Z')), true);
  // 10:05Z = 15:35 IST — grace over.
  assert.equal(isWithinPollWindow('India', at('2026-09-07T10:05:00Z')), false);
});

test('the US window closes 5 minutes after its own bell, in ET', () => {
  // 20:00Z = 16:00 ET in September (EDT).
  assert.equal(isWithinPollWindow('US', at('2026-09-07T19:59:00Z')), true);
  assert.equal(isWithinPollWindow('US', at('2026-09-07T20:04:00Z')), true);
  assert.equal(isWithinPollWindow('US', at('2026-09-07T20:05:00Z')), false);
});

test('the grace window is exactly the exported constant', () => {
  // Guards against the constant and the arithmetic drifting apart.
  const bell = at('2026-09-07T10:00:00Z'); // 15:30 IST
  const lastMinute = new Date(bell.getTime() + (POST_CLOSE_GRACE_MINUTES - 1) * 60_000);
  const justAfter = new Date(bell.getTime() + POST_CLOSE_GRACE_MINUTES * 60_000);
  assert.equal(isWithinPollWindow('India', lastMinute), true);
  assert.equal(isWithinPollWindow('India', justAfter), false);
});

test('weekends are never polled', () => {
  for (const iso of ['2026-09-05T06:00:00Z', '2026-09-06T06:00:00Z']) {
    assert.equal(isWithinPollWindow('India', at(iso)), false);
    assert.equal(isWithinPollWindow('US', at(iso)), false);
  }
});

test('each market is gated on its own clock', () => {
  // 05:00Z = 10:30 IST (India trading) and 01:00 ET (US shut).
  const when = at('2026-09-07T05:00:00Z');
  assert.equal(isWithinPollWindow('India', when), true);
  assert.equal(isWithinPollWindow('US', when), false);
});

test('an unknown market keeps polling rather than silently stopping', () => {
  // Failing open: losing quota is recoverable, losing a day of prices with
  // nothing in the log is not.
  assert.equal(isWithinPollWindow('Mars'), true);
  assert.equal(isWithinPollWindow(undefined), true);
});

test('US daylight saving is handled without a hardcoded offset', () => {
  // 14:00Z is 10:00 EDT in September but 09:00 EST in January.
  assert.equal(isWithinPollWindow('US', at('2026-09-07T14:00:00Z')), true);
  assert.equal(isWithinPollWindow('US', at('2026-01-07T14:00:00Z')), false);
  assert.equal(isWithinPollWindow('US', at('2026-01-07T14:30:00Z')), true);
});

test('the next-open search terminates on every weekday', () => {
  // The unbounded `while` this replaced could spin forever if the predicate
  // was never satisfiable. Every day of a week must produce a status.
  for (let d = 4; d <= 10; d += 1) {
    const iso = `2026-09-${String(d).padStart(2, '0')}T22:00:00Z`;
    assert.ok(marketStatus('India', at(iso)), `no status for ${iso}`);
    assert.ok(marketStatus('US', at(iso)), `no status for ${iso}`);
  }
});

test('exchanges resolve to their own market', () => {
  const when = at('2026-09-07T05:00:00Z');
  assert.equal(marketStatusForExchange('NSE', when).isOpen, true);
  assert.equal(marketStatusForExchange('BSE', when).isOpen, true);
  assert.equal(marketStatusForExchange('NASDAQ', when).isOpen, false);
  assert.equal(marketStatusForExchange('LSE'), null);
});

// The reason this file can assert anything about the UI's copy: the two are
// duplicated on purpose (Vite's dev server won't serve lib/), so nothing but a
// test stops them drifting. A mismatch would show the "Live" pill while the
// worker sat idle, or vice versa — a contradiction with no error anywhere.
test('the backend and frontend copies agree across a full year', () => {
  const mismatches = [];
  const start = Date.UTC(2026, 0, 1);
  // Every 37 minutes for a year: ~14k samples, deliberately not a round number
  // so the stride doesn't land on the same clock time each day and miss the
  // open/close boundaries.
  for (let t = start; t < start + 365 * 86_400_000; t += 37 * 60_000) {
    const when = new Date(t);
    for (const market of ['India', 'US']) {
      const mine = marketStatus(market, when);
      const theirs = uiMarketStatus(market, when);
      if (mine.isOpen !== theirs.isOpen || mine.detail !== theirs.detail) {
        mismatches.push(`${when.toISOString()} ${market}: lib=${mine.isOpen}/${mine.detail} ui=${theirs.isOpen}/${theirs.detail}`);
      }
    }
  }
  assert.deepEqual(mismatches.slice(0, 5), [], `${mismatches.length} mismatch(es)`);
});
