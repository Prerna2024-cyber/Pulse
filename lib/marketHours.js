// Trading hours per market, and the window the worker is allowed to poll in.
//
// This is the backend's copy, shared by the worker (and available to the
// server). frontend/src/marketHours.js holds the same schedule for the UI,
// duplicated rather than imported for the same reason currency.js duplicates
// lib/market.js: frontend/ is its own package, and Vite's dev server only
// serves files under frontend/ (server.fs.allow), so an import reaching up to
// lib/ builds but 404s under `npm run dev`.
//
// The duplication is load-bearing enough to be worth a guard: lib/marketHours.test.js
// sweeps both copies across a year of timestamps and fails if they ever
// disagree. If the two drift, the UI would say "Live" while the worker sits
// idle — exactly the kind of silent contradiction that's hard to spot.
//
// NOT HANDLED: market holidays. There is no holiday calendar here, so on a
// trading holiday — Diwali, Republic Day, Thanksgiving, Good Friday — this
// reports the market as open when it is in fact shut, and the worker will
// poll a market that isn't trading. That is a deliberate scope decision, not
// an oversight: a correct calendar is a per-exchange, per-year list that goes
// stale silently and is wrong in exactly the years nobody remembered to update
// it. Weekends are handled, and they are the large majority of closed time.
// The cost of the gap is a few wasted polls a year, not wrong data.
//
// Timezone comes from the market, never the host clock — this process runs in
// Railway's `iad` region, so anything derived from the server's local time
// would be wrong for both markets.
const SCHEDULES = {
  // 9:15am–3:30pm IST
  India: {
    exchange: 'NSE/BSE',
    timeZone: 'Asia/Kolkata',
    zoneLabel: 'IST',
    opensAt: 9 * 60 + 15,
    closesAt: 15 * 60 + 30,
  },
  // 9:30am–4:00pm ET. "ET" rather than EST/EDT on purpose: it's correct in
  // both halves of the year, so nothing here has to track US DST changeovers.
  US: {
    exchange: 'NASDAQ',
    timeZone: 'America/New_York',
    zoneLabel: 'ET',
    opensAt: 9 * 60 + 30,
    closesAt: 16 * 60,
  },
};

// Keep polling for a few minutes past the closing bell. The last intraday tick
// is not the closing price — upstream settles it shortly after the bell — so
// stopping exactly at close would leave the day's final stored price slightly
// wrong, and it would stay wrong until the next session opened.
export const POST_CLOSE_GRACE_MINUTES = 5;

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isTradingDay = (weekday) => weekday >= 1 && weekday <= 5;

// Constructing an Intl.DateTimeFormat is the expensive part and there are only
// two, so they're built once and reused.
const formatters = new Map();

function formatterFor(timeZone) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      // The calendar date is here so the session-bounds helpers below can name
      // a specific day in the market's own timezone. Reading it from the same
      // formatter keeps date and clock from ever disagreeing across midnight.
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      // h23 rather than hour12:false: the latter renders midnight as "24" on
      // some engines, which would put the small hours a day out.
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

// The wall clock in the market's own timezone. Intl does the whole job —
// including whichever DST offset applies on this date — so no offset is ever
// hardcoded here. Returns null if the parts don't come back as expected,
// rather than producing a NaN weekday that would poison every comparison
// downstream.
function wallClockIn(timeZone, at) {
  // An invalid Date makes formatToParts throw, which would escape past every
  // "returns null" guard below and, in isWithinPollWindow, past its fail-open
  // contract too. Caught here so the contract holds for any input.
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) return null;

  const parts = formatterFor(timeZone).formatToParts(at);
  const value = (type) => parts.find((p) => p.type === type)?.value;

  const weekday = WEEKDAY_INDEX[value('weekday')];
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  const year = Number(value('year'));
  const month = Number(value('month'));
  const day = Number(value('day'));
  if (weekday === undefined || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  return { weekday, minutes: hour * 60 + minute, year, month, day };
}

