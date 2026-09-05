const REPO_URL = 'https://github.com/Prerna2024-cyber/Pulse';

// Deliberately no legal or regulatory column: Pulse is a hackathon project,
// not a registered service, and inventing a privacy policy or an advisory
// disclaimer would be dressing it up as something it isn't. Every link here
// goes somewhere real — the two in-page sections, and the repo itself.
export default function LandingFooter({ onGetStarted }) {
  return (
    <footer className="landing-footer">
      <div className="landing-section-inner">
        <div className="footer-columns">
          <div className="footer-brand">
            <p className="landing-wordmark">
              <span className="landing-dot" aria-hidden="true" />
              Pulse
            </p>
            <p className="footer-tagline muted">
              Know what actually changed, not just what moved.
            </p>
          </div>

          <div className="footer-column">
            <h3 className="footer-heading">Product</h3>
            <ul className="footer-list">
              <li>
                <a href="#features">What it does</a>
              </li>
              <li>
                <a href="#preview">Preview</a>
              </li>
              <li>
                <button className="footer-link-button" onClick={onGetStarted}>
                  Get started
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-heading">Markets</h3>
            {/* Plain text, not links: these are the exchanges Pulse covers,
                and pointing them at the real exchanges would imply an
                affiliation that doesn't exist. */}
            <ul className="footer-list footer-list-plain">
              <li>NSE — India</li>
              <li>BSE — India</li>
              <li>NASDAQ — US</li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-heading">Project</h3>
            <ul className="footer-list">
              <li>
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  Source on GitHub
                </a>
              </li>
              <li className="muted">React · Node · Postgres</li>
            </ul>
          </div>
        </div>

        <p className="footer-bottom muted small">Built for the Groww Code 2026 hackathon.</p>
      </div>
    </footer>
  );
}
