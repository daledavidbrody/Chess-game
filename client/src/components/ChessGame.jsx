import { Chess } from 'chess.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { formatClock, BOARD_COLORS } from '../constants';
import { engravedPieces } from './EngravedPieces';
import { useChessClock } from '../hooks/useChessClock';
import { getBotMove } from '../utils/botEngine';
import { useAuth } from '../context/AuthContext';

function resultMessage(game, flagColor) {
  if (flagColor) {
    const winner = flagColor === 'w' ? 'Black' : 'White';
    return `${winner} wins on time`;
  }
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    return `Checkmate — ${winner} wins`;
  }
  if (game.isStalemate()) return 'Draw by stalemate';
  if (game.isThreefoldRepetition()) return 'Draw by repetition';
  if (game.isInsufficientMaterial()) return 'Draw — insufficient material';
  if (game.isDraw()) return 'Draw';
  return null;
}

export default function ChessGame({ config, onBack }) {
  const { socket } = useAuth();
  const [game, setGame] = useState(() => new Chess(config.initialFen ?? undefined));
  const [gameOver, setGameOver] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const [moveFrom, setMoveFrom] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [onlineClock, setOnlineClock] = useState({
    whiteMs: config.initialWhiteMs ?? config.clock.baseMs,
    blackMs: config.initialBlackMs ?? config.clock.baseMs,
  });

  const {
    mode,
    botLevel,
    playerColor,
    timeControl,
    clock,
    gameId,
    opponentName,
  } = config;

  const isBotMode = mode === 'bot';
  const isOnlineMode = mode === 'online';
  const humanColor = isBotMode || isOnlineMode ? playerColor : null;
  const botColor = humanColor === 'w' ? 'b' : 'w';

  const activeColor = gameOver ? null : game.turn();

  const handleFlag = useCallback(
    (color) => {
      setGameOver(resultMessage(game, color));
    },
    [game]
  );

  const localClock = useChessClock({
    baseMs: clock.baseMs,
    incrementMs: clock.incrementMs,
    unlimited: clock.unlimited,
    activeColor: isOnlineMode ? null : activeColor,
    running: isOnlineMode ? false : !gameOver && !botThinking,
    onFlag: handleFlag,
  });

  useEffect(() => {
    if (!isOnlineMode) {
      localClock.reset();
    }
  }, [isOnlineMode, localClock]);

  useEffect(() => {
    if (!isOnlineMode || gameOver || clock.unlimited || !activeColor) return;

    const interval = setInterval(() => {
      setOnlineClock((current) => {
        if (activeColor === 'w') {
          const next = Math.max(0, current.whiteMs - 100);
          if (next === 0) {
            socket?.emit('game:flag', { gameId, color: 'w' });
            setGameOver('Black wins on time');
          }
          return { ...current, whiteMs: next };
        }
        const next = Math.max(0, current.blackMs - 100);
        if (next === 0) {
          socket?.emit('game:flag', { gameId, color: 'b' });
          setGameOver('White wins on time');
        }
        return { ...current, blackMs: next };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOnlineMode, gameOver, clock.unlimited, activeColor, socket, gameId]);

  useEffect(() => {
    if (!isOnlineMode || !socket || !gameId) return;

    socket.emit('game:join', { gameId });

    function onState(payload) {
      setGame(new Chess(payload.fen));
      setOnlineClock({ whiteMs: payload.whiteMs, blackMs: payload.blackMs });
      if (payload.status === 'finished') setGameOver(payload.result);
    }

    function onUpdate(payload) {
      setGame(new Chess(payload.fen));
      setOnlineClock({ whiteMs: payload.whiteMs, blackMs: payload.blackMs });
      setMoveFrom(null);
      setOptionSquares({});
      if (payload.status === 'finished') setGameOver(payload.result);
    }

    function onError(payload) {
      setGame(new Chess(config.initialFen ?? undefined));
    }

    socket.on('game:state', onState);
    socket.on('game:update', onUpdate);
    socket.on('game:error', onError);

    return () => {
      socket.off('game:state', onState);
      socket.off('game:update', onUpdate);
      socket.off('game:error', onError);
    };
  }, [isOnlineMode, socket, gameId, config.initialFen]);

  const whiteMs = isOnlineMode ? onlineClock.whiteMs : localClock.whiteMs;
  const blackMs = isOnlineMode ? onlineClock.blackMs : localClock.blackMs;

  const orientation =
    isBotMode || isOnlineMode
      ? humanColor === 'w'
        ? 'white'
        : 'black'
      : 'white';

  const statusText = useMemo(() => {
    if (gameOver) return gameOver;
    if (botThinking) return 'Bot is thinking…';
    if (isOnlineMode && game.turn() !== humanColor) return `Waiting for ${opponentName}…`;
    if (game.isCheck()) return `${game.turn() === 'w' ? 'White' : 'Black'} is in check`;
    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  }, [game, gameOver, botThinking, isOnlineMode, humanColor, opponentName]);

  const canHumanMove = useCallback(() => {
    if (gameOver || botThinking) return false;
    if (isOnlineMode) return game.turn() === humanColor;
    if (!isBotMode) return true;
    return game.turn() === humanColor;
  }, [gameOver, botThinking, isBotMode, isOnlineMode, game, humanColor]);

  const finishIfDone = useCallback((nextGame) => {
    const message = resultMessage(nextGame);
    if (message) setGameOver(message);
    return message;
  }, []);

  const submitMove = useCallback(
    (move) => {
      if (!canHumanMove()) return false;

      if (isOnlineMode) {
        socket.emit('game:move', { gameId, ...move });
        setMoveFrom(null);
        setOptionSquares({});
        return true;
      }

      const nextGame = new Chess(game.fen());
      const result = nextGame.move(move);
      if (!result) return false;

      localClock.addIncrement(result.color);
      setGame(nextGame);
      setMoveFrom(null);
      setOptionSquares({});
      finishIfDone(nextGame);
      return true;
    },
    [canHumanMove, isOnlineMode, socket, gameId, game, localClock, finishIfDone]
  );

  useEffect(() => {
    if (!isBotMode || gameOver || botThinking) return;
    if (game.turn() !== botColor) return;

    let cancelled = false;
    setBotThinking(true);

    (async () => {
      const legalMoves = game.moves({ verbose: true });
      const botMove = await getBotMove(game, botLevel, legalMoves);
      if (cancelled || !botMove) {
        setBotThinking(false);
        return;
      }

      const nextGame = new Chess(game.fen());
      const result = nextGame.move(botMove);
      if (result) {
        localClock.addIncrement(result.color);
        setGame(nextGame);
        finishIfDone(nextGame);
      }
      setBotThinking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isBotMode, game, gameOver, botThinking, botColor, botLevel, localClock, finishIfDone]);

  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true });
    if (!moves.length) {
      setOptionSquares({});
      return false;
    }

    const next = {};
    for (const move of moves) {
      next[move.to] = {
        background:
          game.get(move.to) && game.get(move.to).color !== game.get(square).color
            ? 'radial-gradient(circle, rgba(30, 80, 40, 0.22) 82%, rgba(200, 40, 40, 0.55) 83%)'
            : 'radial-gradient(circle, rgba(30, 80, 40, 0.5) 22%, transparent 23%)',
        borderRadius: '50%',
      };
    }
    next[square] = { background: 'rgba(255, 210, 60, 0.55)' };
    setOptionSquares(next);
    return true;
  }

  function onSquareClick(square) {
    if (!canHumanMove()) return;

    if (!moveFrom) {
      const piece = game.get(square);
      if (!piece || piece.color !== game.turn()) return;
      if ((isBotMode || isOnlineMode) && piece.color !== humanColor) return;
      setMoveFrom(square);
      getMoveOptions(square);
      return;
    }

    if (moveFrom === square) {
      setMoveFrom(null);
      setOptionSquares({});
      return;
    }

    const moved = submitMove({ from: moveFrom, to: square, promotion: 'q' });
    if (!moved) {
      const piece = game.get(square);
      if (
        piece &&
        piece.color === game.turn() &&
        (!isBotMode && !isOnlineMode ? true : piece.color === humanColor)
      ) {
        setMoveFrom(square);
        getMoveOptions(square);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  }

  function onPieceDrop(sourceSquare, targetSquare) {
    if (!canHumanMove()) return false;
    if ((isBotMode || isOnlineMode) && game.get(sourceSquare)?.color !== humanColor) return false;

    if (isOnlineMode) {
      return submitMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    }

    const nextGame = new Chess(game.fen());
    let result;
    try {
      result = nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
    } catch {
      return false;
    }

    if (!result) return false;
    localClock.addIncrement(result.color);
    setGame(nextGame);
    setMoveFrom(null);
    setOptionSquares({});
    finishIfDone(nextGame);
    return true;
  }

  function resetGame() {
    if (isOnlineMode) return;
    setGame(new Chess());
    setGameOver(null);
    setBotThinking(false);
    setMoveFrom(null);
    setOptionSquares({});
    localClock.reset();
  }

  const title =
    mode === 'local'
      ? 'Local game'
      : mode === 'bot'
        ? `vs ${botLevel.label} bot`
        : `vs ${opponentName}`;

  return (
    <div className="game">
      <header className="game__header">
        <button type="button" className="ghost-button" onClick={onBack}>
          ← Back
        </button>
        <div>
          <h1>{title}</h1>
          <p>{timeControl.label}</p>
        </div>
        {!isOnlineMode && (
          <button type="button" className="ghost-button" onClick={resetGame}>
            New game
          </button>
        )}
        {isOnlineMode && <div />}
      </header>

      <div className="game__layout">
        <aside className="sidebar">
          <div className={`clock ${activeColor === 'b' ? 'is-active' : ''}`}>
            <span>Black</span>
            <strong>{clock.unlimited ? '∞' : formatClock(blackMs)}</strong>
          </div>

          <div className="status-card">
            <p className="status-card__label">Status</p>
            <p className="status-card__value">{statusText}</p>
          </div>

          <div className="move-list">
            <h2>Moves</h2>
            <ol>
              {game.history().map((move, index) => (
                <li key={`${move}-${index}`}>{move}</li>
              ))}
            </ol>
          </div>

          <div className={`clock ${activeColor === 'w' ? 'is-active' : ''}`}>
            <span>White</span>
            <strong>{clock.unlimited ? '∞' : formatClock(whiteMs)}</strong>
          </div>
        </aside>

        <div className="board-wrap">
          <Chessboard
            position={game.fen()}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            boardOrientation={orientation}
            customSquareStyles={optionSquares}
            customLightSquareStyle={{ backgroundColor: BOARD_COLORS.light }}
            customDarkSquareStyle={{ backgroundColor: BOARD_COLORS.dark }}
            customNotationStyle={{ color: '#1f4d24', fontWeight: 700 }}
            customPieces={engravedPieces}
            arePiecesDraggable={canHumanMove()}
          />
        </div>
      </div>
    </div>
  );
}
