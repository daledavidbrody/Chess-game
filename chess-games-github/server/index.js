import bcrypt from 'bcryptjs';
import { Chess } from 'chess.js';
import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import db from './db.js';
import {
  backfillPlayerCodes,
  ensurePlayerCode,
  generatePlayerCode,
  normalizePlayerCodeQuery,
} from './playerCodes.js';

backfillPlayerCodes();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const clientDist = path.join(__dirname, '../client/dist');
const clientOrigins = (process.env.CLIENT_URL ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const corsOrigin = clientOrigins.length > 0 ? clientOrigins : true;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigin },
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const START_FEN = new Chess().fen();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

function createToken(userId) {
  const token = crypto.randomUUID();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

function serializeUser(row) {
  if (!row) return null;
  const playerCode = row.player_code
    ? row.player_code.toUpperCase()
    : ensurePlayerCode(row.id);
  return {
    id: row.id,
    username: row.username,
    playerCode,
  };
}

function getUserFromToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.player_code
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);
  if (!row) return null;
  if (!row.player_code) {
    row.player_code = ensurePlayerCode(row.id);
  }
  return serializeUser(row);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  req.user = user;
  next();
}

function challengePayload(row) {
  return {
    id: row.id,
    challengerId: row.challenger_id,
    challengerName: row.challenger_name,
    challengedId: row.challenged_id,
    challengedName: row.challenged_name,
    status: row.status,
    baseMinutes: row.base_minutes,
    incrementSeconds: row.increment_seconds,
    gameId: row.game_id,
    createdAt: row.created_at,
  };
}

function formatTimeControlLabel(baseMinutes, incrementSeconds, unlimited) {
  if (unlimited) return 'Unlimited';
  if (incrementSeconds > 0) return `${baseMinutes}+${incrementSeconds}`;
  return `${baseMinutes} min`;
}

function timeControlKey(baseMinutes, incrementSeconds, unlimited) {
  if (unlimited) return 'unlimited';
  return `${baseMinutes}+${incrementSeconds}`;
}

function ensureFriendship(userA, userB) {
  if (userA === userB) return;
  db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(userA, userB);
  db.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)').run(userB, userA);
}

function resolveWinner(gameRow, resultText) {
  if (!resultText || resultText.startsWith('Draw')) return null;
  if (resultText.startsWith('White wins')) return gameRow.white_user_id;
  if (resultText.startsWith('Black wins')) return gameRow.black_user_id;
  return null;
}

function gamePayload(row, viewerId) {
  const isWhite = row.white_user_id === viewerId;
  const baseMinutes = row.base_minutes ?? 0;
  const incrementSeconds = row.increment_seconds ?? 0;
  const unlimited = Boolean(row.unlimited);

  return {
    gameId: row.id,
    fen: row.fen,
    status: row.status,
    result: row.result,
    whiteMs: row.white_ms,
    blackMs: row.black_ms,
    incrementMs: row.increment_ms,
    unlimited,
    activeColor: row.active_color,
    color: isWhite ? 'w' : 'b',
    opponentName: isWhite ? row.black_username : row.white_username,
    whiteName: row.white_username,
    blackName: row.black_username,
    timeControl: {
      label: formatTimeControlLabel(baseMinutes, incrementSeconds, unlimited),
      baseMinutes,
      incrementSeconds,
    },
    clock: {
      baseMs: row.white_ms,
      incrementMs: row.increment_ms,
      unlimited,
    },
  };
}

function loadGame(gameId) {
  const row = db
    .prepare(
      `SELECT g.*,
              wu.username AS white_username,
              bu.username AS black_username,
              COALESCE(g.base_minutes, c.base_minutes, 0) AS base_minutes,
              COALESCE(g.increment_seconds, c.increment_seconds, 0) AS increment_seconds
       FROM games g
       JOIN users wu ON wu.id = g.white_user_id
       JOIN users bu ON bu.id = g.black_user_id
       LEFT JOIN challenges c ON c.game_id = g.id
       WHERE g.id = ?`
    )
    .get(gameId);

  return row;
}

