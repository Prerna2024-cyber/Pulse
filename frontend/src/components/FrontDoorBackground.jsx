import { useReducedMotion } from 'framer-motion';

// The backdrop shared by the front-door screens — sign-in and the market
// picker: concentric rings expanding out from behind the card, over two slow
// colour washes borrowed from the hero.
//
// Rings rather than another drifting squiggle — these are the screens either
// side of the product's name, and an expanding ring is the pulse motif the
// logo already uses. It reads as a heartbeat rather than as a chart, which
// keeps it clear of implying data on screens that have none.
//
// One component for both so the two steps of signing up sit on a continuous
// background: nothing restarts or jumps between them.
//
// Pure CSS: three rings and two washes, transform and opacity only, so the
// whole thing composites on the GPU and never lays out. No library, and it
// costs nothing beyond the stylesheet.
//
// Under prefers-reduced-motion nothing moves at all — the rings render at a
// fixed mid-expansion so the composition still reads, rather than animating
// slowly or being removed and leaving the panel bare.

const RINGS = [0, 1, 2];

export default function FrontDoorBackground() {
  const reduced = useReducedMotion();

  return (
    <div className={`frontdoor-bg${reduced ? ' frontdoor-bg-still' : ''}`} aria-hidden="true">
      <span className="frontdoor-wash frontdoor-wash-a" />
      <span className="frontdoor-wash frontdoor-wash-b" />

      {/* Staggered by an animation-delay set per ring, so one expanding ring
          is always mid-flight and the sequence never has a visible gap. */}
      <div className="frontdoor-rings">
        {RINGS.map((i) => (
          <span key={i} className="frontdoor-ring" style={{ '--ring-index': i }} />
        ))}
      </div>
    </div>
  );
}
