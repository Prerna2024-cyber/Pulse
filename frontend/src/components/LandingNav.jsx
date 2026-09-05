import { useEffect, useState } from 'react';

// Sticky top bar. It sits flat and transparent over the hero, then picks up a
// blur and a shadow once the page moves, so it separates from content only
// when there's content behind it to separate from.
//
// A passive scroll listener rather than a scroll-driven CSS animation, which
// is still Chromium-only — this is four lines and works everywhere.
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
        <a className="landing-nav-brand" href="#top">
          <span className="landing-dot" aria-hidden="true" />
          Pulse
        </a>

        <nav className="landing-nav-links" aria-label="Sections">
          <a href="#features">What it does</a>
          <a href="#preview">Preview</a>
        </nav>

        <button className="btn btn-primary btn-small landing-nav-cta" onClick={onGetStarted}>
          Get started
        </button>
      </div>
    </header>
  );
}