function formatClock(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

// How many days until the next trading day, counting today as 0. Bounded by a
// week: a `while` here would spin forever on a weekday that never satisfies
// the predicate, and an unbounded loop in a scheduler is not worth the two
// characters it saves.
function daysUntilNextTradingDay(weekday, startOffset) {
  for (let ahead = startOffset; ahead <= startOffset + 7; ahead += 1) {
    if (isTradingDay((weekday + ahead) % 7)) return ahead;
  }
  return null;
}

function dayWord(weekday, daysAhead) {
  if (daysAhead === 0) return 'today';
  if (daysAhead === 1) return 'tomorrow';
  return WEEKDAY_NAMES[(weekday + daysAhead) % 7];
}

// Returns null for a market with no schedule, so callers say nothing rather
// than assert a session they can't know about.
export function marketStatus(market, at = new Date()) {
  const schedule = SCHEDULES[market];
  if (!schedule) return null;

  const clock = wallClockIn(schedule.timeZone, at);
  if (clock === null) return null;
  const { weekday, minutes } = clock;

  const isOpen =
    isTradingDay(weekday) && minutes >= schedule.opensAt && minutes < schedule.closesAt;

  if (isOpen) {
    return {
      isOpen: true,
      exchange: schedule.exchange,
      icon: '●',
      tone: 'positive',
      label: 'Live',
      detail: `closes ${formatClock(schedule.closesAt)} ${schedule.zoneLabel}`,
    };
  }

  // Before the bell on a trading day the next session is still today.
  const startOffset = isTradingDay(weekday) && minutes < schedule.opensAt ? 0 : 1;
  const daysAhead = daysUntilNextTradingDay(weekday, startOffset);
  if (daysAhead === null) return null;

  return {
    isOpen: false,
    exchange: schedule.exchange,
    icon: '○',
    tone: 'neutral',
    label: 'Closed',
    detail: `Opens ${dayWord(weekday, daysAhead)} ${formatClock(schedule.opensAt)} ${schedule.zoneLabel}`,
  };
}

const MARKET_BY_EXCHANGE = { NSE: 'India', BSE: 'India', NASDAQ: 'US' };

export function marketStatusForExchange(exchange, at = new Date()) {
  return marketStatus(MARKET_BY_EXCHANGE[exchange], at);
}

// Whether the worker should poll this market right now.
//
// Wider than marketStatus().isOpen by POST_CLOSE_GRACE_MINUTES, so the last
// poll of the session lands after the closing bell and stores the settled
// close. Deliberately NOT the same predicate as the UI's "Live" pill: the pill
// should go grey at the bell even while the worker takes its final readings.
//
// Fails OPEN. An unrecognised market, or a clock we couldn't read, keeps
// polling rather than silently stopping — losing quota is recoverable, losing
// a day of prices with no error in the log is not.
export function isWithinPollWindow(market, at = new Date()) {
  const schedule = SCHEDULES[market];
  if (!schedule) return true;

  const clock = wallClockIn(schedule.timeZone, at);
  if (clock === null) return true;
  const { weekday, minutes } = clock;

  if (!isTradingDay(weekday)) return false;
  // Both closes are well before midnight, so this never wraps past 1440.
  return minutes >= schedule.opensAt && minutes < schedule.closesAt + POST_CLOSE_GRACE_MINUTES;
}

// ---------------------------------------------------------------------------
// Session bounds — the window a price chart covers.
//
// Mirrored in the other copy of this file like everything above it, and held
// there by the drift sweep in lib/marketHours.test.js. The server uses these
// to decide which price_history rows belong to the session; the chart uses
// them to lay out its axis. A disagreement would draw a line against the
// wrong window, so the sweep compares them directly.
// ---------------------------------------------------------------------------

// The market's UTC offset at a given instant, in milliseconds. Derived from
// Intl rather than hardcoded, so India's fixed +05:30 and New York's twice-a-
// year shift are both handled by the same three lines.
function offsetMsAt(timeZone, at) {
  const clock = wallClockIn(timeZone, at);
  if (clock === null) return null;
  const asIfUtc = Date.UTC(clock.year, clock.month - 1, clock.day) + clock.minutes * 60_000;
  return asIfUtc - at.getTime();
}

// The inverse of wallClockIn: a wall-clock reading in the market's timezone
// back to the UTC instant it names.
//
// Two passes, not one. The offset has to be sampled at some instant, and the
// only instant available to sample first is the guess itself — which is wrong
// by exactly the offset. The second pass samples at the corrected instant, so
// it lands on the right side of any DST boundary. Neither session here opens
// near a 2am changeover, so a third pass could never change the answer.
function zonedTimeToUtc(timeZone, year, month, day, minutes) {
  const target = Date.UTC(year, month - 1, day) + minutes * 60_000;
  let guess = target;
  for (let pass = 0; pass < 2; pass += 1) {
    const offset = offsetMsAt(timeZone, new Date(guess));
    if (offset === null) return null;
    const next = target - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

// How many days back the most recent trading day is, counting today as 0.
// Bounded like daysUntilNextTradingDay, and for the same reason: an
// unsatisfiable predicate would otherwise spin during render.
function daysSinceTradingDay(weekday, startOffset) {
  for (let back = startOffset; back <= startOffset + 7; back += 1) {
    if (isTradingDay((((weekday - back) % 7) + 7) % 7)) return back;
  }
  return null;
}

// The session a price chart should cover: the current one while the market is
// trading, otherwise the last one that completed.
//
// `end` is capped at `at` during a live session, so the chart never draws out
// to a close that hasn't happened yet. Once the bell has gone it is the close
// itself — which is why a chart drawn at 4pm and one drawn at midnight cover
// exactly the same window, and why a closed market's chart stops moving.
//
// Returns null for an unknown market or an unreadable clock, so a caller
// renders nothing rather than a confidently wrong window.
export function sessionBounds(market, at = new Date()) {
  const schedule = SCHEDULES[market];
  if (!schedule) return null;

  const clock = wallClockIn(schedule.timeZone, at);
  if (clock === null) return null;
  const { weekday, minutes } = clock;

  // Before the opening bell today's session hasn't started, so the one worth
  // showing is the previous trading day's — the same rule as a weekend.
  const started = isTradingDay(weekday) && minutes >= schedule.opensAt;
  const daysBack = started ? 0 : daysSinceTradingDay(weekday, 1);
  if (daysBack === null) return null;

  // Calendar arithmetic on a UTC-midnight anchor, which has no offset of its
  // own to go wrong; the timezone is reapplied by zonedTimeToUtc below.
  const anchor = new Date(Date.UTC(clock.year, clock.month - 1, clock.day) - daysBack * 86_400_000);
  const start = zonedTimeToUtc(
    schedule.timeZone, anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), schedule.opensAt
  );
  const close = zonedTimeToUtc(
    schedule.timeZone, anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), schedule.closesAt
  );
  if (start === null || close === null) return null;

  const isCurrent = daysBack === 0 && minutes < schedule.closesAt;

  return {
    start,
    close,
    end: isCurrent ? at : close,
    isCurrent,
    zoneLabel: schedule.zoneLabel,
    openLabel: formatClock(schedule.opensAt),
    closeLabel: formatClock(schedule.closesAt),
    dayName: WEEKDAY_NAMES[(((weekday - daysBack) % 7) + 7) % 7],
  };
}

export function sessionBoundsForExchange(exchange, at = new Date()) {
  return sessionBounds(MARKET_BY_EXCHANGE[exchange], at);
}
