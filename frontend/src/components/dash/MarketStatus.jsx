import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Market status, sat inside What Changed because a closed market is the usual
// answer to "why has nothing moved?".
//
// Two states, one slot. Open is a compact pill that stays out of the way —
// trading is the normal case and needs no explanation. Closed is a full-width
// banner, because that's the state that owes the reader a reason and a time to
// come back. Swapping them in a single slot (rather than two slots that take
// turns being empty) is what lets one animate out as the other animates in
// without the panel below jumping.
//
// See marketHours.js for the deliberate trading-holiday gap.

// mode="wait" so the outgoing state finishes before the incoming one starts:
// the two have very different heights, and cross-fading them makes the whole
// panel lurch. `initial` is left at its default (true) so both states also
// animate in on first render, not just on a later flip.
const TRANSITION = { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] };
const ENTER = { opacity: 1, y: 0 };
const OFFSCREEN = { opacity: 0, y: -6 };

export default function MarketStatus({ status }) {
  // Under prefers-reduced-motion this renders the same markup with no motion
  // wrapper at all — same approach as Reveal.jsx. Nothing to fade and nothing
  // to translate, so there's no chance of an element being left mid-animation
  // at opacity 0. The pulsing dot is CSS, and index.css stops it under the
  // same media query.
  const reduced = useReducedMotion();

  if (!status) return null;

  const body = status.isOpen ? <LivePill status={status} /> : <ClosedBanner status={status} />;

  // role="status" announces the flip to a screen reader when it happens. The
  // content only changes at the open/close boundary, so the 60-second re-check
  // that renders the same words again stays silent.
  if (reduced) {
    return (
      <div className="market-status" role="status">
        {body}
      </div>
    );
  }

  return (
    <div className="market-status" role="status">
      <AnimatePresence mode="wait">
        <motion.div
          // Keyed on the state, not on the status object: the 60-second
          // re-check hands us a fresh object every tick, and keying on that
          // would replay the animation every minute.
          key={status.isOpen ? 'live' : 'closed'}
          initial={OFFSCREEN}
          animate={ENTER}
          exit={OFFSCREEN}
          transition={TRANSITION}
        >
          {body}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function LivePill({ status }) {
  return (
    <p className="market-live">
      <span className="market-live-pill">
        {/* The breathing dot is the brand's own motion, shared with the
            landing page's Live badge (.markets-state-dot, same keyframe). */}
        <span className="market-live-dot" aria-hidden="true" />
        {status.label}
      </span>
      <span className="market-live-detail muted small">
        {status.exchange} · {status.detail}
      </span>
    </p>
  );
}

function ClosedBanner({ status }) {
  return (
    <div className="market-closed">
      <span className="market-closed-icon" aria-hidden="true">
        {status.icon}
      </span>
      <div>
        <p className="market-closed-line">
          {status.exchange} is closed. {status.detail}.
        </p>
        {/* The tie back to What Changed: an empty list below isn't the app
            failing to notice anything, it's there being nothing to notice. */}
        <p className="market-closed-note muted small">
          Prices aren’t moving, so nothing new will be flagged.
        </p>
      </div>
    </div>
  );
}
