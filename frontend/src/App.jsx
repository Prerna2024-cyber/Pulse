import { useEffect, useState } from 'react';
import * as api from './api.js';
import LandingScreen from './components/LandingScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import OnboardingScreen from './components/OnboardingScreen.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import DashboardScreen from './components/dash/DashboardScreen.jsx';

const STORAGE_KEY = 'pulse.username';

// localStorage doesn't merely return null when it's unavailable — it throws.
// Safari private mode, blocked site data and some embedded webviews all do it,
// and an unguarded read in the useState initializer below would take the whole
// app down on its first render, with no error boundary underneath to catch it.
// Staying signed in is a convenience; losing it should cost a re-login, not
// the entire screen.
function readStoredUsername() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeUsername(username) {
  try {
    localStorage.setItem(STORAGE_KEY, username);
  } catch {
    // The session won't survive a reload, which is the right thing to lose.
  }
}

function clearStoredUsername() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // If the write failed earlier there is nothing here to clear anyway.
  }
}

export default function App() {
  const [user, setUser] = useState(null); // { username, preferredMarket }
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [bootError, setBootError] = useState(null);
  const [switchingMarket, setSwitchingMarket] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Seeded synchronously from localStorage so the very first render already
  // knows a returning user is being signed in — otherwise the landing screen
  // paints for a frame and then vanishes on every reload.
  const [booting, setBooting] = useState(() => Boolean(readStoredUsername()));

  useEffect(() => {
    const saved = readStoredUsername();
    if (saved) {
      api
        .login(saved)
        .then(handleLoginResult)
        .catch((err) => setBootError(err.message))
        .finally(() => setBooting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLoginResult(result) {
    storeUsername(result.username);
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
    clearStoredUsername();
    setUser(null);
    setNeedsOnboarding(false);
    // Back to the landing screen, not straight to the form: it costs a
    // returning user one extra click, but it makes the whole flow demoable
    // from the front door without having to clear localStorage first.
    setShowLogin(false);
  }

  if (booting) {
    return <StatusMessage icon="⏳" title="Signing you back in…" />;
  }
  if (bootError && !user) {
    return <StatusMessage icon="⚠️" tone="error" title="Couldn't reach Pulse" hint={bootError} />;
  }
  if (!user) {
    return showLogin ? (
      <LoginScreen onLogin={handleLogin} />
    ) : (
      <LandingScreen onGetStarted={() => setShowLogin(true)} />
    );
  }
  if (needsOnboarding) {
    return <OnboardingScreen username={user.username} onPick={handleOnboardingPick} />;
  }

  return (
    <DashboardScreen
      user={user}
      switchingMarket={switchingMarket}
      onMarketChange={handleMarketSwitch}
      onSwitchUser={handleSwitchUser}
    />
  );
}
