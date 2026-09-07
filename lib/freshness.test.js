import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteSessionDate, partitionBySession, staleQuotesMessage } from './freshness.js';
import { sessionDateForMarket, POST_CLOSE_GRACE_MINUTES } from './marketHours.js';

test('reads the date out of every shape the two providers send', () => {
  assert.equal(quoteSessionDate('2026-09-04'), '2026-09-04'); // Twelve Data /quote
  assert.equal(quoteSessionDate('2026-09-07 15:33:26'), '2026-09-07'); // Indian API timestamp
  assert.equal(quoteSessionDate('2026-09-04T13:30:00Z'), '2026-09-04'); // ISO, just in case
  assert.equal(quoteSessionDate('  2026-09-04  '), '2026-09-04');
});

test('an unusable source date reads as absent rather than as some other day', () => {
  for (const bad of [null, undefined, '', 'yesterday', 42, {}, '04-09-2026']) {
    assert.equal(quoteSessionDate(bad), null, `should be null: ${String(bad)}`);
  }
});

test('quotes from the session are kept and quotes from another day are dropped', () => {
  const quotes = [
    { ticker: 'AAPL', sourceDate: '2026-09-07' },
    { ticker: 'ADSK', sourceDate: '2026-09-04' },
    { ticker: 'GOOGL', sourceDate: '2026-09-07' },
  ];
  const { fresh, stale } = partitionBySession(quotes, '2026-09-07');
  assert.deepEqual(fresh.map((q) => q.ticker), ['AAPL', 'GOOGL']);
  assert.deepEqual(stale.map((q) => q.ticker), ['ADSK']);
});

// The Labor Day case, as it actually happened: every quote three days old,
// arriving on a schedule that believed the market was open.
test('a holiday drops the whole poll rather than recording last week again', () => {
  const quotes = ['AAPL', 'ADSK', 'GOOGL', 'ADBE', 'AMD'].map((ticker) => ({
    ticker,
    sourceDate: '2026-09-04',
    sourceMarketOpen: false,
  }));
  const { fresh, stale } = partitionBySession(quotes, '2026-09-07');
  assert.equal(fresh.length, 0);
  assert.equal(stale.length, 5);
});

test('a missing source date is kept, not dropped, and is reported separately', () => {
  // Failing closed here would mean a renamed provider field silently costs a
  // whole day of prices — worse than storing one stale row.
  const quotes = [{ ticker: 'AAPL', sourceDate: null }, { ticker: 'ADSK', sourceDate: '2026-09-07' }];
  const { fresh, stale, undated } = partitionBySession(quotes, '2026-09-07');
  assert.deepEqual(fresh.map((q) => q.ticker), ['AAPL', 'ADSK']);
  assert.equal(stale.length, 0);
  assert.deepEqual(undated.map((q) => q.ticker), ['AAPL']);
});

test('an unknown session date filters nothing at all', () => {
  const quotes = [{ ticker: 'AAPL', sourceDate: '2026-09-04' }];
  for (const unknown of [null, undefined, '']) {
    const { fresh, stale } = partitionBySession(quotes, unknown);
    assert.equal(fresh.length, 1, 'must fail open');
    assert.equal(stale.length, 0);
  }
});

test('the skip message names the dates and quotes the provider when it can', () => {
  const stale = [
    { ticker: 'AAPL', sourceDate: '2026-09-04', sourceMarketOpen: false },
    { ticker: 'ADSK', sourceDate: '2026-09-04', sourceMarketOpen: false },
  ];
  const msg = staleQuotesMessage(stale, '2026-09-07');
  assert.match(msg, /skipped 2 quote\(s\) dated 2026-09-04/);
  assert.match(msg, /not this session \(2026-09-07\)/);
  assert.match(msg, /provider reports the market closed/);

  // The Indian feed sends no open/closed flag, so the message must still read
  // correctly with nothing to quote.
  const noFlag = [{ ticker: 'RELIANCE', sourceDate: '2026-09-04', sourceMarketOpen: null }];
  assert.doesNotMatch(staleQuotesMessage(noFlag, '2026-09-07'), /provider reports/);
  assert.equal(staleQuotesMessage([], '2026-09-07'), null);
});

// --- the interaction that decides whether this is safe to ship -------------

test('the settled close after the bell is still this session, so it is kept', () => {
  // 16:02 ET on a normal Tuesday: inside the post-close grace window, where
  // is_market_open has already flipped false. Gating on that flag would throw
  // away the exact reading the grace window exists to capture; gating on the
  // date keeps it.
  const duringGrace = new Date('2026-09-08T20:02:00Z'); // 16:02 ET
  assert.ok(POST_CLOSE_GRACE_MINUTES >= 2, 'this instant must be inside the grace window');

  const sessionDate = sessionDateForMarket('US', duringGrace);
  assert.equal(sessionDate, '2026-09-08', 'the session that just ended, not the next one');

  const settledClose = [{ ticker: 'AAPL', sourceDate: '2026-09-08', sourceMarketOpen: false }];
  const { fresh, stale } = partitionBySession(settledClose, sessionDate);
  assert.equal(fresh.length, 1, 'the settled close must survive the check');
  assert.equal(stale.length, 0);
});

test('the session date follows the market, not the host clock', () => {
  // 01:00 UTC on the 8th is still the 7th in New York and already the 8th in
  // Mumbai. Both answers are about the market, and neither is about Railway's
  // `iad` region.
  const at = new Date('2026-09-08T01:00:00Z');
  assert.equal(sessionDateForMarket('US', at), '2026-09-07');
  assert.equal(sessionDateForMarket('India', at), '2026-09-07'); // before the 9:15 IST bell
});

test('before the opening bell the session date is the previous trading day', () => {
  const preMarket = new Date('2026-09-08T12:00:00Z'); // 08:00 ET, before 9:30
  assert.equal(sessionDateForMarket('US', preMarket), '2026-09-07');
});

test('an unknown market has no session date, which filters nothing', () => {
  assert.equal(sessionDateForMarket('Mars'), null);
  assert.equal(sessionDateForMarket('US', new Date('nonsense')), null);
});
