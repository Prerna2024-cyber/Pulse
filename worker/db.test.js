import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rejectUnstorableQuotes } from './db.js';

// Importing db.js builds a pg Pool but never connects — these are pure checks
// on the guard that stands in front of the INSERT.

let errors;
const realError = console.error;

beforeEach(() => {
  errors = [];
  console.error = (msg) => errors.push(String(msg));
});

afterEach(() => {
  console.error = realError;
});

const quote = (over = {}) => ({
  ticker: 'TCS',
  price: 2304,
  volume: 2564322,
  dayChange: -16.1,
  dayChangePercent: -0.69,
  dayOpen: 2330,
  previousClose: 2320.1,
  dayHigh: 2363.9,
  dayLow: 2302.4,
  fetchedAt: new Date(),
  ...over,
});

test('a normal poll passes through untouched', () => {
  const quotes = [quote(), quote({ ticker: 'INFY' })];
  assert.equal(rejectUnstorableQuotes(quotes).length, 2);
  assert.deepEqual(errors, []);
});

test('one unstorable quote costs that ticker, not the whole poll', () => {
  // The finding this fixes: a single bad value aborted the transaction, so
  // every good quote in the same poll was discarded with it.
  const quotes = [
    quote({ ticker: 'GOOD1' }),
    quote({ ticker: 'BAD', price: 1e15 }), // finite, but overflows NUMERIC(12,4)
    quote({ ticker: 'GOOD2' }),
  ];
  const kept = rejectUnstorableQuotes(quotes);
  assert.deepEqual(kept.map((q) => q.ticker), ['GOOD1', 'GOOD2']);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /BAD: dropped/);
});

test('every value Postgres would reject or mis-store is caught', () => {
  // Verified against the live database: 1e15 and Infinity raise "numeric field
  // overflow", and NaN is *accepted* and stored as the literal NaN.
  for (const price of [NaN, Infinity, -Infinity, 1e15, -1e15]) {
    assert.equal(rejectUnstorableQuotes([quote({ price })]).length, 0, `price ${price} was not rejected`);
  }
  for (const volume of [NaN, Infinity, -1, 1e30]) {
    assert.equal(rejectUnstorableQuotes([quote({ volume })]).length, 0, `volume ${volume} was not rejected`);
  }
});

test('the largest storable values are still accepted', () => {
  // Guard against an over-eager bound that would drop legitimate readings.
  assert.equal(rejectUnstorableQuotes([quote({ price: 99999999.9999 })]).length, 1);
  assert.equal(rejectUnstorableQuotes([quote({ price: 0 })]).length, 1);
  assert.equal(rejectUnstorableQuotes([quote({ volume: 0 })]).length, 1);
});

test('NUMERIC strings from a fetcher are still storable', () => {
  // price/volume can legitimately arrive as strings; the guard must not
  // mistake "2304" for garbage.
  const kept = rejectUnstorableQuotes([quote({ price: '2304.0000', volume: '2564322' })]);
  assert.equal(kept.length, 1);
});

test('an out-of-range optional field is nulled, not dropped with the row', () => {
  // A bad day_high shouldn't cost the price — it's nullable, and null is what
  // "unknown" already means everywhere else.
  const kept = rejectUnstorableQuotes([quote({ dayHigh: 1e15 })]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].dayHigh, null);
  assert.equal(kept[0].price, 2304, 'the rest of the row must survive');
  assert.match(errors[0], /dayHigh.*storing null/);
});

test('legitimately absent optional fields stay null and stay quiet', () => {
  const kept = rejectUnstorableQuotes([
    quote({ dayOpen: null, previousClose: null, dayHigh: null, dayLow: null }),
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].dayOpen, null);
  assert.deepEqual(errors, []);
});

test('the input array is not mutated', () => {
  const original = quote({ dayHigh: 1e15 });
  rejectUnstorableQuotes([original]);
  assert.equal(original.dayHigh, 1e15, 'caller\'s object should be left alone');
});

test('an empty poll is handled', () => {
  assert.deepEqual(rejectUnstorableQuotes([]), []);
});
