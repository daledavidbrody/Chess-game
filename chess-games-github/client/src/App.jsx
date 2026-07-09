import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppHeader from './components/AppHeader';
import ChessGame from './components/ChessGame';
import GameSetup from './components/GameSetup';
import HomePage from './components/HomePage';

function AppContent() {
  const { socket } = useAuth();
  const [view, setView] = useState('home');
  const [activeGame, setActiveGame] = useState(null);
  const [challengeFriend, setChallengeFriend] = useState(null);

  useEffect(() => {
    if (!socket) return;

    function onGameStarted(payload) {
      setActiveGame({
        mode: 'online',
        gameId: payload.gameId,
        playerColor: payload.color,
        opponentName: payload.opponentName,
        timeControl: payload.timeControl,
        clock: {
          baseMs: payload.whiteMs,
          incrementMs: payload.incrementMs,
          unlimited: payload.unlimited,
        },
        initialFen: payload.fen,
        initialWhiteMs: payload.whiteMs,
        initialBlackMs: payload.blackMs,
      });
      setView('play');
    }

    socket.on('game:started', onGameStarted);
    return () => socket.off('game:started', onGameStarted);
  }, [socket]);

  function handlePlayFriend(friend) {
    setChallengeFriend(friend);
    setView('play');
  }

  if (activeGame) {
    return (
      <div className="app-shell">
        <AppHeader onLoginClick={() => { setActiveGame(null); setView('home'); }} showNav={false} />
        <ChessGame
          config={activeGame}
          onBack={() => {
            setActiveGame(null);
            setView('home');
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        current={view}
        onNavigate={setView}
        onLoginClick={() => setView('home')}
      />

      {view === 'home' ? (
        <HomePage onPlayFriend={handlePlayFriend} />
      ) : (
        <GameSetup
          onStart={setActiveGame}
          preselectedFriend={challengeFriend}
          onPreselectedFriendUsed={() => setChallengeFriend(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
