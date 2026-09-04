import { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(trimmed);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen screen-center">
      <div className="brand">
        <h1>Pulse</h1>
        <p className="muted">Your watchlist, minus the noise.</p>
      </div>
      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="username">Pick a username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. prerna"
          autoFocus
          autoComplete="username"
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting || !username.trim()}>
          {submitting ? 'Continuing…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
