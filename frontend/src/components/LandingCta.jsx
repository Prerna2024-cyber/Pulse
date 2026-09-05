import Reveal from './Reveal.jsx';

// The closing band from the mockup. "Get started for free" loses the "for
// free" — there's no paid tier for it to contrast with, so free isn't a
// feature, it's just the only thing there is.
export default function LandingCta({ onGetStarted }) {
  return (
    <section className="landing-section landing-cta-band">
      <div className="landing-section-inner">
        <Reveal className="cta-panel">
          <p className="eyebrow">Ready to get started?</p>
          <h2 className="cta-heading">Find your market rhythm</h2>
          <p className="cta-sub">
            Create your watchlist and stay in sync with every movement that matters.
          </p>
          <button className="btn-dark btn-pill cta-button" onClick={onGetStarted}>
            Get started <span aria-hidden="true">→</span>
          </button>
        </Reveal>
      </div>
    </section>
  );
}
