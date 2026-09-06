// The day's opening reference and its high/low, shaped for display.
//
// Same rule as dayChange.js: a missing figure is null, never 0. A stock with
// no day_high isn't trading at zero, it's unknown — so an absent value is
// dropped from the list entirely rather than rendered as a number that would
// read as real. When nothing is known, the caller gets an empty array and
// shows a dash.
//
// Same normalization as lib/quote.js toFiniteOrNull, duplicated rather than
// imported because frontend/ is its own package and Vite's root stops at it
// (see the identical note in dayChange.js). Number(null) and Number('') are
// both 0, so a missing figure has to be caught before the isFinite check
// waves it through as a genuine zero.
function toFiniteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// The first slot is whichever opening reference the row actually has. Both
// fetchers supply `open` and `previous_close`, but a session that hasn't
// opened yet has no open price — and the previous close is the honest stand-in
// for it, so long as it's labelled as one. Silently printing yesterday's close
// under an "Open" heading would be the quiet kind of wrong.
function openingReference(item) {
  const open = toFiniteOrNull(item.dayOpen);
  if (open !== null) return { key: 'O', label: 'Open', value: open };

  const previous = toFiniteOrNull(item.previousClose);
  if (previous !== null) return { key: 'PC', label: 'Previous close', value: previous };

  return null;
}

// Returns [{ key, label, value }] for whichever figures are known, in
// open/high/low order. `key` is the compact visible marker, `label` the full
// wording for screen readers.
export function dayRangeItems(item) {
  const high = toFiniteOrNull(item.dayHigh);
  const low = toFiniteOrNull(item.dayLow);

  return [
    openingReference(item),
    high === null ? null : { key: 'H', label: 'Day high', value: high },
    low === null ? null : { key: 'L', label: 'Day low', value: low },
  ].filter(Boolean);
}
