import { useEffect, useRef, useState } from 'react';
import { searchTickers } from '../api.js';

// Beginners search by company name, not ticker symbol (the backend only
// matches company_name, by design — see schema.sql query #1).
//
// The result list is an overlay, not part of the flow: in the dashboard top
// bar an in-flow list pushes the greeting, stat cards and What Changed panel
// down the page as soon as it appears. It also renders only while there's a
// query, so an empty box can never show a list at all.
export default function SearchBar({ username, watchlistTickers, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingTicker, setAddingTicker] = useState(null);
  const [addError, setAddError] = useState(null);
  // Tickers added during this search session. watchlistTickers alone would do
  // it, but this keeps the row saying "Added" the instant the request
  // succeeds, independent of when the parent's refresh lands.
  const [addedTickers, setAddedTickers] = useState(() => new Set());
  const containerRef = useRef(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchTickers(username, trimmedQuery)
        .then((rows) => {
          setResults(rows);
          setError(null);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmedQuery, username]);

  // Dismiss the overlay on Escape or a click elsewhere, the way a dropdown is
  // expected to behave — otherwise it sits over the page until the box is
  // cleared by hand.
  useEffect(() => {
    if (!trimmedQuery) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setQuery('');
    };
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setQuery('');
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [trimmedQuery]);

  async function handleAdd(ticker) {
    setAddingTicker(ticker);
    setAddError(null);
    try {
      await onAdd(ticker);
      setAddedTickers((prev) => new Set(prev).add(ticker));
    } catch (err) {
      // Without this the promise rejected into nothing and a failed add looked
      // exactly like a successful one: the button reset and the row sat there.
      setAddError(`Couldn't add ${ticker} — ${err.message}`);
    } finally {
      setAddingTicker(null);
    }
  }

  const open = Boolean(trimmedQuery);

  return (
    <div className="search-bar" ref={containerRef}>
      <input
        type="search"
        inputMode="search"
        placeholder="Search a company, e.g. Reliance"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search for a company to add to your watchlist"
      />

      {open && (
        <div className="search-overlay">
          {loading && <p className="search-note muted small">Searching…</p>}
          {error && <p className="search-note error-text small">{error}</p>}
          {addError && (
            <p className="search-note error-text small" role="alert">
              {addError}
            </p>
          )}

          {!loading && results.length === 0 && !error && (
            <p className="search-note muted small">
              No matches for "{trimmedQuery}". Try the full company name.
            </p>
          )}

          {results.length > 0 && (
            <ul className="search-results">
              {results.map((r) => {
                const added = addedTickers.has(r.ticker) || watchlistTickers.has(r.ticker);
                return (
                  <li key={r.ticker} className="search-result-row">
                    <span>
                      <strong>{r.companyName}</strong>
                      <span className="muted small">
                        {' · '}
                        {r.ticker}
                        {r.sector ? ` · ${r.sector}` : ''}
                      </span>
                    </span>
                    <button
                      className={`btn btn-small${added ? ' btn-added' : ''}`}
                      onClick={() => handleAdd(r.ticker)}
                      disabled={added || addingTicker === r.ticker}
                    >
                      {added ? '✓ Added' : addingTicker === r.ticker ? 'Adding…' : 'Add'}
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
