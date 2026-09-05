import { useCallback, useEffect, useState } from 'react';
import { getSectors, getTickersBySector } from '../../api.js';

// Sector browse — the one feature that had a backing route all along
// (GET /tickers?sector=) and no way to reach it. The tiles now count real
// rows: every "24 stocks" comes from a GROUP BY over the catalog, scoped to
// the user's market, not from the mockup's invented figures.
//
// A tile expands its companies inline rather than routing away, so adding a
// stock from a sector is one click from where you found it.
const TILE_STYLES = ['blue', 'rose', 'green', 'amber', 'violet', 'orange', 'slate', 'teal'];

export default function SectorBrowser({ username, market, watchlistTickers, onAdd, limit }) {
  const [sectors, setSectors] = useState(null);
  const [error, setError] = useState(null);
  const [openSector, setOpenSector] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [addingTicker, setAddingTicker] = useState(null);

  const loadSectors = useCallback(() => {
    setError(null);
    return getSectors(username)
      .then(setSectors)
      .catch((err) => setError(err.message));
  }, [username]);

  // market is a dependency because the endpoint scopes by it — an India user
  // and a US user see different sectors and different counts.
  useEffect(() => {
    setOpenSector(null);
    setCompanies(null);
    loadSectors();
  }, [loadSectors, market]);

  async function toggleSector(sector) {
    if (openSector === sector) {
      setOpenSector(null);
      setCompanies(null);
      return;
    }
    setOpenSector(sector);
    setCompanies(null);
    try {
      setCompanies(await getTickersBySector(username, sector));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAdd(ticker) {
    setAddingTicker(ticker);
    try {
      await onAdd(ticker);
    } finally {
      setAddingTicker(null);
    }
  }

  if (error) return <p className="panel-empty error-text">Couldn't load sectors — {error}</p>;
  if (!sectors) return <p className="panel-empty muted">Loading sectors…</p>;
  if (sectors.length === 0) return null;

  const shown = limit ? sectors.slice(0, limit) : sectors;

  return (
    <div className="sector-browser">
      <ul className="sector-tiles">
        {shown.map((sector, index) => {
          const open = openSector === sector.sector;
          return (
            <li key={sector.sector}>
              <button
                className={`sector-tile sector-tile-${TILE_STYLES[index % TILE_STYLES.length]}${
                  open ? ' sector-tile-open' : ''
                }`}
                onClick={() => toggleSector(sector.sector)}
                aria-expanded={open}
              >
                <span className="sector-tile-name">{sector.sector}</span>
                <span className="sector-tile-count">
                  {sector.tickerCount} {sector.tickerCount === 1 ? 'stock' : 'stocks'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {openSector && (
        <div className="sector-results">
          <p className="sector-results-head">
            <strong>{openSector}</strong>{' '}
            <span className="muted small">
              {companies ? `${companies.length} companies` : 'loading…'}
            </span>
          </p>

          {companies && (
            <ul className="sector-company-list">
              {companies.map((company) => {
                const alreadyWatching = watchlistTickers.has(company.ticker);
                return (
                  <li key={company.ticker} className="sector-company">
                    <span>
                      <strong>{company.companyName}</strong>
                      <span className="muted small"> · {company.ticker}</span>
                    </span>
                    <button
                      className="btn btn-small"
                      onClick={() => handleAdd(company.ticker)}
                      disabled={alreadyWatching || addingTicker === company.ticker}
                    >
                      {alreadyWatching ? 'Added' : addingTicker === company.ticker ? 'Adding…' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
