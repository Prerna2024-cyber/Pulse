// The intraday line itself. Hand-rolled SVG rather than a charting library:
// this draws one series with no tooltips, legend or zoom, which is a polyline
// and two axis labels — not worth ~95KB of recharts and its d3 dependencies in
// a bundle whose only runtime deps today are React and framer-motion.
//
// The SVG holds only the plot, in a normalized 0–100 space stretched to fit by
// preserveAspectRatio="none". That keeps the scaling maths trivial and lets
// the chart fill any width, at the cost of distorting anything inside it —
// which is why the stroke carries vector-effect="non-scaling-stroke" and why
// every label is HTML positioned around the SVG rather than <text> within it.

// Drawn top-down, so a price at the domain's high sits at y=0.
const scaleX = (t, domain) => ((t - domain.start) / domain.spanMs) * 100;
const scaleY = (price, domain) => 100 - ((price - domain.lo) / (domain.hi - domain.lo)) * 100;

export default function PriceChart({ series, tone, ariaLabel }) {
  const { points, domain } = series;

  const coords = points.map((p) => [scaleX(p.t, domain), scaleY(p.price, domain)]);
  const pair = ([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const line = coords.map(pair).join(' ');

  // The fill is closed down to the baseline rather than to y=100, so it hangs
  // from the line to the opening price instead of implying the axis starts at
  // zero — the domain is clipped to the session's own range, and a fill to the
  // floor would read as "this is the whole scale".
  const openY = scaleY(points[0].price, domain);
  const firstX = coords[0][0];
  const lastX = coords[coords.length - 1][0];
  const area = [
    `M ${pair([firstX, openY])}`,
    ...coords.map((c) => `L ${pair(c)}`),
    `L ${pair([lastX, openY])}`,
    'Z',
  ].join(' ');

  return (
    <div className="price-chart">
      <svg
        className={`price-chart-svg price-chart-${tone}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        {/* The opening price, so the line's position above or below it is
            readable at a glance without reading the axis. */}
        <line
          className="price-chart-baseline"
          x1="0"
          y1={openY}
          x2="100"
          y2={openY}
          vectorEffect="non-scaling-stroke"
        />
        <path className="price-chart-area" d={area} />
        <polyline
          className="price-chart-line"
          points={line}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Outside the SVG on purpose — inside, preserveAspectRatio="none" would
          stretch the glyphs. */}
      <span className="price-chart-hi" aria-hidden="true">
        {domain.hi.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <span className="price-chart-lo" aria-hidden="true">
        {domain.lo.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
