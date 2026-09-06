import { isWithinPollWindow, sessionCloseLabel } from './marketHours.js';

// "as of" treatment so a price never silently reads as fresher than it is:
// timeAgo() says when the number was actually fetched, isStale() says when
// that's old enough to warn about rather than just label.
export function timeAgo(isoString, at = new Date()) {
  if (!isoString) return null;
  const seconds = Math.max(0, Math.floor((at.getTime() - new Date(isoString).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Ten minutes is several missed polls *while the worker is actually polling* —
// India every 60s, the US every 5 min (worker/index.js).
//
// That threshold used to be the whole rule, back when the worker ran around
// the clock. It doesn't poll a closed market any more, so age alone stopped
// meaning anything: over a weekend the newest reading is legitimately ~65
// hours old, and warning on that reports the design working as a fault. It
// also contradicted the "Last session" label on the same row, which explains
// the very same data as expected.
//
// So the threshold now only applies inside the poll window. Outside it, old
// data is the correct state and gets no warning.
export const STALE_AFTER_MS = 10 * 60 * 1000;

// `marketIsPolling` defaults to true so a caller with no market context keeps
// the old time-only behaviour rather than silently suppressing every warning.
export function isStale(isoString, marketIsPolling = true) {
  if (!isoString) return false;
  // A closed market isn't writing, so nothing is overdue. The reading is
  // labelled by age or session elsewhere; it just isn't a fault.
  if (!marketIsPolling) return false;
  // NaN for an unparseable date compares false, i.e. not stale — the label
  // itself already degrades to null in that case.
  return Date.now() - new Date(isoString).getTime() >= STALE_AFTER_MS;
}

// Past this, a weekday name stops identifying a specific day — "Friday's
// close" would be ambiguous about which Friday — so the label falls back to a
// plain age.
const SESSION_LABEL_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000;

// What the "Last updated" line should say.
//
// While the market is being polled, an age is what a reader wants: "4m ago"
// answers "is this current?". Once it's closed, an age answers a question
// nobody asked — "16 hours ago" is accurate but leaves the reader working out
// that Friday's session is why. Naming the session says it directly, and
// matches the "Last session" label on the watchlist rows.
export function lastUpdatedLabel(isoString, market, at = new Date()) {
  if (!isoString) return null;

  if (!isWithinPollWindow(market, at)) {
    const age = at.getTime() - new Date(isoString).getTime();
    if (age >= 0 && age < SESSION_LABEL_MAX_AGE_MS) {
      // null when the reading wasn't actually taken at a close — see
      // sessionCloseLabel. Then an age is the honest answer.
      const session = sessionCloseLabel(new Date(isoString), market);
      if (session) return session;
    }
  }

  return timeAgo(isoString, at);
}
