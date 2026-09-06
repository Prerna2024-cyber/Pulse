// Whether the user's market is trading right now, and when it next opens.
//
// Same rule as changeSignal.js and dayChange.js: icon + colour together, never
// colour alone. Open and closed are two different shapes on screen — a compact
// pill against a full-width banner — and each says its state in words, so the
// green/grey is the third cue rather than the only one.
//
// NOT HANDLED: market holidays. There is no holiday calendar here, so on a
// trading holiday — Diwali, Republic Day, Thanksgiving, Good Friday — this
// will incorrectly show the market as open when it is in fact shut. That is a
// deliberate scope decision, not an oversight: a correct calendar is a
// per-exchange, per-year list that goes stale silently and is wrong in exactly
// the years nobody remembered to update it. Weekends are handled, and they are
// the large majority of closed time. The cost of the gap is a cosmetic label:
// prices come from the worker either way, and the "last updated" stamp on the
// stat cards still tells the truth about how fresh they are.
//
// Timezone comes from the market, not the viewer — someone watching NASDAQ
// from Bangalore should see the New York session, not their own clock.
// Exchanges mirror EXCHANGES_BY_MARKET in lib/market.js, duplicated rather
// than imported because frontend/ is its own package (same reason as
// currency.js). India is labelled NSE/BSE rather than just NSE because a
// watchlist there really can hold both, and they keep identical hours.
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

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isTradingDay = (weekday) => weekday >= 1 && weekday <= 5;

// Constructing an Intl.DateTimeFormat is the expensive part, and there are
// only two of them, so they're built once and reused. This is called per
// watchlist row now, not just once for the dashboard.
const formatters = new Map();

function formatterFor(timeZone) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
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
// hardcoded here.
function wallClockIn(timeZone, at) {
  // An invalid Date makes formatToParts throw, which during render would take
  // the dashboard down rather than degrade.
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) return null;

  const parts = formatterFor(timeZone).formatToParts(at);
  const value = (type) => parts.find((p) => p.type === type)?.value;

  // An unrecognised weekday used to become `undefined`, and every comparison
  // downstream then silently evaluated false — including the loop condition in
  // the next-open search, which spun forever. Caught here instead.
  const weekday = WEEKDAY_INDEX[value('weekday')];
  const hour = Number(value('hour'));
  const minute = Number(value('minute'));
  if (weekday === undefined || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  return { weekday, minutes: hour * 60 + minute };
}

function formatClock(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

// How many days until the next trading day, counting today as 0. Bounded by a
// week: the `while` this replaces spun forever if the predicate was never
// satisfiable, which hangs the tab because this runs during render.
function daysUntilNextTradingDay(weekday, startOffset) {
  for (let ahead = startOffset; ahead <= startOffset + 7; ahead += 1) {
    if (isTradingDay((weekday + ahead) % 7)) return ahead;
  }
  return null;
}

// How the next session is referred to relative to today, in market-local days.
function dayWord(weekday, daysAhead) {
  if (daysAhead === 0) return 'today';
  if (daysAhead === 1) return 'tomorrow';
  return WEEKDAY_NAMES[(weekday + daysAhead) % 7];
}

// Returns null for a market with no schedule, so an unrecognised
// preferred_market renders nothing rather than a confidently wrong "Closed".
//
// `detail` is a fragment rather than a whole sentence: the two states are
// worded differently around it (a banner sentence vs. a compact pill suffix)
// and that phrasing belongs with the markup, not here.
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
      // Deliberately no countdown. A duration would have to be computed across
      // the DST changeover to be right, and the clock time is what someone
      // actually plans around anyway.
      detail: `closes ${formatClock(schedule.closesAt)} ${schedule.zoneLabel}`,
    };
  }

  // Before the bell on a trading day the next session is still today;
  // otherwise walk forward to the next weekday. From Friday evening the
  // furthest this ever runs is three days.
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

// Which market an exchange trades in, so a row can be labelled against its own
// ticker's hours rather than whichever market the viewer happens to have
// selected. In practice a watchlist is already scoped to one market and the
// two always agree — this is here so the row stays right if that ever stops
// being true, rather than silently labelling a NASDAQ row with NSE's clock.
//
// Mirrors MARKET_BY_EXCHANGE in currency.js and EXCHANGES_BY_MARKET in
// lib/market.js, duplicated for the same reason they are.
const MARKET_BY_EXCHANGE = { NSE: 'India', BSE: 'India', NASDAQ: 'US' };

// null for an exchange with no known schedule — the caller then says nothing
// rather than guessing at a session.
export function marketStatusForExchange(exchange, at = new Date()) {
  return marketStatus(MARKET_BY_EXCHANGE[exchange], at);
}
