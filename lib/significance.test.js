import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSignificantChange, detectSignificantChanges } from './significance.js';

test('no previous snapshot -> not meaningful (nothing to diff against)', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    current: { price: 100, volume: 1000 },
    previous: null,
  });
  assert.equal(result.isMeaningful, false);
  assert.equal(result.summary, null);
});

test('price jump beyond threshold is meaningful', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    companyName: 'TCS',
    current: { price: 103, volume: 1000 },
    previous: { price: 100, volume: 1000 },
  });
  assert.equal(result.isMeaningful, true);
  assert.equal(Math.round(result.priceChangePercent * 10) / 10, 3);
  assert.equal(result.summary, 'TCS jumped 3.0% since you last checked');
});

test('price drop beyond threshold is meaningful and says "dropped"', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    companyName: 'TCS',
    current: { price: 97, volume: 1000 },
    previous: { price: 100, volume: 1000 },
  });
  assert.equal(result.isMeaningful, true);
  assert.match(result.summary, /^TCS dropped 3\.0% since you last checked$/);
});

test('price move under threshold, normal volume -> not meaningful', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    current: { price: 101, volume: 1000 },
    previous: { price: 100, volume: 1000 },
  });
  assert.equal(result.isMeaningful, false);
  assert.equal(result.reasons.length, 0);
});

test('volume spike alone (price flat) is meaningful', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    companyName: 'TCS',
    current: { price: 100, volume: 2500 },
    previous: { price: 100, volume: 1000 },
  });
  assert.equal(result.isMeaningful, true);
  assert.equal(result.volumeRatio, 2.5);
  assert.equal(result.summary, 'TCS traded at 2.5x its usual volume since you last checked');
});

test('price and volume both significant combine into one summary', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    companyName: 'TCS',
    current: { price: 103, volume: 2500 },
    previous: { price: 100, volume: 1000 },
  });
  assert.equal(result.reasons.length, 2);
  assert.equal(result.summary, 'TCS jumped 3.0% and traded at 2.5x its usual volume since you last checked');
});

test('previous volume of 0 with current volume > 0 is a surge, not a crash', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    companyName: 'TCS',
    current: { price: 100, volume: 500 },
    previous: { price: 100, volume: 0 },
  });
  assert.equal(result.isMeaningful, true);
  assert.equal(result.volumeRatio, Infinity);
  assert.equal(result.summary, 'TCS saw a surge in trading volume since you last checked');
});

test('previous price of 0 does not produce a percent change or crash', () => {
  const result = detectSignificantChange({
    ticker: 'TCS',
    current: { price: 100, volume: 1000 },
    previous: { price: 0, volume: 1000 },
  });
  assert.equal(result.priceChangePercent, null);
});

test('custom thresholds override the defaults', () => {
  const lenient = detectSignificantChange({
    ticker: 'TCS',
    current: { price: 105, volume: 1000 },
    previous: { price: 100, volume: 1000 },
    priceThresholdPercent: 10,
  });
  assert.equal(lenient.isMeaningful, false);

  const strict = detectSignificantChange({
    ticker: 'TCS',
    current: { price: 100.5, volume: 1000 },
    previous: { price: 100, volume: 1000 },
    priceThresholdPercent: 0.1,
  });
  assert.equal(strict.isMeaningful, true);
});

test('detectSignificantChanges batches a watchlist and preserves order', () => {
  const results = detectSignificantChanges([
    { ticker: 'TCS', current: { price: 103, volume: 1000 }, previous: { price: 100, volume: 1000 } },
    { ticker: 'INFY', current: { price: 100, volume: 1000 }, previous: { price: 100, volume: 1000 } },
  ]);
  assert.equal(results.length, 2);
  assert.equal(results[0].ticker, 'TCS');
  assert.equal(results[0].isMeaningful, true);
  assert.equal(results[1].ticker, 'INFY');
  assert.equal(results[1].isMeaningful, false);
});
