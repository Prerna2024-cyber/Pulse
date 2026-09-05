import LandingTicker from './LandingTicker.jsx';

// The pre-login front door: what Pulse is and who it's for, before asking
// anyone to type anything. "Get started" hands off to LoginScreen — kept as a
// separate step so the first screen can say what this is without a form on it.
//
// Deliberately quiet for a finance app aimed at beginners: one accent colour
// (the dot and the button), a lot of whitespace, and a staggered fade-in that
// index.css switches off entirely under prefers-reduced-motion.
//
// One scroll, two parts: a hero sized just under the viewport so the preview
// heading peeks above the fold and invites the scroll without needing a
// chevron, then the What Changed preview. No further sections, no footer.
//
// The tagline is the h1, not the wordmark — it's the page's actual message,
// so it's what someone navigating by headings should land on.
export default function LandingScreen({ onGetStarted }) {
  return (
    <div className="landing">
      <main className="landing-inner">
        <section className="landing-hero">
          <p className="landing-wordmark landing-reveal">
            <span className="landing-dot" aria-hidden="true" />
            Pulse
          </p>

          <div className="landing-ticker-slot landing-reveal">
            <LandingTicker />
          </div>

          <h1 className="landing-tagline landing-reveal">
            Know what actually changed, not just what moved
          </h1>

          <p className="landing-description landing-reveal">
            Track the stocks you care about and get told, in plain language, what's meaningfully
            different since you last checked — not a wall of numbers to decode.
          </p>

          <ul className="market-badges landing-reveal">
            <li className="market-badge">
              <span aria-hidden="true">🇮🇳</span>
              <span>
                India <span className="muted small">NSE · BSE</span>
              </span>
            </li>
            <li className="market-badge">
              <span aria-hidden="true">🇺🇸</span>
              <span>
                US <span className="muted small">NASDAQ</span>
              </span>
            </li>
          </ul>

          <button className="btn btn-primary landing-cta landing-reveal" onClick={onGetStarted}>
            Get started
          </button>
        </section>

        <section className="landing-preview">
          <h2 className="preview-heading">See it before you sign up</h2>
          <p className="preview-sub muted">Plain-language alerts, not a table of numbers to decode.</p>

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
        </section>
      </main>
    </div>
  );
}
