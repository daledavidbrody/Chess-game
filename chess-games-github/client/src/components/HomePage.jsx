import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AuthForm from './AuthForm';
import UserSearch from './UserSearch';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function OutcomeBadge({ outcome }) {
  const label = outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Loss' : 'Draw';
  return <span className={`outcome outcome--${outcome}`}>{label}</span>;
}

export default function HomePage({ onPlayFriend }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendMessage, setFriendMessage] = useState('');
  const [friendError, setFriendError] = useState('');

  const loadHome = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const home = await api.getHome();
      setData(home);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  async function handleAddFriend() {
    if (!selectedFriend) {
      setFriendError('Search and select a player to add.');
      return;
    }

    setFriendError('');
    setFriendMessage('');
    try {
      await api.addFriend(selectedFriend.id);
      setFriendMessage(`${selectedFriend.username} added to your friends.`);
      setSelectedFriend(null);
      await loadHome();
    } catch (err) {
      setFriendError(err.message);
    }
  }

  if (!user) {
    return (
      <div className="home">
        <header className="home__hero panel">
          <p className="eyebrow">Chess Games</p>
          <h1>Your chess home</h1>
          <p className="lede">
            Sign in to see friends, recent games, results, and stats for every time control.
          </p>
        </header>
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="home">
      <header className="home__hero">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>{user.username}</h1>
          <p className="lede">Friends, recent games, and your record by time control.</p>
        </div>
      </header>

      {loading && <p className="hint panel">Loading your home…</p>}
      {error && <p className="form-error panel">{error}</p>}

      {data && (
        <>
          <section className="panel stats-overview">
            <h2>Overall record</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <strong>{data.totals.played}</strong>
                <span>Games</span>
              </div>
              <div className="stat-card">
                <strong>{data.totals.wins}</strong>
                <span>Wins</span>
              </div>
              <div className="stat-card">
                <strong>{data.totals.losses}</strong>
                <span>Losses</span>
              </div>
              <div className="stat-card">
                <strong>{data.totals.draws}</strong>
                <span>Draws</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Friends</h2>
            {data.friends.length === 0 ? (
              <p className="hint">No friends yet. Add someone below or play an online game.</p>
            ) : (
              <ul className="friends-list">
                {data.friends.map((friend) => (
                  <li key={friend.id} className="friend-card">
                    <div>
                      <strong>{friend.username}</strong>
                      <span>{friend.playerCode}</span>
                    </div>
                    {onPlayFriend && (
                      <button
                        type="button"
                        className="chip"
                        onClick={() => onPlayFriend(friend)}
                      >
                        Challenge
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="add-friend">
              <h3 className="subsection">Add a friend</h3>
              <UserSearch selectedUser={selectedFriend} onSelect={setSelectedFriend} />
              {friendError && <p className="form-error">{friendError}</p>}
              {friendMessage && <p className="success-message">{friendMessage}</p>}
              <button
                type="button"
                className="ghost-button"
                onClick={handleAddFriend}
                disabled={!selectedFriend}
              >
                Add friend
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Recent games</h2>
            {data.recentGames.length === 0 ? (
              <p className="hint">No finished games yet. Head to Play to start a match.</p>
            ) : (
              <ul className="history-list">
                {data.recentGames.map((game) => (
                  <li key={game.id} className="history-item">
                    <div>
                      <strong>vs {game.opponentName}</strong>
                      <span>{game.timeControl}</span>
                    </div>
                    <div className="history-item__meta">
                      <OutcomeBadge outcome={game.outcome} />
                      <span>{formatDate(game.playedAt)}</span>
                    </div>
                    <p className="hint history-item__result">{game.result}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Stats by time control</h2>
            {data.statsByTimeControl.length === 0 ? (
              <p className="hint">Play some rated online games to build stats here.</p>
            ) : (
              <div className="stats-table-wrap">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Time control</th>
                      <th>Played</th>
                      <th>Wins</th>
                      <th>Losses</th>
                      <th>Draws</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.statsByTimeControl.map((stat) => (
                      <tr key={stat.key}>
                        <td>{stat.label}</td>
                        <td>{stat.played}</td>
                        <td>{stat.wins}</td>
                        <td>{stat.losses}</td>
                        <td>{stat.draws}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
