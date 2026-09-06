import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { positiveIntFromEnv } from './env.js';

const NAME = 'PULSE_ENV_TEST_VALUE';
let errors;
const realError = console.error;

beforeEach(() => {
  errors = [];
  console.error = (msg) => errors.push(String(msg));
  delete process.env[NAME];
});

afterEach(() => {
  console.error = realError;
  delete process.env[NAME];
});

test('an unset variable takes the default, quietly', () => {
  assert.equal(positiveIntFromEnv(NAME, 42), 42);
  assert.deepEqual(errors, []);
});

test('an empty or whitespace variable takes the default, quietly', () => {
  for (const raw of ['', '   ']) {
    process.env[NAME] = raw;
    assert.equal(positiveIntFromEnv(NAME, 42), 42);
  }
  assert.deepEqual(errors, []);
});

test('a valid value is used', () => {
  process.env[NAME] = '8';
  assert.equal(positiveIntFromEnv(NAME, 42), 8);
  assert.deepEqual(errors, []);
});

test('a set-but-unparseable value falls back AND says so', () => {
  // This is the whole point: `Number(process.env.X || 4)` returned NaN here,
  // and NaN went on to mean "0 workers" and "1ms interval" downstream.
  process.env[NAME] = 'abc';
  assert.equal(positiveIntFromEnv(NAME, 4), 4);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /PULSE_ENV_TEST_VALUE="abc".*falling back to 4/);
});

test('zero and negatives are rejected, not passed through', () => {
  // 0 workers and a negative interval are both silently catastrophic.
  for (const raw of ['0', '-1', '-100']) {
    process.env[NAME] = raw;
    assert.equal(positiveIntFromEnv(NAME, 4), 4);
  }
  assert.equal(errors.length, 3);
});

test('Infinity and NaN spellings are rejected', () => {
  for (const raw of ['Infinity', '-Infinity', 'NaN']) {
    process.env[NAME] = raw;
    assert.equal(positiveIntFromEnv(NAME, 4), 4);
  }
  assert.equal(errors.length, 3);
});

test('a fractional value is floored rather than refused', () => {
  process.env[NAME] = '4.9';
  assert.equal(positiveIntFromEnv(NAME, 1), 4);
  assert.deepEqual(errors, []);
});

test('the result is always usable as a count and as a delay', () => {
  // The two things these values feed: Array.from({length}) and setInterval.
  for (const raw of ['abc', '0', '-5', 'NaN', '']) {
    process.env[NAME] = raw;
    const n = positiveIntFromEnv(NAME, 4);
    assert.ok(Number.isInteger(n) && n >= 1, `${raw} produced ${n}`);
    assert.equal(Array.from({ length: Math.min(n, 6) }, () => 1).length, Math.min(n, 6));
  }
});
