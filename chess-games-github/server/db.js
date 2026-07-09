import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || __dirname;
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'chess-games.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    player_code TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    challenger_id INTEGER NOT NULL,
    challenged_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    base_minutes INTEGER NOT NULL,
    increment_seconds INTEGER NOT NULL,
    game_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (challenger_id) REFERENCES users(id),
    FOREIGN KEY (challenged_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    white_user_id INTEGER NOT NULL,
    black_user_id INTEGER NOT NULL,
    fen TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    result TEXT,
    winner_user_id INTEGER,
    white_ms INTEGER NOT NULL,
    black_ms INTEGER NOT NULL,
    increment_ms INTEGER NOT NULL DEFAULT 0,
    base_minutes INTEGER,
    increment_seconds INTEGER,
    unlimited INTEGER NOT NULL DEFAULT 0,
    active_color TEXT NOT NULL DEFAULT 'w',
    last_move_at TEXT,
    finished_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (white_user_id) REFERENCES users(id),
    FOREIGN KEY (black_user_id) REFERENCES users(id),
    FOREIGN KEY (winner_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friends (
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id)
  );
`);

const gameColumns = db.prepare(`PRAGMA table_info(games)`).all().map((col) => col.name);
const columnsToAdd = [
  ['winner_user_id', 'INTEGER'],
  ['base_minutes', 'INTEGER'],
  ['increment_seconds', 'INTEGER'],
  ['finished_at', 'TEXT'],
];

for (const [name, type] of columnsToAdd) {
  if (!gameColumns.includes(name)) {
    db.exec(`ALTER TABLE games ADD COLUMN ${name} ${type}`);
  }
}

const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map((col) => col.name);
if (!userColumns.includes('player_code')) {
  db.exec(`ALTER TABLE users ADD COLUMN player_code TEXT`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_player_code ON users(player_code)`);
}

export default db;
