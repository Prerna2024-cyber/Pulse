// Icon + color together for every signal, never color alone (accessibility —
// see PROJECT_CONTEXT.md UX priorities). The word choice ("Up"/"Down"/"Busy")
// carries the same meaning as the icon/color, so it still reads fine without
// either.
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