function persistGameState(gameRow) {
  db.prepare(
    `UPDATE games
     SET fen = ?, status = ?, result = ?, winner_user_id = ?, white_ms = ?, black_ms = ?,
         active_color = ?, last_move_at = ?, finished_at = ?
     WHERE id = ?`
  ).run(
    gameRow.fen,
    gameRow.status,
    gameRow.result,
    gameRow.winner_user_id ?? null,
    gameRow.white_ms,
    gameRow.black_ms,
    gameRow.active_color,
    gameRow.last_move_at,
    gameRow.finished_at ?? null,
    gameRow.id
  );
}

function finishGame(gameRow, resultText) {
  gameRow.status = 'finished';
  gameRow.result = resultText;
  gameRow.finished_at = new Date().toISOString();
  gameRow.winner_user_id = resolveWinner(gameRow, resultText);
  persistGameState(gameRow);
}

function tickClock(gameRow) {
  if (gameRow.unlimited || !gameRow.last_move_at) return gameRow;
  const elapsed = Date.now() - new Date(gameRow.last_move_at).getTime();
  if (gameRow.active_color === 'w') {
    gameRow.white_ms = Math.max(0, gameRow.white_ms - elapsed);
  } else {
    gameRow.black_ms = Math.max(0, gameRow.black_ms - elapsed);
  }
  return gameRow;
}

function detectGameResult(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  }
  if (chess.isStalemate()) return 'Draw by stalemate';
  if (chess.isThreefoldRepetition()) return 'Draw by repetition';
  if (chess.isInsufficientMaterial()) return 'Draw — insufficient material';
  if (chess.isDraw()) return 'Draw';
  return null;
}

function applyMove(gameRow, move) {
  tickClock(gameRow);
  const chess = new Chess(gameRow.fen);
  const result = chess.move(move);
  if (!result) return null;

  if (!gameRow.unlimited) {
    if (result.color === 'w') gameRow.white_ms += gameRow.increment_ms;
    else gameRow.black_ms += gameRow.increment_ms;
  }

  gameRow.fen = chess.fen();
  gameRow.active_color = chess.turn();
  gameRow.last_move_at = new Date().toISOString();

  const gameResult = detectGameResult(chess);
  if (gameResult) {
    finishGame(gameRow, gameResult);
  } else {
    persistGameState(gameRow);
  }

  return { chess, result, gameResult };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, phase: 'online-play-ready' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body.username ?? '').trim();
  const password = String(req.body.password ?? '');

  if (username.length < 3 || username.length > 24) {
    return res.status(400).json({ error: 'Username must be 3–24 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const playerCode = generatePlayerCode();
    const result = db
      .prepare('INSERT INTO users (username, password_hash, player_code) VALUES (?, ?, ?)')
      .run(username, passwordHash, playerCode);
    const user = { id: result.lastInsertRowid, username, playerCode };
    const token = createToken(user.id);
    res.status(201).json({ ...user, token });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
    throw error;
  }
});

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body.username ?? '').trim();
  const password = String(req.body.password ?? '');

  const row = db
    .prepare('SELECT id, username, player_code, password_hash FROM users WHERE username = ? COLLATE NOCASE')
    .get(username);

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  if (!row.player_code) {
    row.player_code = ensurePlayerCode(row.id);
  }

  const token = createToken(row.id);
  res.json({ ...serializeUser(row), token });
});

app.get('/api/users/search', authMiddleware, (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 1) {
    return res.json([]);
  }

  const playerCode = normalizePlayerCodeQuery(q);
  if (playerCode) {
    const row = db
      .prepare(
        `SELECT id, username, player_code
         FROM users
         WHERE player_code = ? COLLATE NOCASE
           AND id != ?`
      )
      .get(playerCode, req.user.id);
    return res.json(row ? [serializeUser(row)] : []);
  }

  if (/^\d+$/.test(q)) {
    const row = db
      .prepare('SELECT id, username, player_code FROM users WHERE id = ? AND id != ?')
      .get(Number(q), req.user.id);
    return res.json(row ? [serializeUser(row)] : []);
  }

  if (q.length < 2) {
    return res.json([]);
  }

  const rows = db
    .prepare(
      `SELECT id, username, player_code
       FROM users
       WHERE id != ?
         AND (username LIKE ? ESCAPE '\\'
           OR player_code LIKE ? ESCAPE '\\')
       ORDER BY username
       LIMIT 10`
    )
    .all(
      req.user.id,
      `%${q.replace(/[%_\\]/g, '\\$&')}%`,
      `%${q.replace(/[%_\\]/g, '\\$&').toUpperCase()}%`
    );

  res.json(rows.map(serializeUser));
});

