import { useReducedMotion } from 'framer-motion';

// The sign-in screen's backdrop: concentric rings expanding out from behind
// the card, over two slow colour washes borrowed from the hero.
//
// Rings rather than another drifting squiggle — this is the one screen named
// after the product, and an expanding ring is the pulse motif the logo already
// uses. It reads as a heartbeat rather than as a chart, which keeps it clear
// of implying data on a screen that has none.
//
// Pure CSS: three rings and two washes, transform and opacity only, so the
// whole thing composites on the GPU and never lays out. No library, and it
// costs nothing beyond the stylesheet.
//
// Under prefers-reduced-motion nothing moves at all — the rings render at a
// fixed mid-expansion so the composition still reads, rather than animating
// slowly or being removed and leaving the panel bare.

const RINGS = [0, 1, 2];

export default function SignInBackground() {
  const reduced = useReducedMotion();

  return (
    <div className={`signin-bg${reduced ? ' signin-bg-still' : ''}`} aria-hidden="true">
      <span className="signin-wash signin-wash-a" />
      <span className="signin-wash signin-wash-b" />

      {/* Staggered by an animation-delay set per ring, so one expanding ring
          is always mid-flight and the sequence never has a visible gap. */}
      <div className="signin-rings">
        {RINGS.map((i) => (
          <span key={i} className="signin-ring" style={{ '--ring-index': i }} />
        ))}
      </div>
    </div>
  );
}
