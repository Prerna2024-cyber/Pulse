import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayRangeItems } from './dayRange.js';

const keys = (item) => dayRangeItems(item).map((i) => i.key);
const values = (item) => dayRangeItems(item).map((i) => i.value);

test('a full quote lists open, high and low in that order', () => {
  const item = { dayOpen: 2330, previousClose: 2320.1, dayHigh: 2363.9, dayLow: 2302.4 };
  assert.deepEqual(keys(item), ['O', 'H', 'L']);
  assert.deepEqual(values(item), [2330, 2363.9, 2302.4]);
});

test('Postgres NUMERIC strings are parsed, not passed through', () => {
  const item = { dayOpen: '2330.0000', dayHigh: '2363.9000', dayLow: '2302.4000' };
  assert.deepEqual(values(item), [2330, 2363.9, 2302.4]);
});

test('previous close stands in for a missing open, and says so', () => {
  const item = { dayOpen: null, previousClose: 2320.1, dayHigh: null, dayLow: null };
  assert.deepEqual(dayRangeItems(item), [{ key: 'PC', label: 'Previous close', value: 2320.1 }]);
});

test('open wins when both are present', () => {
  const item = { dayOpen: 2330, previousClose: 2320.1 };
  assert.deepEqual(dayRangeItems(item), [{ key: 'O', label: 'Open', value: 2330 }]);
});

test('a missing figure is dropped rather than shown as zero', () => {
  const item = { dayOpen: 2330, previousClose: null, dayHigh: null, dayLow: 2302.4 };
  assert.deepEqual(keys(item), ['O', 'L']);
});

test('nothing known yields an empty list, for the caller to render as a dash', () => {
  assert.deepEqual(dayRangeItems({}), []);
  assert.deepEqual(dayRangeItems({ dayOpen: null, previousClose: null, dayHigh: null, dayLow: null }), []);
});

test('a genuine zero is kept, an empty string is not', () => {
  // 0 is a real reading and must survive; '' and null are absences.
  assert.deepEqual(dayRangeItems({ dayLow: 0 }), [{ key: 'L', label: 'Day low', value: 0 }]);
  assert.deepEqual(dayRangeItems({ dayLow: '' }), []);
});

test('unparseable values are treated as missing', () => {
  assert.deepEqual(dayRangeItems({ dayOpen: 'n/a', dayHigh: undefined, dayLow: NaN }), []);
});

test('every item carries a screen-reader label distinct from its marker', () => {
  const items = dayRangeItems({ dayOpen: 1, dayHigh: 2, dayLow: 3 });
  assert.deepEqual(items.map((i) => i.label), ['Open', 'Day high', 'Day low']);
  assert.ok(items.every((i) => i.key !== i.label));
});
