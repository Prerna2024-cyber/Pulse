// Whether the user's own market is trading, sat next to What Changed because a
// closed market is the usual answer to "why has nothing moved?".
//
// `status` comes from marketHours.js and is computed by the parent, which
// needs it anyway to word its empty state. See that module for the deliberate
// holiday gap.
export default function MarketHoursBadge({ market, status }) {
  if (!status) return null;

  return (
    <p className="market-hours">
      <span className={`market-hours-pill market-hours-pill-${status.tone}`}>
        {/* Filled vs hollow, not green vs red — the shape and the word both
            carry the state, so colour is reinforcement only. */}
        <span className="market-hours-dot" aria-hidden="true">
          {status.icon}
        </span>
        {market} market {status.isOpen ? 'open' : 'closed'}
      </span>
      <span className="market-hours-detail muted small">{status.detail}</span>
    </p>
  );
}
