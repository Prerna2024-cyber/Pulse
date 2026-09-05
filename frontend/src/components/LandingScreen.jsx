// The pre-login front door: what Pulse is and who it's for, before asking
// anyone to type anything. "Get started" hands off to LoginScreen — kept as a
// separate step so the first screen can sell the idea without a form on it.
export default function LandingScreen({ onGetStarted }) {
  return (
    <div className="screen screen-center landing">
      <div className="brand landing-brand">
        <h1>Pulse</h1>
        <p className="landing-tagline">Know what actually changed, not just what moved</p>
      </div>

      <p className="landing-description muted">
        Track the stocks you care about and get told, in plain language, what's meaningfully
        different since you last checked — not a wall of numbers to decode.
      </p>

      <ul className="market-badges">
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

      <button className="btn btn-primary" onClick={onGetStarted}>
        Get started
      </button>
    </div>
  );
}
