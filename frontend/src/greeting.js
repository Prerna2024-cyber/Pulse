// Time-of-day greeting, computed from the viewer's own clock. Deliberately
// client-side: the server never receives a timezone, and getting this wrong
// is cosmetic, so it isn't worth a round trip or a stored preference.
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
