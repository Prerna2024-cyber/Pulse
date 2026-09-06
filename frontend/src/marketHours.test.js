import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketStatus } from './marketHours.js';

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
