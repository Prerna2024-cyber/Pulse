import { motion, useReducedMotion } from 'framer-motion';

// Decorative hero background: two slow-drifting colour washes and a market
// line that draws itself in, echoing the faint chart squiggle in the mockup.
//
// Abstract on purpose — no axis, no values, nothing that could be mistaken for
// a real chart. The only real numbers on this screen are in the markets panel.
//
// Everything is transform and opacity only, sits behind the content, and never
// takes a pointer event. Under prefers-reduced-motion the line is simply drawn
// at rest and the washes hold still.

// An upward-drifting jagged line — plausible as a chart shape without
// pretending to be one.
const LINE = 'M0,300 L80,292 L160,312 L240,258 L320,276 L400,228 L480,252 L560,198 \
L640,222 L720,168 L800,194 L880,138 L960,164 L1040,108 L1120,134 L1200,88';

const LINE_SOFT = 'M0,356 L90,344 L180,362 L270,320 L360,336 L450,296 L540,314 \
L630,270 L720,288 L810,244 L900,262 L990,218 L1080,236 L1200,196';

export default function HeroBackground() {
  const reduced = useReducedMotion();

  const draw = (delay) =>
    reduced
      ? { initial: false, animate: { pathLength: 1 } }
      : {
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 2.2, ease: 'easeInOut', delay },
        };

  return (
    <div className="hero-bg" aria-hidden="true">
      <span className={`hero-wash hero-wash-a${reduced ? ' hero-wash-still' : ''}`} />
      <span className={`hero-wash hero-wash-b${reduced ? ' hero-wash-still' : ''}`} />

      <svg
        className="hero-bg-line"
        viewBox="0 0 1200 420"
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          {/* Fades in from the left so the line never competes with the
              headline sitting over it. */}
          <linearGradient id="hero-line-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand-coral)" stopOpacity="0" />
            <stop offset="45%" stopColor="var(--brand-coral)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-pink)" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* A single group drifting a few pixels keeps the whole figure alive
            without any one element visibly moving. */}
        <motion.g
          animate={reduced ? undefined : { y: [0, -7, 0] }}
          transition={reduced ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.path
            d={LINE_SOFT}
            fill="none"
            stroke="url(#hero-line-fade)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
            {...draw(0.5)}
          />
          <motion.path
            d={LINE}
            fill="none"
            stroke="url(#hero-line-fade)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...draw(0.25)}
          />
        </motion.g>
      </svg>
    </div>
  );
}
