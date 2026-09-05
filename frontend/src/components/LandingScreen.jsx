// The pre-login front door: what Pulse is and who it's for, before asking
// anyone to type anything. "Get started" hands off to LoginScreen — kept as a
// separate step so the first screen can say what this is without a form on it.
//
// Deliberately quiet for a finance app aimed at beginners: one accent colour
// (the dot and the button), a lot of whitespace, and a staggered fade-in that
// index.css switches off entirely under prefers-reduced-motion.
//
// The tagline is the h1, not the wordmark — it's the page's actual message,
// so it's what someone navigating by headings should land on.
export default function LandingScreen({ onGetStarted }) {
  return (
    <div className="landing">
      <main className="landing-inner">
        <p className="landing-wordmark landing-reveal">
          <span className="landing-dot" aria-hidden="true" />
          Pulse
        </p>

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
      </main>
    </div>
  );
}