app.post('/api/challenges', authMiddleware, (req, res) => {
  const challengedId = Number(req.body.challengedId);
  const baseMinutes = Number(req.body.baseMinutes ?? 5);
  const incrementSeconds = Number(req.body.incrementSeconds ?? 0);

  if (!challengedId || challengedId === req.user.id) {
    return res.status(400).json({ error: 'Choose a different player to challenge.' });
  }

  const challenged = db.prepare('SELECT id, username FROM users WHERE id = ?').get(challengedId);
  if (!challenged) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  const existing = db
    .prepare(
      `SELECT id FROM challenges
       WHERE status = 'pending'
         AND ((challenger_id = ? AND challenged_id = ?)
           OR (challenger_id = ? AND challenged_id = ?))`
    )
    .get(req.user.id, challengedId, challengedId, req.user.id);

  if (existing) {
    return res.status(409).json({ error: 'A pending challenge already exists with this player.' });
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO challenges (id, challenger_id, challenged_id, base_minutes, increment_seconds)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.user.id, challengedId, baseMinutes, incrementSeconds);

  const row = db
    .prepare(
      `SELECT c.*,
              cu.username AS challenger_name,
              cd.username AS challenged_name
       FROM challenges c
       JOIN users cu ON cu.id = c.challenger_id
       JOIN users cd ON cd.id = c.challenged_id
       WHERE c.id = ?`
    )
    .get(id);

  const payload = challengePayload(row);
  ensureFriendship(req.user.id, challengedId);
  io.to(`user:${challengedId}`).emit('challenge:received', payload);
  res.status(201).json(payload);
});

app.get('/api/challenges/pending', authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*,
              cu.username AS challenger_name,
              cd.username AS challenged_name
       FROM challenges c
       JOIN users cu ON cu.id = c.challenger_id
       JOIN users cd ON cd.id = c.challenged_id
       WHERE c.status = 'pending'
         AND (c.challenged_id = ? OR c.challenger_id = ?)
       ORDER BY c.created_at DESC`
    )
    .all(req.user.id, req.user.id);

  res.json(rows.map(challengePayload));
});

function startGameFromChallenge(challenge, acceptingUserId) {
  const challengerIsWhite = Math.random() < 0.5;
  const whiteUserId = challengerIsWhite ? challenge.challenger_id : challenge.challenged_id;
  const blackUserId = challengerIsWhite ? challenge.challenged_id : challenge.challenger_id;
  const baseMs = challenge.base_minutes * 60 * 1000;
  const incrementMs = challenge.increment_seconds * 1000;
  const unlimited = challenge.base_minutes === 0 ? 1 : 0;
  const gameId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO games (
      id, white_user_id, black_user_id, fen, white_ms, black_ms,
      increment_ms, base_minutes, increment_seconds, unlimited, active_color, last_move_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'w', ?)`
  ).run(
    gameId,
    whiteUserId,
    blackUserId,
    START_FEN,
    baseMs,
    baseMs,
    incrementMs,
    challenge.base_minutes,
    challenge.increment_seconds,
    unlimited,
    now
  );

  ensureFriendship(challenge.challenger_id, challenge.challenged_id);

  db.prepare(`UPDATE challenges SET status = 'accepted', game_id = ? WHERE id = ?`).run(
    gameId,
    challenge.id
  );

  const gameRow = loadGame(gameId);
  gameRow.base_minutes = challenge.base_minutes;
  gameRow.increment_seconds = challenge.increment_seconds;

  const whitePayload = gamePayload(gameRow, whiteUserId);
  const blackPayload = gamePayload(gameRow, blackUserId);

  io.to(`user:${whiteUserId}`).emit('game:started', whitePayload);
  io.to(`user:${blackUserId}`).emit('game:started', blackPayload);

  return gameRow;
}

