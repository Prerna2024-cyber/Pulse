import { useCallback, useEffect, useState } from 'react';
import { getWatchlist, addTicker, removeTicker, peekDiff, getTrending } from '../../api.js';
import { currencyForMarket } from '../../currency.js';
import { greeting } from '../../greeting.js';
import { watchlistSummary, movementPhrase, stockCountPhrase } from '../../watchlistSummary.js';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import StatCards from './StatCards.jsx';
import WhatChangedPanel from './WhatChangedPanel.jsx';
import SectorBrowser from './SectorBrowser.jsx';
import WatchlistTable from './WatchlistTable.jsx';
import TrendingSection from '../TrendingSection.jsx';
import WhatChangedView from '../WhatChangedView.jsx';

// The signed-in app, laid out to the mockup: sidebar, top bar, and a main
// column with a right rail.
//
// One state owner for the watchlist, shared by the table, the sector browser,
// trending and the stat cards, so adding a stock anywhere updates everything
// at once instead of leaving one surface a step behind.
export default function DashboardScreen({
  user,
  switchingMarket,
  onMarketChange,
  onSwitchUser,
}) {
  const { username, preferredMarket: market } = user;
  const currency = currencyForMarket(market);

  const [view, setView] = useState('home');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [removingTicker, setRemovingTicker] = useState(null);
  const [listVersion, setListVersion] = useState(0);
  const [diff, setDiff] = useState(null);
  const [diffError, setDiffError] = useState(null);
  const [mostWatched, setMostWatched] = useState(null);

  const refresh = useCallback(() => {
    setError(null);
    return getWatchlist(username)
      .then(setItems)
      .catch((err) => setError(err.message));
  }, [username]);

  // market is a dependency throughout: every one of these endpoints scopes by
  // it server-side, so switching India/US has to refetch rather than leave the
  // previous market's data on screen.
  useEffect(() => {
    refresh();
  }, [refresh, market]);

  useEffect(() => {
    let cancelled = false;
    setDiff(null);
    setDiffError(null);
    // Peek, not the consuming read — see WhatChangedPanel.
    peekDiff(username)
      .then((data) => !cancelled && setDiff(data))
      .catch((err) => !cancelled && setDiffError(err.message));
    return () => {
      cancelled = true;
    };
  }, [username, market, listVersion]);

  useEffect(() => {
    let cancelled = false;
    getTrending(username)
      .then((rows) => !cancelled && setMostWatched(rows[0] ?? null))
      .catch(() => !cancelled && setMostWatched(null));
    return () => {
      cancelled = true;
    };
  }, [username, market, listVersion]);

  async function handleAdd(ticker) {
    await addTicker(username, ticker);
    await refresh();
    setListVersion((v) => v + 1);
  }

  async function handleRemove(ticker) {
    setRemovingTicker(ticker);
    try {
      await removeTicker(username, ticker);
      await refresh();
      setListVersion((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingTicker(null);
    }
  }

  const watchlistTickers = new Set((items || []).map((i) => i.ticker));
  const summary = items ? watchlistSummary(items) : null;
  const movement = summary ? movementPhrase(summary) : null;
  const unseenCount = diff ? diff.changes.filter((c) => c.isMeaningful).length : 0;

  return (
    <div className="dash">
      <Sidebar view={view} onNavigate={setView} unseenCount={unseenCount} />

      <div className="dash-body">
        <TopBar
          username={username}
          market={market}
          switchingMarket={switchingMarket}
          watchlistTickers={watchlistTickers}
          onAdd={handleAdd}
          onMarketChange={onMarketChange}
          onSwitchUser={onSwitchUser}
        />

        <main className="dash-main">
          <div className="dash-greeting">
            <h1 className="dash-greeting-title">
              {greeting()}, {username} <span aria-hidden="true">👋</span>
            </h1>
            <p className="dash-greeting-sub muted">
              {summary ? stockCountPhrase(summary.count) : 'Loading your watchlist…'}
              {movement && ` · ${movement}`}
            </p>
          </div>

          {view === 'home' && (
            <div className="dash-grid">
              <div className="dash-col-main">
                <StatCards summary={summary} mostWatched={mostWatched} />

                <WhatChangedPanel
                  data={diff}
                  error={diffError}
                  onViewAll={() => setView('changed')}
                />

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2 className="panel-title">Explore by sector</h2>
                      <p className="panel-sub">Find companies by sector and add them to your watchlist.</p>
                    </div>
                    <button className="link-button" onClick={() => setView('sectors')}>
                      View all sectors <span aria-hidden="true">→</span>
                    </button>
                  </div>
                  <SectorBrowser
                    username={username}
                    market={market}
                    watchlistTickers={watchlistTickers}
                    onAdd={handleAdd}
                    limit={8}
                  />
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2 className="panel-title">Your watchlist</h2>
                      <p className="panel-sub">Track the stocks you care about.</p>
                    </div>
                  </div>
                  <WatchlistTable
                    items={items}
                    currency={currency}
                    error={error}
                    removingTicker={removingTicker}
                    onRemove={handleRemove}
                  />
                </section>
              </div>

              <div className="dash-col-rail">
                <TrendingSection
                  username={username}
                  market={market}
                  watchlistTickers={watchlistTickers}
                  onAdd={handleAdd}
                  reloadKey={listVersion}
                />
              </div>
            </div>
          )}

          {view === 'watchlist' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">Your watchlist</h2>
                  <p className="panel-sub">Track the stocks you care about.</p>
                </div>
              </div>
              <WatchlistTable
                items={items}
                currency={currency}
                error={error}
                removingTicker={removingTicker}
                onRemove={handleRemove}
              />
            </section>
          )}

          {view === 'sectors' && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">Browse by sector</h2>
                  <p className="panel-sub">
                    Every sector in your market, counted from the ticker catalog.
                  </p>
                </div>
              </div>
              <SectorBrowser
                username={username}
                market={market}
                watchlistTickers={watchlistTickers}
                onAdd={handleAdd}
              />
            </section>
          )}

          {/* The full view still uses the consuming read, so opening it is
              what marks these changes as seen — the dashboard only peeked. */}
          {view === 'changed' && <WhatChangedView username={username} currency={currency} />}
        </main>
      </div>
    </div>
  );
}
