import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function IncomingChallenges() {
  const { user, socket } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await api.pendingChallenges();
      setChallenges(rows);
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    const onReceived = () => load();
    const onDeclined = () => load();

    socket.on('challenge:received', onReceived);
    socket.on('challenge:declined', onDeclined);
    socket.on('game:started', onReceived);

    return () => {
      socket.off('challenge:received', onReceived);
      socket.off('challenge:declined', onDeclined);
      socket.off('game:started', onReceived);
    };
  }, [socket, load]);

  if (!user || challenges.length === 0) {
    return null;
  }

  async function accept(id) {
    setError('');
    try {
      await api.acceptChallenge(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function decline(id) {
    setError('');
    try {
      await api.declineChallenge(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <h2>Challenges</h2>
      {error && <p className="form-error">{error}</p>}
      <ul className="challenge-list">
        {challenges.map((challenge) => {
          const incoming = challenge.challengedId === user.id;
          const label = incoming
            ? `${challenge.challengerName} challenged you`
            : `Waiting for ${challenge.challengedName}`;
          const timeLabel =
            challenge.baseMinutes === 0
              ? 'Unlimited'
              : challenge.incrementSeconds > 0
                ? `${challenge.baseMinutes}+${challenge.incrementSeconds}`
                : `${challenge.baseMinutes} min`;

          return (
            <li key={challenge.id} className="challenge-item">
              <div>
                <strong>{label}</strong>
                <span>{timeLabel}</span>
              </div>
              {incoming ? (
                <div className="challenge-actions">
                  <button type="button" className="chip is-selected" onClick={() => accept(challenge.id)}>
                    Accept
                  </button>
                  <button type="button" className="chip" onClick={() => decline(challenge.id)}>
                    Decline
                  </button>
                </div>
              ) : (
                <span className="hint">Pending…</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
