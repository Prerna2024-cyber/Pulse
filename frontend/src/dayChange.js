// The day's move, shaped for display. Same rule as changeSignal.js: icon +
// colour together, never colour alone — the ▲/▼ and the signed number both
// carry the direction, so the green/red is reinforcement rather than the only
// cue. Returns null when there's no usable figure, which the row renders as
// no colour at all rather than a misleading flat 0.00%.
// Same normalization rule as lib/quote.js toFiniteOrNull, duplicated rather
// than imported because frontend/ is its own package and Vite's root stops at
// it. Number(null) and Number('') are both 0, so a missing figure has to be
// caught before the isFinite check waves it through as a genuine flat day.
function toFiniteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Postgres NUMERIC arrives over the API as a string ("19.5000"), so these are
// parsed rather than assumed numeric.
export function dayChangeSignal(dayChange, dayChangePercent) {
  const change = toFiniteOrNull(dayChange);
  const percent = toFiniteOrNull(dayChangePercent);
  if (change === null || percent === null) return null;

  // An exactly-flat day is real information, but it isn't up or down — give it
  // the neutral treatment instead of an arbitrary green.
  if (percent === 0) {
    return { icon: '•', tone: 'neutral', label: `flat today`, percentText: '0.00%' };
  }

  const up = percent > 0;
  return {
    icon: up ? '▲' : '▼',
    tone: up ? 'positive' : 'negative',
    label: up ? 'up today' : 'down today',
    // toFixed already carries the minus sign for negatives; add the plus so an
    // up day is unambiguous without relying on the colour.
    percentText: `${up ? '+' : ''}${percent.toFixed(2)}%`,
  };
}
