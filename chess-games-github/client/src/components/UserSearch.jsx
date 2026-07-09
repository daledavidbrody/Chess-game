import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function UserSearch({ onSelect, selectedUser, disabled = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (disabled || query.trim().length < 1) {
      setResults([]);
      setSearched(false);
      setError('');
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const users = await api.searchUsers(query.trim());
        setResults(users);
        setSearched(true);
      } catch (err) {
        setResults([]);
        setSearched(true);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, disabled]);

  return (
    <div className="user-search">
      <label>
        Friend&apos;s username or player code
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedUser) onSelect(null);
          }}
          placeholder="e.g. alex or KMRXP"
          disabled={disabled}
        />
      </label>
      {disabled && (
        <p className="hint">Log in or sign up above to search for friends.</p>
      )}
      {loading && <p className="hint">Searching…</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && searched && results.length === 0 && !error && (
        <p className="hint">No players found. Try a different username or ID.</p>
      )}
      {!loading && results.length > 0 && (
        <ul className="search-results">
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className={`search-result ${selectedUser?.id === user.id ? 'is-selected' : ''}`}
                onClick={() => onSelect(user)}
              >
                <strong>{user.username}</strong>
                <span>{user.playerCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedUser && (
        <div className="invite-target">
          <strong>{selectedUser.username}</strong>
          <span>{selectedUser.playerCode}</span>
        </div>
      )}
    </div>
  );
}
