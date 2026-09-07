// Does a quote actually belong to the session we think we're polling?
//
// The schedule in marketHours.js knows weekends and clock hours, and it says
// so itself: it has no holiday calendar. On 2026-09-07 (US Labor Day) it
// reported NASDAQ open, the worker polled every five minutes, Twelve Data
// returned Friday's close each time, and 22 identical rows per ticker went
// into price_history — with fetched_at moving, so nothing downstream could
// tell it was three days stale. The chart drew a flat line across a day the
// market never opened.
//
// The fix is to stop trusting our own calendar as the last word and ask the
// data. Both providers stamp a quote with the session it came from:
//
//   Twelve Data  quote.datetime   "2026-09-04"           (+ is_market_open)
//   Indian API   data.timestamp   "2026-09-07 15:33:26"  (also last_update)
//
// If that date isn't the session date we're polling for, the provider has
// nothing for this session and the quote is last session's, however fresh the
// HTTP response was.
//
// WHY THE DATE AND NOT is_market_open:
// is_market_open is the more direct-sounding signal and it is wrong for us.
// POST_CLOSE_GRACE_MINUTES exists precisely so the last poll lands *after* the
// bell and stores the settled close — at which point is_market_open is false
// on a perfectly normal trading day. Gating on it would throw away the one
// reading the grace window was built to capture. The session date is false
// only when the data really is from another day, which is the question being
// asked. is_market_open is still carried through, for the log line: "provider
// says closed" is the sentence that explains a skip to a human.

// The leading calendar date of a provider timestamp, as 'YYYY-MM-DD'.
//
// Deliberately a prefix match rather than Date parsing: these strings are in
// the market's own local time and carry no zone, so handing them to `new Date`
// would reinterpret them in the host's zone (Railway runs in `iad`) and could
// shift the date by one. The date is the only part wanted, and it's already
// the first ten characters in every shape either provider sends —
// "2026-09-04", "2026-09-07 15:33:26", "2026-09-04T13:30:00Z".
export function quoteSessionDate(raw) {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return match ? match[1] : null;
}

// Splits quotes into those belonging to `sessionDate` and those that don't.
//
// Fails OPEN, twice over, and for the same reason isWithinPollWindow does:
// losing a day of prices because a provider renamed a field is worse than
// storing a stale one. A quote with no readable source date is kept, and if
// the session date itself is unknown nothing is filtered at all. Both cases
// are reported to the caller so they can be logged rather than passing in
// silence.
export function partitionBySession(quotes, sessionDate) {
  if (!sessionDate) return { fresh: quotes, stale: [], undated: [] };

  const fresh = [];
  const stale = [];
  const undated = [];

  for (const quote of quotes) {
    if (quote.sourceDate == null) {
      undated.push(quote);
      fresh.push(quote);
    } else if (quote.sourceDate === sessionDate) {
      fresh.push(quote);
    } else {
      stale.push(quote);
    }
  }

  return { fresh, stale, undated };
}

// One log line for a whole poll rather than one per ticker: on a holiday every
// ticker is stale on every poll, and five tickers at a five-minute cadence
// would be ~400 identical lines a day.
export function staleQuotesMessage(stale, sessionDate) {
  if (stale.length === 0) return null;

  const dates = [...new Set(stale.map((q) => q.sourceDate))].sort();
  const closed = stale.filter((q) => q.sourceMarketOpen === false).length;
  const provider =
    closed === stale.length ? ' (provider reports the market closed)' :
    closed > 0 ? ` (${closed} of them reported closed by the provider)` : '';

  return (
    `skipped ${stale.length} quote(s) dated ${dates.join(', ')} — not this session (${sessionDate})` +
    `${provider}. Market holiday, or the feed has not opened yet; nothing recorded.`
  );
}
