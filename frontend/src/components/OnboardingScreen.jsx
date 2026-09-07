import { useState } from 'react';
import PulseLogo from './PulseLogo.jsx';
import Reveal from './Reveal.jsx';
import FrontDoorBackground from './FrontDoorBackground.jsx';
import { sessionBounds } from '../marketHours.js';

const MARKETS = [
  { value: 'India', label: 'India', hint: 'NSE & BSE stocks', flag: '🇮🇳' },
  { value: 'US', label: 'United States', hint: 'NASDAQ stocks', flag: '🇺🇸' },
];

// Read off the same schedule the worker polls and the charts are drawn
// against, rather than typed out here. Written by hand this would be a fourth
// copy of the trading hours, and the only one nothing tests.
function hoursFor(market) {
  const bounds = sessionBounds(market);
  if (!bounds) return null;
  return `${bounds.openLabel} – ${bounds.closeLabel} ${bounds.zoneLabel}`;
}

// The second half of signing up, and the screen a new user lands on straight
// from the confirmation beat — so it wears the same front door identity rather
// than the app's chrome, which starts one screen later.
//
// The choice is a genuine fork: it scopes search, browse, trending and the
// watchlist server-side, so it is worth presenting as a decision rather than a
// settings row. Each option carries its exchanges and its trading hours, which
// is the information that actually distinguishes them — the flags alone are
// decoration, and are marked as such.
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
    <div className="frontdoor">
      <FrontDoorBackground />

      <main className="frontdoor-inner">
        <Reveal className="signin-brand">
          <PulseLogo className="signin-logo" />
        </Reveal>

        <Reveal as="p" delay={0.06} className="hero-pill signin-eyebrow">
          Last step
        </Reveal>

        <Reveal as="h1" delay={0.1} className="signin-heading">
          Welcome, <span className="hero-heading-accent">{username}</span>
        </Reveal>

        <Reveal as="p" delay={0.14} className="signin-sub">
          Which market do you want to track? It scopes your search, sectors and watchlist — and you
          can switch at any time.
        </Reveal>

        {/* A radiogroup, not a list of buttons: these are two options for one
            decision, and naming the group lets a screen reader say what is
            being chosen rather than reading two unrelated controls. */}
        <Reveal delay={0.18} className="market-choices" role="radiogroup" aria-label="Preferred market">
          {MARKETS.map((m) => {
            const busy = picking === m.value;
            const hours = hoursFor(m.value);
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={busy}
                className={`market-choice${busy ? ' market-choice-busy' : ''}`}
                onClick={() => handlePick(m.value)}
                disabled={picking !== null}
              >
                <span className="market-flag" aria-hidden="true">
                  {m.flag}
                </span>
                <span className="market-choice-text">
                  <strong className="market-choice-label">{m.label}</strong>
                  <span className="market-hint">{m.hint}</span>
                  {/* Stated so the choice is about when the market is live
                      rather than about a flag. */}
                  {hours && <span className="market-choice-detail">{hours}</span>}
                </span>
                <span className="market-choice-go" aria-hidden="true">
                  {busy ? '…' : '→'}
                </span>
              </button>
            );
          })}
        </Reveal>

        {error && (
          <Reveal as="p" className="error-text signin-error market-error" role="alert">
            {error}
          </Reveal>
        )}

        <Reveal as="p" delay={0.22} className="signin-foot">
          You can switch markets later from the header.
        </Reveal>
      </main>
    </div>
  );
}
