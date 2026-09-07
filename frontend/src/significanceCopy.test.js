import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SENSITIVITY_PRESETS,
  DEFAULT_THRESHOLDS,
  matchPreset,
  significanceSentence,
  significanceRule,
  sensitivityMeaning,
} from './significanceCopy.js';

test('the sentence states the thresholds it was given, not the defaults', () => {
  const sentence = significanceSentence({ priceThresholdPercent: 5, volumeMultiplier: 3 });
  assert.match(sentence, /±5% on price/);
  assert.match(sentence, /3× the usual volume/);
  assert.doesNotMatch(sentence, /2%/);
});

test('trailing zeros from NUMERIC(5, 2) are not read back to the user', () => {
  // The server returns 2 and 1.5 as numbers, but a value that round-tripped
  // through a string would arrive as "2.00" — which must not print as
  // "±2.00% on price".
  assert.match(significanceSentence({ priceThresholdPercent: '2.00', volumeMultiplier: '1.50' }), /±2% .*1\.5×/);
});

test('a fractional threshold keeps its decimal', () => {
  assert.match(significanceSentence({ priceThresholdPercent: 1, volumeMultiplier: 1.5 }), /1\.5× the usual volume/);
});

test('the rule says "or more", because the comparison is >=', () => {
  assert.match(significanceRule(DEFAULT_THRESHOLDS), /2% or more/);
});

test('both sentences fall back to the defaults when asked with nothing', () => {
  // Reached on the walkthrough for a user whose row hasn't loaded yet — better
  // the default rule than "undefined% on price".
  assert.match(significanceSentence(), /±2%/);
  assert.match(significanceRule(), /2% or more/);
});

test('every preset is matched by its own values', () => {
  for (const preset of SENSITIVITY_PRESETS) {
    assert.equal(matchPreset(preset)?.id, preset.id);
  }
});

test('the balanced preset is the server default, so a new user starts on it', () => {
  assert.equal(matchPreset(DEFAULT_THRESHOLDS)?.id, 'balanced');
});

test('presets are distinct and ordered from least to most talkative', () => {
  const prices = SENSITIVITY_PRESETS.map((p) => p.priceThresholdPercent);
  const volumes = SENSITIVITY_PRESETS.map((p) => p.volumeMultiplier);
  assert.deepEqual(prices, [...prices].sort((a, b) => b - a));
  assert.deepEqual(volumes, [...volumes].sort((a, b) => b - a));
  assert.equal(new Set(prices).size, prices.length);
});

test('a threshold pair matching no preset still has something to say', () => {
  const custom = { priceThresholdPercent: 3.5, volumeMultiplier: 2.5 };
  assert.equal(matchPreset(custom), null);
  // Falls through to the numeric sentence rather than rendering nothing.
  assert.match(sensitivityMeaning(custom), /±3\.5% on price/);
});

test('a preset explains itself without quoting a number', () => {
  assert.equal(sensitivityMeaning(DEFAULT_THRESHOLDS), matchPreset(DEFAULT_THRESHOLDS).meaning);
  assert.doesNotMatch(sensitivityMeaning(DEFAULT_THRESHOLDS), /\d/);
});
