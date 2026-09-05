import { motion, useReducedMotion } from 'framer-motion';

// One entrance for the whole page: fade and rise, triggered when the element
// scrolls into view, played once. Sections above the fold are already in view
// on load, so the same component covers both the entrance and the
// scroll-triggered reveals without a second code path.
//
// Under prefers-reduced-motion it renders a plain element with no motion
// wrapper at all — nothing to fade, nothing to translate, no chance of an
// element being left mid-animation at opacity 0.
export default function Reveal({ as = 'div', delay = 0, className, children, ...rest }) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Tag = as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
