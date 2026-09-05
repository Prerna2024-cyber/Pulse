import Reveal from './Reveal.jsx';

// The What Changed view as a visitor would see it.
//
// The mockup's third row was HDFC Bank "Fell 1.8% after Q2 results" — Pulse
// has no news ingestion, so a card citing results would advertise something
// that doesn't exist. Price and volume are what the significance logic
// actually detects, so those are the two shown.
//
// It's an illustration rather than live data, so it's exposed to assistive
// tech as a single described image instead of being read out as if these were
// the visitor's real alerts. The wording mirrors the summary format built in
// lib/significance.js.
export default function LandingPreview() {
  return (
    <section className="landing-section landing-preview" id="preview">
      <div className="landing-section-inner preview-layout">
        <Reveal className="preview-intro">
          <p className="eyebrow">See it before you sign up</p>
          <h2 className="section-heading">The What Changed view</h2>
          <p className="section-sub">Plain-language alerts, not a table of numbers.</p>
        </Reveal>

        <Reveal
          className="preview-frame"
          delay={0.08}
          role="img"
          aria-label="Preview of the What Changed screen, showing two example alerts: Tata Consultancy Services jumped 3.1% since you last checked, and Reliance Industries traded at 2.4 times its usual volume since you last checked."
        >
          <div className="preview-frame-bar">
            <span className="preview-frame-title">
              <span aria-hidden="true">🔔</span> What Changed
            </span>
          </div>

          <ul className="preview-cards">
            <li className="preview-row preview-row-positive">
              <span className="preview-row-icon" aria-hidden="true">
                ▲
              </span>
              <div className="preview-row-text">
                <p className="preview-row-title">Tata Consultancy Services</p>
                <p className="preview-row-summary">Jumped 3.1% since you last checked</p>
                <p className="preview-row-meta">Up · TCS</p>
              </div>
              <span className="preview-row-pill preview-pill-positive">+3.1%</span>
            </li>

            <li className="preview-row preview-row-notice">
              <span className="preview-row-icon" aria-hidden="true">
                ⚡
              </span>
              <div className="preview-row-text">
                <p className="preview-row-title">Reliance Industries</p>
                <p className="preview-row-summary">Traded at 2.4x its usual volume</p>
                <p className="preview-row-meta">Busy · RELIANCE</p>
              </div>
              <span className="preview-row-pill preview-pill-notice">2.4x</span>
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
