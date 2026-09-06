import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketStatus, marketStatusForExchange } from './marketHours.js';

// Every instant here is written in UTC and converted by the module, so these
// assertions hold whatever timezone the machine running them is set to.
const at = (iso) => new Date(iso);

// 2026-09-07 is a Monday; 2026-09-04 a Friday; 2026-09-05 a Saturday.

test('India is open mid-session', () => {
  // 04:00Z = 09:30 IST
  const status = marketStatus('India', at('2026-09-07T04:00:00Z'));
  assert.equal(status.isOpen, true);
  assert.equal(status.label, 'Live');
  assert.equal(status.exchange, 'NSE/BSE');
  assert.equal(status.detail, 'closes 3:30 PM IST');
});

test('India before the bell says it opens today', () => {
  // 03:30Z = 09:00 IST
  const status = marketStatus('India', at('2026-09-07T03:30:00Z'));
  assert.equal(status.isOpen, false);
  assert.equal(status.detail, 'Opens today 9:15 AM IST');
});

test('India after the close rolls to tomorrow', () => {
  // 10:30Z = 16:00 IST, Monday
  const status = marketStatus('India', at('2026-09-07T10:30:00Z'));
  assert.equal(status.isOpen, false);
  assert.equal(status.detail, 'Opens tomorrow 9:15 AM IST');
});

test('the open boundary counts as open and the close boundary does not', () => {
  // 03:45Z = 09:15 IST exactly; 10:00Z = 15:30 IST exactly.
  assert.equal(marketStatus('India', at('2026-09-07T03:45:00Z')).isOpen, true);
  assert.equal(marketStatus('India', at('2026-09-07T10:00:00Z')).isOpen, false);
});

test('Friday after the close skips the weekend to Monday', () => {
  const status = marketStatus('India', at('2026-09-04T12:00:00Z'));
  assert.equal(status.isOpen, false);
  assert.equal(status.detail, 'Opens Monday 9:15 AM IST');
});

test('Saturday names Monday rather than tomorrow', () => {
  assert.equal(marketStatus('India', at('2026-09-05T06:00:00Z')).detail, 'Opens Monday 9:15 AM IST');
});

test('Sunday opens tomorrow', () => {
  assert.equal(marketStatus('India', at('2026-09-06T06:00:00Z')).detail, 'Opens tomorrow 9:15 AM IST');
});

test('the closed banner sentence reads as specified', () => {
  // How MarketStatus composes it: "<exchange> is closed. <detail>."
  const status = marketStatus('India', at('2026-09-05T06:00:00Z'));
  assert.equal(
    `${status.exchange} is closed. ${status.detail}.`,
    'NSE/BSE is closed. Opens Monday 9:15 AM IST.'
  );
});

test('a weekday inside Indian hours is still closed for the US market', () => {
  // 04:00Z is 09:30 IST (open) but 00:30 ET (closed) — the status is scoped to
  // the market, not to whichever session happens to be running somewhere.
  assert.equal(marketStatus('India', at('2026-09-07T04:00:00Z')).isOpen, true);
  assert.equal(marketStatus('US', at('2026-09-07T04:00:00Z')).isOpen, false);
});

test('US hours follow daylight saving without a hardcoded offset', () => {
  // 14:00Z is 10:00 EDT in September (open) but 09:00 EST in January (early).
  assert.equal(marketStatus('US', at('2026-09-07T14:00:00Z')).isOpen, true);
  assert.equal(marketStatus('US', at('2026-01-07T14:00:00Z')).isOpen, false);
  assert.equal(marketStatus('US', at('2026-01-07T14:30:00Z')).isOpen, true);
});

test('US is labelled NASDAQ and reports its close in ET', () => {
  const status = marketStatus('US', at('2026-09-07T14:00:00Z'));
  assert.equal(status.exchange, 'NASDAQ');
  assert.equal(status.detail, 'closes 4:00 PM ET');
});

test('an icon and a word carry the state, not colour alone', () => {
  const open = marketStatus('India', at('2026-09-07T04:00:00Z'));
  const closed = marketStatus('India', at('2026-09-07T10:30:00Z'));
  assert.notEqual(open.icon, closed.icon);
  assert.notEqual(open.label, closed.label);
  assert.notEqual(open.tone, closed.tone);
});

test('an unknown market returns null rather than a wrong "Closed"', () => {
  assert.equal(marketStatus('Mars'), null);
  assert.equal(marketStatus(undefined), null);
});

test('an exchange resolves to its own market, not the viewer\'s', () => {
  // 05:00Z is 10:30 IST (open) and 01:00 ET (closed). A NASDAQ row must read
  // as closed here even though the viewer's Indian market is trading.
  const at = new Date('2026-09-07T05:00:00Z');
  assert.equal(marketStatusForExchange('NSE', at).isOpen, true);
  assert.equal(marketStatusForExchange('BSE', at).isOpen, true);
  assert.equal(marketStatusForExchange('NASDAQ', at).isOpen, false);
});

test('both Indian exchanges share one schedule', () => {
  const at = new Date('2026-09-04T12:00:00Z');
  assert.deepEqual(marketStatusForExchange('NSE', at), marketStatusForExchange('BSE', at));
});

test('an unknown exchange returns null so the row says nothing', () => {
  assert.equal(marketStatusForExchange('LSE'), null);
  assert.equal(marketStatusForExchange(undefined), null);
});

test('the next-open search terminates for every day of the week', () => {
  // This replaced an unbounded `while`: an unrecognised weekday made every
  // comparison false, so the loop spun forever — and it runs during render,
  // so that hung the tab rather than showing a wrong label.
  for (let d = 1; d <= 14; d += 1) {
    const when = new Date(Date.UTC(2026, 8, d, 22, 0));
    assert.ok(marketStatus('India', when), `no status for day ${d}`);
    assert.ok(marketStatus('US', when), `no status for day ${d}`);
  }
});

test('an unreadable clock returns null rather than throwing mid-render', () => {
  assert.equal(marketStatus('India', new Date('nonsense')), null);
  assert.equal(marketStatus('India', 'yesterday'), null);
  assert.equal(marketStatus('India', null), null);
  assert.equal(marketStatusForExchange('NSE', new Date('nonsense')), null);
});
