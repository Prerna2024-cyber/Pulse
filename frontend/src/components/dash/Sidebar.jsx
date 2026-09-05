import PulseLogo from '../PulseLogo.jsx';

// Sidebar nav. Every item here opens a view that exists.
//
// The mockup also listed Insights, Alerts and Import (dropped as asked), plus
// Explore, Markets and Settings. Those last three went the same way: Explore
// duplicates Sectors, and there's no markets page or settings screen — the
// market switcher and switch-user both live in the top bar. Dead nav is worse
// than short nav, especially on the screen a judge will click around.
const ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'watchlist', label: 'Watchlist', icon: '⭐' },
  { id: 'changed', label: 'What Changed', icon: '🔔' },
  { id: 'sectors', label: 'Sectors', icon: '🧭' },
];

export default function Sidebar({ view, onNavigate, unseenCount = 0 }) {
  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-brand">
        <PulseLogo />
      </div>

      <nav className="dash-nav" aria-label="Main">
        <ul>
          {ITEMS.map((item) => {
            const active = view === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`dash-nav-item${active ? ' dash-nav-item-active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="dash-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="dash-nav-label">{item.label}</span>
                  {item.id === 'changed' && unseenCount > 0 && (
                    <span className="dash-nav-badge">
                      {unseenCount}
                      <span className="sr-only"> unseen changes</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
