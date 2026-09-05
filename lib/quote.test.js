import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toFiniteOrNull } from './quote.js';

test('passes real numbers through unchanged', () => {
  assert.equal(toFiniteOrNull(-8.23999), -8.23999);
  assert.equal(toFiniteOrNull(0), 0);
});

test('parses the numeric strings Twelve Data returns', () => {
  assert.equal(toFiniteOrNull('-8.23999'), -8.23999);
  assert.equal(toFiniteOrNull('1.5'), 1.5);
});

test('a genuinely flat day stays 0, not null', () => {
  assert.equal(toFiniteOrNull('0.00000'), 0);
});

test('missing values become null rather than a misleading zero', () => {
  assert.equal(toFiniteOrNull(null), null);
  assert.equal(toFiniteOrNull(undefined), null);
  assert.equal(toFiniteOrNull(''), null);
});

test('unparseable values become null', () => {
  assert.equal(toFiniteOrNull('n/a'), null);
  assert.equal(toFiniteOrNull(NaN), null);
  assert.equal(toFiniteOrNull(Infinity), null);
});
