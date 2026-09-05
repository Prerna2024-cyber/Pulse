import { useEffect, useState } from 'react';
import PulseLogo from './PulseLogo.jsx';

// Sticky top bar. Flat and transparent over the hero, picking up blur and a
// shadow once the page scrolls, so it separates from content only when there's
// content behind it to separate from.
//
// Trimmed against the mockup, which showed links Pulse doesn't have: Blog,
// About and a Markets page don't exist, and the ⌘K search field can't work
// pre-login (search scopes to the signed-in user's market), so a box that only
// ever bounced you to sign-in would be a prop rather than a feature. What's
// left points at the two real sections.
export default function LandingNav({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); // catch a restored scroll position on mount
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`landing-nav${scrolled ? ' landing-nav-scrolled' : ''}`}>
      <div className="landing-nav-inner">
        <a className="landing-nav-brand" href="#top" aria-label="Pulse, back to top">
          <PulseLogo />
        </a>

        <nav className="landing-nav-links" aria-label="Sections">
          <a href="#features">What it does</a>
          <a href="#preview">Preview</a>
        </nav>

        <div className="landing-nav-actions">
          {/* Both land on the same screen: Pulse has one entry point, where an
              unknown username signs up and a known one signs in. */}
          <button className="btn-ghost landing-nav-signin" onClick={onGetStarted}>
            Sign in
          </button>
          <button className="btn-dark btn-pill landing-nav-cta" onClick={onGetStarted}>
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}
