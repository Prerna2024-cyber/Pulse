import LandingNav from './LandingNav.jsx';
import LandingMarkets from './LandingMarkets.jsx';
import LandingFeatures from './LandingFeatures.jsx';
import LandingPreview from './LandingPreview.jsx';
import LandingCta from './LandingCta.jsx';
import LandingFooter from './LandingFooter.jsx';
import Reveal from './Reveal.jsx';

// The pre-login front door, built to the mockups: nav, hero with a live
// markets panel, what it does, a look at the real product, closing CTA,
// footer.
//
// Three things the mockups showed that Pulse can't back up are gone — the
// stats row (5K+ users, 10K+ stocks, 99.9% uptime), the "Loved by 5K+ users"
// badge, and "Free to start / No credit card required". No paid tier exists
// for free to contrast against, and there are no usage numbers to quote.
//
// The mockups put a phone mockup beside the hero. Pulse is a mobile-first web
// app with no native app, so the hero's second column is the live markets
// panel instead — real data, and nothing implied that doesn't ship.
export default function LandingScreen({ onGetStarted }) {
  return (
    <div className="landing" id="top">
      <LandingNav onGetStarted={onGetStarted} />

      <main>
        <section className="landing-section landing-hero">
          <div className="landing-section-inner hero-layout">
            <div className="hero-copy">
              <Reveal as="p" className="hero-pill">
                Your market companion
              </Reveal>

              <Reveal as="h1" delay={0.06} className="hero-heading">
                Stay in sync
                <br />
                with <span className="hero-heading-accent">the market</span>
              </Reveal>

              <Reveal as="p" delay={0.12} className="hero-sub">
                Know what actually changed, not just what moved — plain-language updates on the
                stocks you track, instead of a wall of numbers.
              </Reveal>

              <Reveal delay={0.18} className="hero-actions">
                <button className="btn-dark btn-pill hero-cta" onClick={onGetStarted}>
                  Get started <span aria-hidden="true">→</span>
                </button>
                <a className="btn-outline btn-pill hero-secondary" href="#preview">
                  See a preview
                </a>
              </Reveal>
            </div>

            <Reveal delay={0.16} className="hero-panel">
              <LandingMarkets />
            </Reveal>
          </div>
        </section>

        <LandingFeatures />
        <LandingPreview />
        <LandingCta onGetStarted={onGetStarted} />
      </main>

      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}
