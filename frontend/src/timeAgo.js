// Light "as of" treatment so a price never silently reads as fresher than it
// is. Full staleness thresholds/warnings are a later step — this just says
// when the number was actually fetched.
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
