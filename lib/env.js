// Numeric environment variables, read safely.
//
// The pattern this replaces was `Number(process.env.X || default)`, which
// looks like it has a fallback but doesn't: the `||` only catches an unset or
// empty variable. A variable that is *set to something unparseable* sails past
// it and becomes NaN, and NaN then fails silently and differently everywhere
// it lands:
//
//   setInterval(fn, NaN)              -> coerced to ~1ms, a hot loop that
//                                        hammers upstream and the database
//   Math.min(NaN, n) -> Array.from    -> zero workers, so a fetch loop makes
//                                        no requests and reports no error
//   AbortSignal.timeout(NaN)          -> throws at call time
//
// None of those announce themselves as a config problem. A typo in a Railway
// variable would look like an outage, or worse, like nothing at all.
//
// So: parse, validate, log loudly, and fall back to the default rather than
// carrying NaN forward.

// Reads a positive integer (>= 1). Anything unset or empty takes the default
// quietly; anything set-but-invalid takes the default *and* says so, because
// that's a mistake someone needs to see.
export function positiveIntFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || String(raw).trim() === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    console.error(
      `[env] ${name}="${raw}" is not a positive number — falling back to ${fallback}`
    );
    return fallback;
  }
  return Math.floor(parsed);
}
