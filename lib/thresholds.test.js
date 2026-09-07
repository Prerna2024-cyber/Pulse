import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSignificantChange } from './significance.js';
import {
  validateThresholds,
  validatePriceThresholdPercent,
  validateVolumeMultiplier,
  DEFAULT_THRESHOLDS,
  PRICE_THRESHOLD_MIN,
  PRICE_THRESHOLD_MAX,
  VOLUME_MULTIPLIER_MIN,
  VOLUME_MULTIPLIER_MAX,
} from './thresholds.js';

test('a normal pair of values is accepted and echoed back', () => {
  const { thresholds, error } = validateThresholds({ priceThresholdPercent: 5, volumeMultiplier: 3 });
  assert.equal(error, undefined);
  assert.deepEqual(thresholds, { priceThresholdPercent: 5, volumeMultiplier: 3 });
});

test('the bounds themselves are valid — a slider can be dragged to its end', () => {
  assert.equal(validatePriceThresholdPercent(PRICE_THRESHOLD_MIN).error, undefined);
  assert.equal(validatePriceThresholdPercent(PRICE_THRESHOLD_MAX).error, undefined);
  assert.equal(validateVolumeMultiplier(VOLUME_MULTIPLIER_MIN).error, undefined);
  assert.equal(validateVolumeMultiplier(VOLUME_MULTIPLIER_MAX).error, undefined);
});

test('out-of-range values are rejected, not clamped', () => {
  const tooLoud = validatePriceThresholdPercent(0.01);
  assert.match(tooLoud.error, /between/);
  assert.equal(tooLoud.value, undefined);

  assert.match(validatePriceThresholdPercent(50).error, /between/);
  // 1x would flag every ticker whose volume merely held steady.
  assert.match(validateVolumeMultiplier(1).error, /between/);
  assert.match(validateVolumeMultiplier(100).error, /between/);
});

test('non-numbers are rejected rather than coerced', () => {
  // Number('2') is 2, but so is Number(' 2 ') and Number('') is 0 — accepting
  // strings here means accepting an empty field as "zero percent".
  for (const bad of ['2', '', null, undefined, true, {}, [], NaN, Infinity]) {
    assert.match(validatePriceThresholdPercent(bad).error, /must be a number/, `rejected: ${String(bad)}`);
  }
});

test('a bad second value rejects the whole pair, leaving neither applied', () => {
  const { thresholds, error } = validateThresholds({ priceThresholdPercent: 2, volumeMultiplier: 99 });
  assert.equal(thresholds, undefined);
  assert.match(error, /volumeMultiplier/);
});

test('a missing body is a rejection, not a crash', () => {
  assert.match(validateThresholds(undefined).error, /priceThresholdPercent/);
  assert.match(validateThresholds({}).error, /priceThresholdPercent/);
});

test('values are rounded to what NUMERIC(5, 2) can actually store', () => {
  const { thresholds } = validateThresholds({ priceThresholdPercent: 2.005, volumeMultiplier: 1.999 });
  assert.deepEqual(thresholds, { priceThresholdPercent: 2.01, volumeMultiplier: 2 });
});

// The column defaults in migration_add_thresholds.sql mirror these, so a user
// who never touches the setting is on a value the API would also accept back.
test('the defaults are within the accepted range', () => {
  const { thresholds, error } = validateThresholds(DEFAULT_THRESHOLDS);
  assert.equal(error, undefined);
  assert.deepEqual(thresholds, DEFAULT_THRESHOLDS);
});

// The point of the whole feature: the same move is or isn't news depending on
// the setting the user is on.
test('an accepted setting changes what the detector flags', () => {
  const move = {
    ticker: 'TCS',
    current: { price: 103, volume: 1000 },
    previous: { price: 100, volume: 1000 },
  };
  const strict = validateThresholds({ priceThresholdPercent: 5, volumeMultiplier: 3 }).thresholds;
  const loose = validateThresholds({ priceThresholdPercent: 1, volumeMultiplier: 1.5 }).thresholds;

  assert.equal(detectSignificantChange({ ...move, ...strict }).isMeaningful, false);
  assert.equal(detectSignificantChange({ ...move, ...loose }).isMeaningful, true);
});
