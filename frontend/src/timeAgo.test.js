import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeAgo, isStale, lastUpdatedLabel, STALE_AFTER_MS } from './timeAgo.js';
import { sessionCloseLabel } from './marketHours.js';

// Fixed instants, so these hold whatever timezone the machine is set to.
// 2026-09-04 is a Friday; 09-05 Saturday; 09-06 Sunday; 09-07 Monday.
const FRI_CLOSE = '2026-09-04T10:02:00Z'; // 15:32 IST — just after the 15:30 bell
const FRI_LUNCH = '2026-09-04T07:00:00Z'; // 12:30 IST — mid-session
const SUNDAY = new Date('2026-09-06T11:00:00Z');
const MON_SESSION = new Date('2026-09-07T05:00:00Z'); // 10:30 IST, India trading

test('timeAgo measures against the instant it is given', () => {
  const t = '2026-09-07T04:00:00Z';
  assert.equal(timeAgo(t, new Date('2026-09-07T04:00:30Z')), 'just now');
  assert.equal(timeAgo(t, new Date('2026-09-07T04:05:00Z')), '5m ago');
  assert.equal(timeAgo(t, new Date('2026-09-07T07:00:00Z')), '3h ago');
  assert.equal(timeAgo(t, new Date('2026-09-09T04:00:00Z')), '2d ago');
});

test('a closed market is never stale, however old the reading', () => {
  // The whole point: the worker stopped polling closed markets, so age alone
  // no longer means anything is wrong.
  assert.equal(isStale(FRI_CLOSE, false), false);
  assert.equal(isStale('2020-01-01T00:00:00Z', false), false);
});

test('inside the poll window the threshold still applies', () => {
  const now = Date.now();
  assert.equal(isStale(new Date(now - STALE_AFTER_MS - 1000).toISOString(), true), true);
  assert.equal(isStale(new Date(now - 60_000).toISOString(), true), false);
});

test('the default keeps the old time-only behaviour', () => {
  // A caller with no market context must not silently lose its warning.
  assert.equal(isStale('2020-01-01T00:00:00Z'), true);
});

test('a missing timestamp is never stale', () => {
  assert.equal(isStale(null, true), false);
  assert.equal(isStale(undefined, false), false);
});

test('a closed market names the session rather than an age', () => {
  // "16 hours ago" is accurate but makes the reader work out why.
  assert.equal(lastUpdatedLabel(FRI_CLOSE, 'India', SUNDAY), "Friday's close");
});

test('a market being polled reports an age, not a session', () => {
  assert.equal(lastUpdatedLabel(FRI_CLOSE, 'India', MON_SESSION), '2d ago');
});

test('a reading taken mid-session is not called a close', () => {
  // The worker stopping at Friday lunchtime is a different fact from Friday's
  // close, and labelling it as one would be the quiet kind of wrong.
  assert.equal(lastUpdatedLabel(FRI_LUNCH, 'India', SUNDAY), '2d ago');
  assert.equal(sessionCloseLabel(new Date(FRI_LUNCH), 'India'), null);
  assert.equal(sessionCloseLabel(new Date(FRI_CLOSE), 'India'), "Friday's close");
});

test('a weekday name stops being used once it is ambiguous', () => {
  // Eight days on, "Friday's close" would not say which Friday.
  const longAgo = '2026-08-28T10:02:00Z'; // also a Friday, at the close
  assert.equal(lastUpdatedLabel(longAgo, 'India', SUNDAY), '9d ago');
});

test('the US session is labelled on its own clock', () => {
  // 20:02Z = 16:02 ET, just after the NASDAQ bell.
  assert.equal(lastUpdatedLabel('2026-09-04T20:02:00Z', 'US', SUNDAY), "Friday's close");
  // The same instant is 01:32 IST Saturday — not an Indian close at all.
  assert.equal(sessionCloseLabel(new Date('2026-09-04T20:02:00Z'), 'India'), null);
});

test('an unknown market falls back to an age rather than inventing a session', () => {
  assert.equal(lastUpdatedLabel(FRI_CLOSE, 'Mars', SUNDAY), '2d ago');
  assert.equal(sessionCloseLabel(new Date(FRI_CLOSE), 'Mars'), null);
});

test('a missing timestamp has no label', () => {
  assert.equal(lastUpdatedLabel(null, 'India', SUNDAY), null);
});

test('a reading from the future is not labelled a past session', () => {
  // Clock skew shouldn't produce "Monday's close" for something not yet taken.
  const future = '2026-09-08T10:02:00Z';
  assert.equal(lastUpdatedLabel(future, 'India', SUNDAY), 'just now');
});
