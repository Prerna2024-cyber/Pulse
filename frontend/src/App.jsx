import { useEffect, useState } from 'react';
import * as api from './api.js';
import LoginScreen from './components/LoginScreen.jsx';
import OnboardingScreen from './components/OnboardingScreen.jsx';
import WatchlistView from './components/WatchlistView.jsx';
import WhatChangedView from './components/WhatChangedView.jsx';
import StatusMessage from './components/StatusMessage.jsx';

const STORAGE_KEY = 'pulse.username';
const CURRENCY_BY_MARKET = { India: '₹', US: '$' };

export default function App() {
  const [user, setUser] = useState(null); // { username, preferredMarket }
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [tab, setTab] = useState('watchlist');
  const [bootError, setBootError] = useState(null);
  const [switchingMarket, setSwitchingMarket] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      api.login(saved).then(handleLoginResult).catch((err) => setBootError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoginResult(result) {
    localStorage.setItem(STORAGE_KEY, result.username);
    setUser({ username: result.username, preferredMarket: result.preferredMarket });
    setNeedsOnboarding(result.isNewUser);
  }

  async function handleLogin(username) {
    const result = await api.login(username);
    handleLoginResult(result);
  }

  async function handleOnboardingPick(market) {
    const result = await api.setMarket(user.username, market);
    setUser({ username: result.username, preferredMarket: result.preferredMarket });
    setNeedsOnboarding(false);
  }

  async function handleMarketSwitch(market) {
    setSwitchingMarket(true);
    try {
      const result = await api.setMarket(user.username, market);
      setUser({ username: result.username, preferredMarket: result.preferredMarket });
    } finally {
      setSwitchingMarket(false);
    }
  }

  function handleSwitchUser() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setNeedsOnboarding(false);
    setTab('watchlist');
  }

  if (bootError && !user) {
    return <StatusMessage icon="⚠️" tone="error" title="Couldn't reach Pulse" hint={bootError} />;
  }
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  if (needsOnboarding) {
    return <OnboardingScreen username={user.username} onPick={handleOnboardingPick} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Pulse</span>
        <div className="header-actions">
          <select
            value={user.preferredMarket}
            onChange={(e) => handleMarketSwitch(e.target.value)}
            disabled={switchingMarket}
            aria-label="Switch market"
          >
            <option value="India">🇮🇳 India</option>
            <option value="US">🇺🇸 US</option>
          </select>
          <button className="btn btn-text" onClick={handleSwitchUser}>
            {user.username} · switch
          </button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'watchlist' ? (
          <WatchlistView username={user.username} currency={CURRENCY_BY_MARKET[user.preferredMarket]} />
        ) : (
          <WhatChangedView username={user.username} />
        )}
      </main>

      <nav className="tab-bar">
        <button className={`tab ${tab === 'watchlist' ? 'tab-active' : ''}`} onClick={() => setTab('watchlist')}>
          <span aria-hidden="true">📋</span>
          <span>Watchlist</span>
        </button>
        <button className={`tab ${tab === 'changed' ? 'tab-active' : ''}`} onClick={() => setTab('changed')}>
          <span aria-hidden="true">🔔</span>
          <span>What Changed</span>
        </button>
      </nav>
    </div>
  );
}
