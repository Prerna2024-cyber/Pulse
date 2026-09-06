// Whether the user's market is trading right now, and when it next flips.
//
// Same rule as changeSignal.js and dayChange.js: icon + colour together, never
// colour alone. The filled/hollow dot is a shape difference rather than a
// red/green pair, and the word ("Open"/"Closed") says it outright, so the
// badge still reads correctly in monochrome or to a screen reader.
//
// NOT HANDLED: market holidays. There is no holiday calendar here, so on a
// trading holiday — Diwali, Republic Day, Thanksgiving, Good Friday — this
// will report the market as "Open" when it is in fact shut. That is a
// deliberate scope decision, not an oversight: a correct calendar is a
// per-exchange, per-year list that goes stale silently and is wrong in exactly
// the years nobody remembered to update it. Weekends are handled, and they are
// the large majority of closed time. The cost of the gap is a cosmetic label:
// prices come from the worker either way, and the "last updated" stamp on the
// stat cards still tells the truth about how fresh they are.
//
// Timezone comes from the market, not the viewer — someone watching NASDAQ
// from Bangalore should see the New York session, not their own clock.
// Exchange hours mirror the markets in lib/market.js (India = NSE/BSE, which
// keep identical hours; US = NASDAQ).
const SCHEDULES = {
  // 9:15am–3:30pm IST
  India: { timeZone: 'Asia/Kolkata', zoneLabel: 'IST', opensAt: 9 * 60 + 15, closesAt: 15 * 60 + 30 },
  // 9:30am–4:00pm ET. "ET" rather than EST/EDT on purpose: it's correct in
  // both halves of the year, so nothing here has to track US DST changeovers.
  US: { timeZone: 'America/New_York', zoneLabel: 'ET', opensAt: 9 * 60 + 30, closesAt: 16 * 60 },
};

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const isTradingDay = (weekday) => weekday >= 1 && weekday <= 5;

// The wall clock in the market's own timezone. Intl does the whole job —
// including whichever DST offset applies on this date — so no offset is ever
// hardcoded here.
function wallClockIn(timeZone, at) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    // h23 rather than hour12:false: the latter renders midnight as "24" on
    // some engines, which would put the small hours a day out.
    hourCycle: 'h23',
  }).formatToParts(at);
  const value = (type) => parts.find((p) => p.type === type).value;
  return {
    weekday: WEEKDAY_INDEX[value('weekday')],
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

function formatClock(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

// How the next session is referred to relative to today, in market-local days.
function dayWord(weekday, daysAhead) {
  if (daysAhead === 0) return 'today';
  if (daysAhead === 1) return 'tomorrow';
  return WEEKDAY_NAMES[(weekday + daysAhead) % 7];
}

// Returns null for a market with no schedule, so an unrecognised
// preferred_market renders nothing rather than a confidently wrong "Closed".
export function marketStatus(market, at = new Date()) {
  const schedule = SCHEDULES[market];
  if (!schedule) return null;

  const { weekday, minutes } = wallClockIn(schedule.timeZone, at);
  const isOpen =
    isTradingDay(weekday) && minutes >= schedule.opensAt && minutes < schedule.closesAt;

  if (isOpen) {
    return {
      isOpen: true,
      icon: '●',
      tone: 'positive',
      label: 'Open',
      // Deliberately no countdown. A duration would have to be computed across
      // the DST changeover to be right, and the clock time is what someone
      // actually plans around anyway.
      detail: `Closes today at ${formatClock(schedule.closesAt)} ${schedule.zoneLabel}`,
    };
  }

  // Before the bell on a trading day the next session is still today;
  // otherwise walk forward to the next weekday. The loop is bounded by the
  // week — from Friday evening the furthest it ever runs is three days.
  let daysAhead = isTradingDay(weekday) && minutes < schedule.opensAt ? 0 : 1;
  while (!isTradingDay((weekday + daysAhead) % 7)) daysAhead += 1;

  return {
    isOpen: false,
    icon: '○',
    tone: 'neutral',
    label: 'Closed',
    detail: `Opens ${dayWord(weekday, daysAhead)} at ${formatClock(schedule.opensAt)} ${schedule.zoneLabel}`,
  };
}
