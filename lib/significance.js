// Pure "meaningful change" detection — no DB/network calls, so it's
// unit-testable with fake data (PROJECT_CONTEXT.md build order step 3).
// The diff endpoint (step 5) will call this per ticker: current market_data
// vs. the user's snapshot, before overwriting that snapshot.

export const DEFAULT_PRICE_THRESHOLD_PERCENT = 2;
export const DEFAULT_VOLUME_MULTIPLIER = 2;

// current:  { price, volume }        — latest market_data row for the ticker
// previous: { price, volume } | null — the user's snapshot row, or null if
//                                       they've never seen this ticker before
export function detectSignificantChange({
  ticker,
  companyName,
  current,
  previous,
  priceThresholdPercent = DEFAULT_PRICE_THRESHOLD_PERCENT,
  volumeMultiplier = DEFAULT_VOLUME_MULTIPLIER,
}) {
  const name = companyName || ticker;

  // Nothing to diff against yet — not a "change", just a first view.
  if (!previous) {
    return { ticker, isMeaningful: false, priceChangePercent: null, volumeRatio: null, reasons: [], summary: null };
  }

  const priceChangePercent =
    previous.price > 0 ? ((current.price - previous.price) / previous.price) * 100 : null;

  const volumeRatio =
    previous.volume > 0 ? current.volume / previous.volume : current.volume > 0 ? Infinity : null;

  const priceIsSignificant = priceChangePercent !== null && Math.abs(priceChangePercent) >= priceThresholdPercent;
  const volumeIsSignificant = volumeRatio !== null && volumeRatio >= volumeMultiplier;

  const reasons = [];

  if (priceIsSignificant) {
    const direction = priceChangePercent > 0 ? 'jumped' : 'dropped';
    reasons.push({ type: 'price', fragment: `${direction} ${Math.abs(priceChangePercent).toFixed(1)}%` });
  }

  if (volumeIsSignificant) {
    const fragment =
      volumeRatio === Infinity
        ? 'saw a surge in trading volume'
        : `traded at ${volumeRatio.toFixed(1)}x its usual volume`;
    reasons.push({ type: 'volume', fragment });
  }

  const isMeaningful = reasons.length > 0;
  const summary = isMeaningful
    ? `${name} ${reasons.map((r) => r.fragment).join(' and ')} since you last checked`
    : null;

  return { ticker, isMeaningful, priceChangePercent, volumeRatio, reasons, summary };
}

// items: [{ ticker, companyName, current, previous }] — batch form for the
// diff endpoint, which will map a user's whole watchlist through this at once.
export function detectSignificantChanges(items, options = {}) {
  return items.map((item) => detectSignificantChange({ ...item, ...options }));
}
