import { motion, useReducedMotion } from 'framer-motion';
import Reveal from './Reveal.jsx';

// What Pulse actually does — every claim maps to shipped code, not a roadmap.
// The ±2% and 2x thresholds are the real defaults in lib/significance.js, the
// markets are the ones migration_add_exchange.sql created, and search really
// does match on company_name only.
//
// The mockup's first card said "price, volume or news". There's no news
// ingestion anywhere in Pulse, so that card promises price and volume, which
// is exactly what the significance logic looks at.
const FEATURES = [
  {
    tone: 'rose',
    icon: '📄',
    title: 'Meaningful updates',
    body: 'Plain-English updates on what actually moved. A change is flagged only when price crosses ±2% or volume doubles since you last checked.',
  },
  {
    tone: 'green',
    icon: '📈',
    title: 'Multiple markets',
    body: 'Track stocks across NSE, BSE and NASDAQ. Pick your market and search, prices and trending all follow it.',
  },
  {
    tone: 'violet',
    icon: '🔍',
    title: 'Search with ease',
    body: 'Just type the company name and Pulse finds the right ticker for you — no symbols to memorise.',
  },
  {
    tone: 'amber',
    icon: '👥',
    title: 'See what others track',
    body: 'Trending shows the most-watched stocks in your market, so there’s somewhere obvious to start on day one.',
  },
];

export default function LandingFeatures() {
  const reduced = useReducedMotion();

  return (
    <section className="landing-section landing-features" id="features">
      <div className="landing-section-inner features-layout">
        <Reveal className="features-intro">
          <p className="eyebrow">What Pulse does</p>
          <h2 className="section-heading">
            Everything you need,
            <br />
            built for real investors
          </h2>
          <p className="section-sub">
            Four things, built end to end — so you always know what’s moving, and why.
          </p>
        </Reveal>

        <ul className="feature-grid">
          {FEATURES.map((feature, index) => (
            <Reveal
              as="li"
              key={feature.title}
              delay={index * 0.06}
              className={`feature-card feature-card-${feature.tone}`}
            >
              <motion.div
                className="feature-card-inner"
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-body">{feature.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
