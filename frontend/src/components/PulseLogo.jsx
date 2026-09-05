import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// The waveform mark rebuilt as inline SVG rather than shipping the PNG: it
// stays crisp at any size, takes the coral gradient from the same CSS tokens
// as the rest of the page, and the bars can breathe — the pulse motif the
// brand is named for, and the one animation that persists after entrance.
const BARS = [
  { x: 0, y: 11, height: 10, opacity: 0.72 },
  { x: 7, y: 5.5, height: 21, opacity: 1 },
  { x: 14, y: 0, height: 32, opacity: 1 },
  { x: 21, y: 7.5, height: 17, opacity: 0.9 },
  { x: 28, y: 10.5, height: 11, opacity: 0.5 },
];

export default function PulseLogo({ className = '', animate = true }) {
  const reduced = useReducedMotion();
  // The gradient lives in <defs> and is referenced by id, so each instance of
  // the logo needs its own or the second one inherits the first's fill.
  const gradientId = useId();
  const breathing = animate && !reduced;

  return (
    <span className={`pulse-logo ${className}`.trim()}>
      <svg className="pulse-logo-mark" viewBox="0 0 33 32" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brand-orange)" />
            <stop offset="55%" stopColor="var(--brand-coral)" />
            <stop offset="100%" stopColor="var(--brand-pink)" />
          </linearGradient>
        </defs>

        {BARS.map((bar, index) => (
          <motion.rect
            key={bar.x}
            x={bar.x}
            y={bar.y}
            width={5}
            height={bar.height}
            rx={2.5}
            fill={`url(#${gradientId})`}
            opacity={bar.opacity}
            // Scale from the bar's own centre so it breathes in place rather
            // than growing downward from the top of the viewBox.
            style={{ transformOrigin: `${bar.x + 2.5}px 16px` }}
            animate={breathing ? { scaleY: [1, 0.78, 1] } : undefined}
            transition={
              breathing
                ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.12 }
                : undefined
            }
          />
        ))}
      </svg>
      <span className="pulse-logo-word">PULSE</span>
    </span>
  );
}
