import STOCKFISH from 'stockfish.js';

let enginePromise = null;

function getEngine() {
  if (!enginePromise) {
    enginePromise = new Promise((resolve) => {
      const engine = STOCKFISH();
      engine.onmessage = (event) => {
        if (typeof event === 'string' && event.includes('uciok')) {
          resolve(engine);
        } else if (event?.data?.includes?.('uciok')) {
          resolve(engine);
        }
      };
      engine.postMessage('uci');
    });
  }
  return enginePromise;
}

function pickRandomMove(moves) {
  return moves[Math.floor(Math.random() * moves.length)];
}

function pickCaptureOrCheckMove(game, moves) {
  const scored = moves.map((move) => {
    game.move(move);
    const score =
      (move.captured ? 3 : 0) +
      (game.inCheck() ? 2 : 0) +
      (move.promotion ? 1 : 0);
    game.undo();
    return { move, score };
  });

  const maxScore = Math.max(...scored.map((s) => s.score));
  const best = scored.filter((s) => s.score === maxScore);
  return pickRandomMove(best).move;
}

export async function getBotMove(game, level, legalMoves) {
  if (!legalMoves.length) return null;

  if (level.id === 'beginner') {
    return pickRandomMove(legalMoves);
  }

  if (level.id === 'intermediate') {
    return pickCaptureOrCheckMove(game, legalMoves);
  }

  const engine = await getEngine();
  const fen = game.fen();

  return new Promise((resolve) => {
    let bestMove = legalMoves[0];
    const timeout = setTimeout(() => {
      engine.onmessage = null;
      resolve(bestMove);
    }, level.id === 'medium' ? 1500 : level.id === 'hard' ? 2500 : 4000);

    engine.onmessage = (event) => {
      const line = typeof event === 'string' ? event : event?.data;
      if (!line || !line.startsWith('bestmove')) return;
      clearTimeout(timeout);
      const uci = line.split(' ')[1];
      if (uci && uci !== '(none)') {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;
        const match = legalMoves.find(
          (m) => m.from === from && m.to === to && m.promotion === promotion
        );
        if (match) bestMove = match;
      }
      resolve(bestMove);
    };

    engine.postMessage('ucinewgame');
    engine.postMessage(`setoption name Skill Level value ${level.skill}`);
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${level.depth}`);
  });
}
