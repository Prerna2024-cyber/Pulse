import SearchBar from '../SearchBar.jsx';

// Top bar: the global company search from the mockup, the market switcher and
// the account control.
//
// The mockup's notification bell is gone — there's no notification store, so
// a bell with a red dot would be a light that never means anything. Unseen
// changes are counted on the What Changed nav item instead, from real diff
// data.
export default function TopBar({
  username,
  market,
  switchingMarket,
  watchlistTickers,
  onAdd,
  onMarketChange,
  onSwitchUser,
}) {
  return (
    <header className="dash-topbar">
      <div className="dash-topbar-search">
        <SearchBar username={username} watchlistTickers={watchlistTickers} onAdd={onAdd} />
      </div>

      <div className="dash-topbar-actions">
        <label className="dash-market">
          <span className="sr-only">Switch market</span>
          <select
            value={market}
            onChange={(e) => onMarketChange(e.target.value)}
            disabled={switchingMarket}
          >
            <option value="India">🇮🇳 India</option>
            <option value="US">🇺🇸 US</option>
          </select>
        </label>

        <button className="dash-account" onClick={onSwitchUser}>
          <span className="dash-avatar" aria-hidden="true">
            {username.trim().charAt(0).toUpperCase()}
          </span>
          <span className="dash-account-name">{username}</span>
          <span className="dash-account-hint muted small">switch</span>
        </button>
      </div>
    </header>
  );
}
