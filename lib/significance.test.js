import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectSignificantChange,
  detectSignificantChanges,
  DEFAULT_PRICE_THRESHOLD_PERCENT,
  DEFAULT_VOLUME_MULTIPLIER,
} from './significance.js';

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

// The walkthrough and the What Changed copy tell users which moves get
// flagged, and a brand-new account is on the defaults. frontend/ can't import
// this file (Vite's root stops at it), so the defaults there are a duplicate —
// and a duplicate nothing checks would eventually state a rule the product no
// longer follows.
test('the UI states the same default thresholds the detector applies', async () => {
  const ui = await import('../frontend/src/significanceCopy.js');
  assert.equal(ui.DEFAULT_PRICE_THRESHOLD_PERCENT, DEFAULT_PRICE_THRESHOLD_PERCENT);
  assert.equal(ui.DEFAULT_VOLUME_MULTIPLIER, DEFAULT_VOLUME_MULTIPLIER);
  // The wording says "or more" because both comparisons are >=. Pin that too,
  // so a threshold turning into a strict > doesn't leave the copy wrong.
  assert.match(ui.significanceRule(), /2% or more/);
  assert.equal(detectSignificantChange({
    ticker: 'X', current: { price: 102, volume: 10 }, previous: { price: 100, volume: 10 },
  }).isMeaningful, true, 'exactly 2% must be flagged for the copy to be true');
});

// Every preset the control offers has to be a setting the API will accept,
// otherwise a button on screen saves nothing and reports an error.
test('every sensitivity preset the UI offers is within the accepted range', async () => {
  const { SENSITIVITY_PRESETS } = await import('../frontend/src/significanceCopy.js');
  const { validateThresholds } = await import('./thresholds.js');

  assert.ok(SENSITIVITY_PRESETS.length > 0);
  for (const preset of SENSITIVITY_PRESETS) {
    const { error } = validateThresholds(preset);
    assert.equal(error, undefined, `preset "${preset.id}" rejected: ${error}`);
  }
});