app.post('/api/challenges/:id/accept', authMiddleware, (req, res) => {
  const challenge = db
    .prepare(
      `SELECT c.*,
              cu.username AS challenger_name,
              cd.username AS challenged_name
       FROM challenges c
       JOIN users cu ON cu.id = c.challenger_id
       JOIN users cd ON cd.id = c.challenged_id
       WHERE c.id = ?`
    )
    .get(req.params.id);

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found.' });
  }
  if (challenge.status !== 'pending') {
    return res.status(400).json({ error: 'Challenge is no longer pending.' });
  }
  if (challenge.challenged_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the challenged player can accept.' });
  }

  const gameRow = startGameFromChallenge(challenge, req.user.id);
  res.json(gamePayload(gameRow, req.user.id));
});

app.post('/api/challenges/:id/decline', authMiddleware, (req, res) => {
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found.' });
  }
  if (challenge.challenged_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the challenged player can decline.' });
  }
  if (challenge.status !== 'pending') {
    return res.status(400).json({ error: 'Challenge is no longer pending.' });
  }

  db.prepare(`UPDATE challenges SET status = 'declined' WHERE id = ?`).run(challenge.id);
  io.to(`user:${challenge.challenger_id}`).emit('challenge:declined', { id: challenge.id });
  res.json({ ok: true });
});

app.get('/api/games/:id', authMiddleware, (req, res) => {
  const gameRow = loadGame(req.params.id);
  if (!gameRow) {
    return res.status(404).json({ error: 'Game not found.' });
  }
  if (gameRow.white_user_id !== req.user.id && gameRow.black_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not part of this game.' });
  }
  res.json(gamePayload(gameRow, req.user.id));
});

function outcomeForUser(gameRow, userId) {
  if (gameRow.status !== 'finished') return 'ongoing';
  if (!gameRow.winner_user_id) return 'draw';
  if (gameRow.winner_user_id === userId) return 'win';
  return 'loss';
}

app.get('/api/home', authMiddleware, (req, res) => {
  const userId = req.user.id;

  const friends = db
    .prepare(
      `SELECT u.id, u.username, u.player_code
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = ?
       ORDER BY u.username`
    )
    .all(userId)
    .map(serializeUser);

  const recentRows = db
    .prepare(
      `SELECT g.id,
              g.white_user_id,
              g.black_user_id,
              g.status,
              g.result,
              g.winner_user_id,
              g.unlimited,
              g.finished_at,
              g.created_at,
              wu.username AS white_username,
              bu.username AS black_username,
              COALESCE(g.base_minutes, c.base_minutes, 0) AS base_minutes,
              COALESCE(g.increment_seconds, c.increment_seconds, 0) AS increment_seconds
       FROM games g
       JOIN users wu ON wu.id = g.white_user_id
       JOIN users bu ON bu.id = g.black_user_id
       LEFT JOIN challenges c ON c.game_id = g.id
       WHERE g.status = 'finished'
         AND (g.white_user_id = ? OR g.black_user_id = ?)
       ORDER BY datetime(COALESCE(g.finished_at, g.created_at)) DESC
       LIMIT 15`
    )
    .all(userId, userId);

  const recentGames = recentRows.map((row) => ({
    id: row.id,
    opponentName: row.white_user_id === userId ? row.black_username : row.white_username,
    opponentId: row.white_user_id === userId ? row.black_user_id : row.white_user_id,
    timeControl: formatTimeControlLabel(row.base_minutes, row.increment_seconds, row.unlimited),
    timeControlKey: timeControlKey(row.base_minutes, row.increment_seconds, row.unlimited),
    result: row.result,
    outcome: outcomeForUser(row, userId),
    playedAt: row.finished_at ?? row.created_at,
  }));

  const statRows = db
    .prepare(
      `SELECT
         COALESCE(g.base_minutes, c.base_minutes, 0) AS base_minutes,
         COALESCE(g.increment_seconds, c.increment_seconds, 0) AS increment_seconds,
         g.unlimited,
         COUNT(*) AS played,
         SUM(CASE WHEN g.winner_user_id = ? THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN g.winner_user_id IS NOT NULL AND g.winner_user_id != ? THEN 1 ELSE 0 END) AS losses,
         SUM(CASE WHEN g.winner_user_id IS NULL THEN 1 ELSE 0 END) AS draws
       FROM games g
       LEFT JOIN challenges c ON c.game_id = g.id
       WHERE g.status = 'finished'
         AND (g.white_user_id = ? OR g.black_user_id = ?)
       GROUP BY g.unlimited,
                COALESCE(g.base_minutes, c.base_minutes, 0),
                COALESCE(g.increment_seconds, c.increment_seconds, 0)
       ORDER BY played DESC`
    )
    .all(userId, userId, userId, userId);

  const statsByTimeControl = statRows.map((row) => ({
    key: timeControlKey(row.base_minutes, row.increment_seconds, row.unlimited),
    label: formatTimeControlLabel(row.base_minutes, row.increment_seconds, row.unlimited),
    played: row.played,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
  }));

  const totals = statsByTimeControl.reduce(
    (acc, stat) => ({
      played: acc.played + stat.played,
      wins: acc.wins + stat.wins,
      losses: acc.losses + stat.losses,
      draws: acc.draws + stat.draws,
    }),
    { played: 0, wins: 0, losses: 0, draws: 0 }
  );

  res.json({
    user: req.user,
    friends,
    recentGames,
    statsByTimeControl,
    totals,
  });
});

