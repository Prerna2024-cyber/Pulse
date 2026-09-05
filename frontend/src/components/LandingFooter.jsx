import PulseLogo from './PulseLogo.jsx';

const REPO_URL = 'https://github.com/Prerna2024-cyber/Pulse';

// The mockup's footer had a Company column (About, Blog, Careers, Contact), a
// Legal column (Privacy Policy, Terms of Service, Disclaimer) and four social
// icons. None of those exist: there's no company, no policies, and no accounts
// on X, LinkedIn or YouTube. Inventing them would dress a hackathon project up
// as a registered service, so what's left is the two real sections, the
// exchanges Pulse covers, and the repo.
//
// Exchange names stay plain text rather than links — pointing them at the real
// exchanges would imply an affiliation that doesn't exist.
export default function LandingFooter({ onGetStarted }) {
  return (
    <footer className="landing-footer">
      <div className="landing-section-inner">
        <div className="footer-columns">
          <div className="footer-brand">
            <PulseLogo animate={false} />
            <p className="footer-tagline">Know what actually changed, not just what moved.</p>
            <a className="footer-social" href={REPO_URL} target="_blank" rel="noreferrer">
              <span aria-hidden="true">↗</span> GitHub
            </a>
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
              <li className="footer-plain-item">React · Node · Postgres</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Pulse</p>
          <p>Built for the Groww Code 2026 hackathon.</p>
        </div>
      </div>
    </footer>
  );
}
