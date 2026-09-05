// Upstream quote fields arrive in different shapes: Twelve Data sends numbers
// as strings ("-8.23999"), the Indian Stock Market API with res=num sends real
// numbers, and either can omit a field when the market hasn't printed yet.
// Normalize to "a finite number, or null" so a missing day change stays absent
// all the way to the UI instead of collapsing into a misleading 0.
export function toFiniteOrNull(value) {
  // Number('') is 0 and Number(null) is 0, so both need catching before the
  // isFinite check would happily wave them through as a real zero.
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
