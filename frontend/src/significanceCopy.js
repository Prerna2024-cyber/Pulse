// The significance thresholds, as the UI states them.
//
// Duplicated from lib/significance.js rather than imported, for the same
// reason marketHours.js is: frontend/ is its own package and Vite's root stops
// at it, so lib/ is unreachable from here. The copy is held in step by a test
// in lib/significance.test.js — if a threshold changes on the server and not
// here, the walkthrough would teach a rule the product no longer follows.
//
// These are the DEFAULTS. detectSignificantChange accepts overrides, but the
// diff endpoint passes none, so what a user actually sees is these two.
export const PRICE_THRESHOLD_PERCENT = 2;
export const VOLUME_MULTIPLIER = 2;

// Both comparisons are >=, so "2% or more" rather than "past 2%" — a move of
// exactly 2.0% is flagged.
export const SIGNIFICANCE_SENTENCE = `Pulse only flags a move of ${PRICE_THRESHOLD_PERCENT}% or more, or ${VOLUME_MULTIPLIER}× the usual volume`;
