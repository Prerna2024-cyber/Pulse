// The significance thresholds, as the UI states them.
//
// These used to be two constants matching lib/significance.js, because a
// threshold was the same for everybody. They're a per-user setting now, so
// what's here is the *vocabulary*: the presets the control offers, and the
// sentences that say what a given pair of numbers means in plain language.
//
// The defaults are still duplicated from lib/significance.js rather than
// imported, for the same reason marketHours.js is: frontend/ is its own
// package and Vite's root stops at it, so lib/ is unreachable from here. The
// copy is held in step by a test in lib/significance.test.js — if the default
// changes on the server and not here, a new user would be shown a rule that
// isn't the one they're on.
export const DEFAULT_PRICE_THRESHOLD_PERCENT = 2;
export const DEFAULT_VOLUME_MULTIPLIER = 2;

export const DEFAULT_THRESHOLDS = {
  priceThresholdPercent: DEFAULT_PRICE_THRESHOLD_PERCENT,
  volumeMultiplier: DEFAULT_VOLUME_MULTIPLIER,
};

// Three presets rather than two number fields. The setting is "how much do you
// want to hear from Pulse", and a person knows the answer to that long before
// they know whether they want 2% or 3.5% — a free-form box would ask them to
// invent a number and then live with it.
//
// Ordered least talkative first, so the row reads as one rising scale.
export const SENSITIVITY_PRESETS = [
  {
    id: 'big',
    label: 'Big moves only',
    priceThresholdPercent: 5,
    volumeMultiplier: 3,
    meaning: "You'll hear from Pulse rarely — only when something unusual has happened.",
  },
  {
    id: 'balanced',
    label: 'Balanced',
    ...DEFAULT_THRESHOLDS,
    meaning: 'A real move without the noise. This is where Pulse starts everyone.',
  },
  {
    id: 'everything',
    label: 'Tell me more',
    priceThresholdPercent: 1,
    volumeMultiplier: 1.5,
    meaning: 'Smaller moves count too, so expect more to show up on a normal day.',
  },
];

// 2 -> "2", 1.5 -> "1.5". Trailing zeros come from the server, which stores
// these as NUMERIC(5, 2): "2.00× the usual volume" reads like a spreadsheet.
function fmt(value) {
  return String(Number(value));
}

// Which preset a pair of thresholds corresponds to, or null if it matches none
// — the API accepts anything in range, so a value set by another means (or by
// a preset we later retune) has to render as something rather than silently
// highlight the wrong button.
export function matchPreset({ priceThresholdPercent, volumeMultiplier } = {}) {
  return (
    SENSITIVITY_PRESETS.find(
      (p) => p.priceThresholdPercent === priceThresholdPercent && p.volumeMultiplier === volumeMultiplier
    ) || null
  );
}

// The one-liner under "What changed since you last checked". Same shape as the
// copy it replaces — this is still "only moves worth your attention", it just
// no longer claims a number the user may have changed.
export function significanceSentence(thresholds = DEFAULT_THRESHOLDS) {
  const { priceThresholdPercent, volumeMultiplier } = thresholds;
  return `Only moves worth your attention — past ±${fmt(priceThresholdPercent)}% on price, or ${fmt(
    volumeMultiplier
  )}× the usual volume.`;
}

// The longer form, used where the rule is being taught rather than restated.
// Both comparisons are >=, so "or more" rather than "past" — a move of exactly
// the threshold is flagged.
export function significanceRule(thresholds = DEFAULT_THRESHOLDS) {
  const { priceThresholdPercent, volumeMultiplier } = thresholds;
  return `Pulse only flags a move of ${fmt(priceThresholdPercent)}% or more, or ${fmt(
    volumeMultiplier
  )}× the usual volume`;
}

// What the current setting means, in a sentence that doesn't mention a number:
// the presets carry their own, and a custom pair still deserves an answer.
export function sensitivityMeaning(thresholds) {
  return matchPreset(thresholds)?.meaning || significanceSentence(thresholds);
}
