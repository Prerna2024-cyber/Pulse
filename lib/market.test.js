import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exchangesForMarket, VALID_MARKETS } from './market.js';

test('India maps to NSE and BSE', () => {
  assert.deepEqual(exchangesForMarket('India'), ['NSE', 'BSE']);
});

test('US maps to NASDAQ', () => {
  assert.deepEqual(exchangesForMarket('US'), ['NASDAQ']);
});

test('unknown market throws rather than silently returning no scope', () => {
  assert.throws(() => exchangesForMarket('Mars'));
});

test('VALID_MARKETS lists both supported markets', () => {
  assert.deepEqual(VALID_MARKETS, ['India', 'US']);
});
