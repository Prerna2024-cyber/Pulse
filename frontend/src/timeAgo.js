// "as of" treatment so a price never silently reads as fresher than it is:
// timeAgo() says when the number was actually fetched, isStale() says when
// that's old enough to warn about rather than just label.
export function timeAgo(isoString) {
  if (!isoString) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// The worker polls India every 60s and the US every 5 min (worker/index.js),
// so a price older than 10 minutes means several polls in a row failed —
// past the point where showing it in plain gray would be honest.
export const STALE_AFTER_MS = 10 * 60 * 1000;

export function isStale(isoString) {
  if (!isoString) return false;
  // NaN for an unparseable date compares false, i.e. not stale — the label
  // itself already degrades to null in that case.
  return Date.now() - new Date(isoString).getTime() >= STALE_AFTER_MS;
}
