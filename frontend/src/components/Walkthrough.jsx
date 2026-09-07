import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SIGNIFICANCE_SENTENCE } from '../significanceCopy.js';

// Three cards shown once, over the dashboard rather than instead of it: steps
// two and three point at things that are on the screen behind, so dimming the
// product is more use than replacing it.
const STEPS = [
  {
    key: 'what',
    eyebrow: 'What Pulse does',
    title: 'What changed, not what moved',
    body: 'Most trackers hand you a wall of numbers and leave you to spot what matters. Pulse tells you what meaningfully changed since you last checked, in a plain sentence.',
  },
  {
    key: 'start',
    eyebrow: 'Getting started',
    title: 'Search by name, not ticker',
    body: "Type a company — “Reliance”, “Apple” — rather than hunting for its symbol. Or open a sector to browse what's in it and add from there.",
  },
  {
    key: 'deeper',
    eyebrow: 'Going deeper',
    title: 'Open a stock for its session chart',
    body: 'Click any company in your watchlist to see its price through the current trading session, alongside the day’s open, high and low.',
    // Stated plainly because the alternative is a user concluding the feature
    // is broken. "Nothing changed" is a real answer, not an empty state.
    note: `${SIGNIFICANCE_SENTENCE} — so on a quiet day What changed can correctly say nothing has.`,
  },
];

export default function Walkthrough({ onDone }) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = useCallback(() => onDone(), [onDone]);

  // Focus moves into the dialog on open and returns where it came from on
  // close, so dismissing doesn't dump keyboard users back at the top of the
  // document.
  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      const target = returnFocusRef.current;
      if (target instanceof HTMLElement && document.contains(target)) target.focus();
    };
  }, []);

  // Escape skips, and Tab is kept inside the dialog — with the dashboard still
  // rendered behind, tabbing would otherwise walk off into a watchlist the
  // user can't see well enough to use.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  const slide = reduced
    ? {}
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
        transition: { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] },
      };

  return (
    <div className="walkthrough-scrim">
      <div
        className="walkthrough"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="walkthrough-head">
          <p className="walkthrough-eyebrow">{step.eyebrow}</p>
          <button type="button" className="walkthrough-skip" onClick={finish}>
            Skip
          </button>
        </div>

        {/* mode="wait" so the outgoing card is gone before the next arrives —
            two absolutely-positioned cards crossing over would need a fixed
            height, and these bodies are different lengths. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step.key} className="walkthrough-body" {...slide}>
            <h2 className="walkthrough-title" id="walkthrough-title">
              {step.title}
            </h2>
            <p className="walkthrough-text">{step.body}</p>
            {step.note && <p className="walkthrough-note">{step.note}</p>}
          </motion.div>
        </AnimatePresence>

        <div className="walkthrough-foot">
          {/* Presentational: the same position is announced as text in the
              button below, so a screen reader isn't read three empty dots. */}
          <span className="walkthrough-dots" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.key} className={`walkthrough-dot${i === index ? ' walkthrough-dot-on' : ''}`} />
            ))}
          </span>

          <button
            type="button"
            className="btn-dark btn-pill walkthrough-next"
            onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
          >
            {isLast ? 'Start using Pulse' : 'Next'}
            <span className="sr-only"> — step {index + 1} of {STEPS.length}</span>
            {!isLast && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
