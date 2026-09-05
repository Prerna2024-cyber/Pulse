import { dayChangeSignal } from './dayChange.js';

// Counts behind the watchlist hero.
//
// up/down only count rows that actually carry a day change. A row still
// waiting on its first quote is neither up nor down, and gets left out rather
// than quietly counted as flat — same rule as the price colour, where a
// missing figure means "no claim", not "zero".
export function watchlistSummary(items) {
  let up = 0;
  let down = 0;
  let withChange = 0;
  let freshest = null;

  for (const item of items) {
    const day = dayChangeSignal(item.dayChange, item.dayChangePercent);
    if (day) {
      withChange += 1;
      if (day.tone === 'positive') up += 1;
      else if (day.tone === 'negative') down += 1;
    }
    // The hero's "updated" line reports the freshest row, since that's the
    // most generous honest claim — any staleness warning still fires off it.
    if (item.fetchedAt && (freshest === null || new Date(item.fetchedAt) > new Date(freshest))) {
      freshest = item.fetchedAt;
    }
  }

  return { count: items.length, up, down, withChange, freshest };
}

// The movement clause, or null when there's nothing honest to say about it.
export function movementPhrase({ up, down, withChange }) {
  // No row has a day change yet — staying silent beats claiming "no moves",
  // which would assert something we don't actually know.
  if (withChange === 0) return null;
  if (up === 0 && down === 0) return 'no moves today';

  const parts = [];
  if (up > 0) parts.push(`${up} up`);
  if (down > 0) parts.push(`${down} down`);
  return `${parts.join(', ')} today`;
}

export function stockCountPhrase(count) {
  if (count === 0) return 'Nothing tracked yet';
  return `${count} stock${count === 1 ? '' : 's'}`;
}
