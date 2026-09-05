// What Pulse actually does — every claim here maps to shipped code, not to a
// roadmap. The thresholds quoted are the real defaults from lib/significance.js
// (±2% price, 2x volume), the markets are the ones migration_add_exchange.sql
// created, and search really does match on company_name only.
export default function LandingFeatures() {
  return (
    <section className="landing-section landing-features" id="features">
      <div className="landing-section-inner">
        <h2 className="section-heading">What Pulse does</h2>
        <p className="section-sub muted">Four things, built end to end.</p>

        <ul className="feature-grid">
          <li className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              🎯
            </span>
            <h3 className="feature-title">Meaningful change, in plain English</h3>
            <p className="feature-body muted">
              A move is flagged only when the price crosses ±2% or volume doubles since you last
              checked. You get “TCS jumped 3.1% since you last checked” — a sentence, not a
              percentage to interpret.
            </p>
          </li>

          <li className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              🌏
            </span>
            <h3 className="feature-title">Two markets, one watchlist</h3>
            <p className="feature-body muted">
              Pick your market and everything follows it — search, prices, trending and your
              watchlist all stay scoped to it.
            </p>
            <ul className="market-badges feature-badges">
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
          </li>

          <li className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              🔎
            </span>
            <h3 className="feature-title">Search by company name</h3>
            <p className="feature-body muted">
              You shouldn't have to know that Reliance Industries trades as RELIANCE. Type the
              company name and Pulse finds the ticker for you.
            </p>
          </li>

          <li className="feature-card">
            <span className="feature-icon" aria-hidden="true">
              🔥
            </span>
            <h3 className="feature-title">See what others track</h3>
            <p className="feature-body muted">
              Trending shows the most-watched stocks in your market, so there's somewhere obvious
              to start on day one instead of a blank list.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
