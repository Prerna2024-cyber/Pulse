import { useState } from 'react';

const MARKETS = [
  { value: 'India', label: 'India', hint: 'NSE & BSE stocks', flag: '🇮🇳' },
  { value: 'US', label: 'United States', hint: 'NASDAQ stocks', flag: '🇺🇸' },
];

export default function OnboardingScreen({ username, onPick }) {
  const [picking, setPicking] = useState(null);
  const [error, setError] = useState(null);

  async function handlePick(market) {
    setPicking(market);
    setError(null);
    try {
      await onPick(market);
    } catch (err) {
      setError(err.message);
      setPicking(null);
    }
  }

  return (
    <div className="screen screen-center">
      <div className="brand">
        <h1>Welcome, {username} 👋</h1>
        <p className="muted">Which market do you want to track?</p>
      </div>
      <div className="market-choices">
        {MARKETS.map((m) => (
          <button
            key={m.value}
            className="card market-choice"
            onClick={() => handlePick(m.value)}
            disabled={picking !== null}
          >
            <span className="market-flag">{m.flag}</span>
            <span>
              <strong>{m.label}</strong>
              <span className="muted market-hint">{m.hint}</span>
            </span>
            {picking === m.value && <span className="muted">…</span>}
          </button>
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="muted small">You can switch markets later from the header.</p>
    </div>
  );
}
