// Icon + color together for every signal, never color alone (accessibility —
// see PROJECT_CONTEXT.md UX priorities). The word choice ("Up"/"Down"/"Busy")
// carries the same meaning as the icon/color, so it still reads fine without
// either.
// The one-line description for a stock that wasn't flagged. Kept precise
// rather than blanket-"unchanged": a stock with no earlier reading was never
// checked, and one that moved a little did move — just not past the threshold.
// Claiming either is unchanged would be the quiet kind of wrong.
export function quietChangeLine(change) {
  if (!change.hasData) return 'waiting for its first price';
  if (!change.hasPrevious) return 'first reading — nothing to compare yet';
  if (change.priceChangePercent === null) return 'no earlier price to compare against';
  if (change.priceChangePercent === 0) return 'unchanged since you last checked';
  return `moved ${Math.abs(change.priceChangePercent).toFixed(1)}% since you last checked`;
}

export function changeSignal(change) {
  const hasPriceReason = change.reasons.some((r) => r.type === 'price');
  if (hasPriceReason) {
    const up = change.priceChangePercent > 0;
    return { icon: up ? '▲' : '▼', tone: up ? 'positive' : 'negative', label: up ? 'Up' : 'Down' };
  }
  const hasVolumeReason = change.reasons.some((r) => r.type === 'volume');
  if (hasVolumeReason) {
    return { icon: '⚡', tone: 'notice', label: 'Busy' };
  }
  return { icon: 'ℹ️', tone: 'neutral', label: 'Changed' };
}
