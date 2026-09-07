// What counts as a valid "significance" setting.
//
// The thresholds themselves live on the users row and are applied by
// detectSignificantChange (lib/significance.js), which happily accepts any
// number it's handed — it's a pure comparison and has no opinion about what a
// sensible threshold is. That opinion lives here, so the settings endpoint can
// reject a hand-rolled request instead of trusting whatever the client sends.
//
// The bounds are about the setting staying meaningful, not about taste:
//   * Below 0.5% every ordinary tick would be flagged, and "what changed"
//     would become the wall of numbers the product exists to avoid.
//   * Above 10% a normal user would go weeks seeing nothing and reasonably
//     conclude Pulse is broken.
//   * A volume multiplier at or below 1× flags every ticker whose volume
//     didn't fall, which is most of them; 5× is already rare enough to be a
//     once-in-a-while event.

import { DEFAULT_PRICE_THRESHOLD_PERCENT, DEFAULT_VOLUME_MULTIPLIER } from './significance.js';

export const PRICE_THRESHOLD_MIN = 0.5;
export const PRICE_THRESHOLD_MAX = 10;
export const VOLUME_MULTIPLIER_MIN = 1.2;
export const VOLUME_MULTIPLIER_MAX = 5;

// price_threshold_percent / volume_multiplier are NUMERIC(5, 2), so anything
// finer than two decimals wouldn't survive the round trip. Rounding here
// rather than letting Postgres do it means the value returned to the client is
// the value that was stored.
const DECIMALS = 2;

function round(value) {
  return Math.round(value * 10 ** DECIMALS) / 10 ** DECIMALS;
}

// Returns { value } or { error }. Never throws, never coerces out-of-range
// input into range: a request asking for 50% is a mistake worth reporting, not
// a request for 10%.
function validateNumber(raw, { label, min, max }) {
  // Deliberately strict about the type. JSON gives us a real number when the
  // client sends one, and accepting "2" here would also accept "" (Number('')
  // is 0) and true (Number(true) is 1).
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { error: `${label} must be a number` };
  }
  const value = round(raw);
  if (value < min || value > max) {
    return { error: `${label} must be between ${min} and ${max}` };
  }
  return { value };
}

export function validatePriceThresholdPercent(raw) {
  return validateNumber(raw, {
    label: 'priceThresholdPercent',
    min: PRICE_THRESHOLD_MIN,
    max: PRICE_THRESHOLD_MAX,
  });
}

export function validateVolumeMultiplier(raw) {
  return validateNumber(raw, {
    label: 'volumeMultiplier',
    min: VOLUME_MULTIPLIER_MIN,
    max: VOLUME_MULTIPLIER_MAX,
  });
}

// Both are validated together so a request carrying one bad value changes
// neither — a half-applied settings save is worse than a rejected one.
// Returns { thresholds } or { error }.
export function validateThresholds(body) {
  const price = validatePriceThresholdPercent(body?.priceThresholdPercent);
  if (price.error) return { error: price.error };

  const volume = validateVolumeMultiplier(body?.volumeMultiplier);
  if (volume.error) return { error: volume.error };

  return { thresholds: { priceThresholdPercent: price.value, volumeMultiplier: volume.value } };
}

// The defaults must themselves be valid, or a fresh user would be sitting on a
// setting the API would refuse to accept back. Asserted by a test rather than
// left as a comment.
export const DEFAULT_THRESHOLDS = {
  priceThresholdPercent: DEFAULT_PRICE_THRESHOLD_PERCENT,
  volumeMultiplier: DEFAULT_VOLUME_MULTIPLIER,
};
