import LandingNav from './LandingNav.jsx';
import LandingTicker from './LandingTicker.jsx';
import LandingFeatures from './LandingFeatures.jsx';
import LandingFooter from './LandingFooter.jsx';

// The pre-login front door: sticky nav, hero, what it does, a look at the real
// product, footer. "Get started" hands off to LoginScreen from three places —
// the nav, the hero and the footer — so the way in is never far away.
//
// Still deliberately quiet for a finance app aimed at beginners: one accent
// colour, generous whitespace, and a staggered entrance that index.css
// switches off entirely under prefers-reduced-motion.
export default function LandingScreen({ onGetStarted }) {
  return (
    <div className="landing" id="top">
      <LandingNav onGetStarted={onGetStarted} />

      <main>
        <section className="landing-section landing-hero">
          <div className="landing-section-inner landing-hero-inner">
            <div className="landing-ticker-slot landing-reveal">
              <LandingTicker />
            </div>

            <h1 className="landing-tagline landing-reveal">Stay in sync with the market</h1>

            <p className="landing-description landing-reveal">
              Know what actually changed, not just what moved — plain-language updates on the
              stocks you track, instead of a wall of numbers to decode.
            </p>

            <button className="btn btn-primary landing-cta landing-reveal" onClick={onGetStarted}>
              Get started
            </button>
          </div>
        </section>

        <LandingFeatures />

        <section className="landing-section landing-preview" id="preview">
          <div className="landing-section-inner">
            <h2 className="section-heading">See it before you sign up</h2>
            <p className="section-sub muted">
              The What Changed view — plain-language alerts, not a table of numbers.
            </p>

            {/* An illustration of the What Changed view, not live data — so it's
                exposed to assistive tech as a single described image rather than
                read out as if these were real alerts. The card markup reuses the
                real .change-card classes, and the wording mirrors the summary
                format built in lib/significance.js. */}
            <div
              className="preview-frame"
              role="img"
              aria-label="Preview of the What Changed screen, showing two example alerts: Tata Consultancy Services jumped 3.1% since you last checked, and Reliance Industries traded at 2.4 times its usual volume since you last checked."
            >
              <div className="preview-frame-bar">
                <span aria-hidden="true">🔔</span> What Changed
              </div>

              <ul className="preview-cards">
                <li className="change-card change-positive">
                  <span className="change-icon">▲</span>
                  <div>
                    <p className="change-summary">
                      Tata Consultancy Services jumped 3.1% since you last checked
                    </p>
                    <span className="muted small">Up · TCS</span>
                  </div>
                </li>

                <li className="change-card change-notice">
                  <span className="change-icon">⚡</span>
                  <div>
                    <p className="change-summary">
                      Reliance Industries traded at 2.4x its usual volume since you last checked
                    </p>
                    <span className="muted small">Busy · RELIANCE</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}
