import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import PulseLogo from './PulseLogo.jsx';
import Reveal from './Reveal.jsx';
import SignInBackground from './SignInBackground.jsx';

// How long the confirmation is held before the app moves on. Long enough to
// read four words, short enough not to feel like a gate.
const HANDOFF_MS = 1100;

// The sign-in screen, dressed in the landing page's identity rather than the
// app's: brand washes, the coral gradient on the accented word, the same
// eyebrow pill, heading scale and pill buttons. Signing in happens before the
// product's indigo starts, so this screen belongs to the front door.
//
// Still username-only. Nothing here adds a password, a session or a second
// factor — the form posts exactly what it always did.
//
// WHY THE CONFIRMATION BEAT: isNewUser is only known once /login has answered,
// and until this screen held the handoff, the answer arrived after the screen
// was already gone — App committed the user and unmounted this component in
// the same tick. So the screen now owns the moment between the response and
// the handoff, which is the only point at which "welcome back" and "account
// created" can be told apart. It is a UI beat, not an auth step: the request,
// the endpoint and what is stored are unchanged.
export default function LoginScreen({ onLogin, onEnter }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const reduced = useReducedMotion();
  const timer = useRef(null);

  // A pending handoff must not fire into an unmounted tree, and must not be
  // left behind if this screen goes away for any other reason.
  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const login = await onLogin(trimmed);
      setResult(login);
      timer.current = setTimeout(() => onEnter(login), HANDOFF_MS);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (result) return <SignInConfirmation result={result} reduced={reduced} />;

  return (
    <div className="signin">
      <SignInBackground />

      <main className="signin-inner">
        <Reveal className="signin-brand">
          <PulseLogo className="signin-logo" />
        </Reveal>

        <Reveal as="p" delay={0.06} className="hero-pill signin-eyebrow">
          Your market companion
        </Reveal>

        <Reveal as="h1" delay={0.1} className="signin-heading">
          Welcome to <span className="hero-heading-accent">Pulse</span>
        </Reveal>

        <Reveal as="p" delay={0.14} className="signin-sub">
          Pick a username to open your watchlist. No password, no email — the name is all Pulse
          keeps.
        </Reveal>

        <Reveal delay={0.18} className="signin-card">
          <form onSubmit={handleSubmit}>
            <label className="signin-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="signin-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. prerna"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              disabled={submitting}
              aria-describedby={error ? 'signin-error' : undefined}
              aria-invalid={error ? true : undefined}
            />

            {/* Reserved by the live region below rather than by a fixed
                height, so an error never shoves the button under the fold on a
                small screen. */}
            {error && (
              <p className="error-text signin-error" id="signin-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-dark btn-pill signin-submit"
              disabled={submitting || !username.trim()}
            >
              {submitting ? 'Signing in…' : 'Continue'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </Reveal>

        <Reveal as="p" delay={0.22} className="signin-foot">
          New here? Entering a name that isn't taken creates the account.
        </Reveal>
      </main>
    </div>
  );
}

// The one place isNewUser is visible. A returning user is greeted back; a new
// one is told their account exists now, and what happens next — the market
// picker, which is the screen App sends them to.
function SignInConfirmation({ result, reduced }) {
  const returning = !result.isNewUser;

  return (
    <div className="signin">
      <SignInBackground />

      <main className="signin-inner signin-inner-confirm">
        {/* aria-live rather than a focus move: the app is about to change
            screens on its own, so announcing beats stealing focus into
            something that is leaving. */}
        <div className={`signin-confirm${reduced ? '' : ' signin-confirm-in'}`} role="status">
          <PulseLogo className="signin-logo" />
          <h1 className="signin-confirm-title">
            {returning ? (
              <>
                Welcome back, <span className="hero-heading-accent">{result.username}</span>
              </>
            ) : (
              <>
                You're all set, <span className="hero-heading-accent">{result.username}</span>
              </>
            )}
          </h1>
          <p className="signin-confirm-sub">
            {returning ? 'Opening your watchlist…' : 'Account created — pick your market next.'}
          </p>
        </div>
      </main>
    </div>
  );
}
