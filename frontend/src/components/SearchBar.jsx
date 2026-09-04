import { useEffect, useState } from 'react';
import { searchTickers } from '../api.js';

// Beginners search by company name, not ticker symbol (the backend only
// matches company_name, by design — see schema.sql query #1).
export default function SearchBar({ username, watchlistTickers, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingTicker, setAddingTicker] = useState(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      searchTickers(username, trimmed)
        .then((rows) => {
          setResults(rows);
          setError(null);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, username]);

  async function handleAdd(ticker) {
    setAddingTicker(ticker);
    try {
      await onAdd(ticker);
    } finally {
      setAddingTicker(null);
    }
  }

  return (
    <div className="search-bar">
      <input
        type="search"
        inputMode="search"
        placeholder="Search a company, e.g. Reliance"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search for a company to add to your watchlist"
      />
      {loading && <p className="muted small">Searching…</p>}
      {error && <p className="error-text small">{error}</p>}
      {!loading && query.trim() && results.length === 0 && !error && (
        <p className="muted small">No matches for "{query.trim()}". Try the full company name.</p>
      )}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => {
            const alreadyWatching = watchlistTickers.has(r.ticker);
            return (
              <li key={r.ticker} className="search-result-row">
                <span>
                  <strong>{r.companyName}</strong>
                  <span className="muted small"> · {r.ticker}{r.sector ? ` · ${r.sector}` : ''}</span>
                </span>
                <button
                  className="btn btn-small"
                  onClick={() => handleAdd(r.ticker)}
                  disabled={alreadyWatching || addingTicker === r.ticker}
                >
                  {alreadyWatching ? 'Added' : addingTicker === r.ticker ? 'Adding…' : 'Add'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