app.post('/api/friends', authMiddleware, (req, res) => {
  const friendId = Number(req.body.friendId);
  if (!friendId || friendId === req.user.id) {
    return res.status(400).json({ error: 'Choose a different player to add.' });
  }

  const friend = db.prepare('SELECT id, username, player_code FROM users WHERE id = ?').get(friendId);
  if (!friend) {
    return res.status(404).json({ error: 'Player not found.' });
  }

  ensureFriendship(req.user.id, friendId);
  res.status(201).json(serializeUser(friend));
});

io.use((socket, next) => {
  const user = getUserFromToken(socket.handshake.auth?.token);
  if (!user) {
    return next(new Error('Unauthorized'));
  }
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user.id}`);

  socket.on('game:join', ({ gameId }) => {
    const gameRow = loadGame(gameId);
    if (!gameRow) return;
    if (gameRow.white_user_id !== socket.user.id && gameRow.black_user_id !== socket.user.id) return;
    socket.join(`game:${gameId}`);
    socket.emit('game:state', gamePayload(gameRow, socket.user.id));
  });

  socket.on('game:move', ({ gameId, from, to, promotion = 'q' }) => {
    const gameRow = loadGame(gameId);
    if (!gameRow || gameRow.status !== 'active') return;

    const isWhite = gameRow.white_user_id === socket.user.id;
    const isBlack = gameRow.black_user_id === socket.user.id;
    if (!isWhite && !isBlack) return;

    const playerColor = isWhite ? 'w' : 'b';
    if (gameRow.active_color !== playerColor) return;

    const outcome = applyMove(gameRow, { from, to, promotion });
    if (!outcome) {
      socket.emit('game:error', { message: 'Illegal move.' });
      return;
    }

    io.to(`game:${gameId}`).emit('game:update', {
      gameId,
      fen: gameRow.fen,
      whiteMs: gameRow.white_ms,
      blackMs: gameRow.black_ms,
      activeColor: gameRow.active_color,
      status: gameRow.status,
      result: gameRow.result,
      lastMove: { from, to, promotion },
    });
  });

  socket.on('game:flag', ({ gameId, color }) => {
    const gameRow = loadGame(gameId);
    if (!gameRow || gameRow.status !== 'active') return;

    const isWhite = gameRow.white_user_id === socket.user.id;
    const isBlack = gameRow.black_user_id === socket.user.id;
    if (!isWhite && !isBlack) return;

    tickClock(gameRow);
    const resultText = color === 'w' ? 'Black wins on time' : 'White wins on time';
    finishGame(gameRow, resultText);

    io.to(`game:${gameId}`).emit('game:update', {
      gameId,
      fen: gameRow.fen,
      whiteMs: gameRow.white_ms,
      blackMs: gameRow.black_ms,
      activeColor: gameRow.active_color,
      status: gameRow.status,
      result: gameRow.result,
    });
  });
});

if (isProduction) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

httpServer.listen(PORT, HOST, () => {
  console.log(`Chess Games server listening on http://${HOST}:${PORT}`);
});
