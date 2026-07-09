import crypto from 'crypto';
import db from './db.js';

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 5;
const CODE_PATTERN = new RegExp(`^[${LETTERS}]{${CODE_LENGTH}}$`, 'i');

export function generatePlayerCode() {
  for (let attempt = 0; attempt < 30; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += LETTERS[crypto.randomInt(LETTERS.length)];
    }
    const exists = db
      .prepare('SELECT id FROM users WHERE player_code = ? COLLATE NOCASE')
      .get(code);
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique player code.');
}

export function isValidPlayerCode(value) {
  return typeof value === 'string' && CODE_PATTERN.test(value.trim());
}

export function normalizePlayerCodeQuery(query) {
  const compact = String(query).trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (compact.length !== CODE_LENGTH) return null;
  if (!CODE_PATTERN.test(compact)) return null;
  return compact;
}

export function ensurePlayerCode(userId) {
  const row = db.prepare('SELECT player_code FROM users WHERE id = ?').get(userId);
  if (!row) return null;
  if (isValidPlayerCode(row.player_code)) {
    return row.player_code.toUpperCase();
  }

  const code = generatePlayerCode();
  db.prepare('UPDATE users SET player_code = ? WHERE id = ?').run(code, userId);
  return code;
}

export function backfillPlayerCodes() {
  const users = db
    .prepare(`SELECT id FROM users WHERE player_code IS NULL OR player_code = ''`)
    .all();
  const update = db.prepare('UPDATE users SET player_code = ? WHERE id = ?');
  for (const user of users) {
    update.run(generatePlayerCode(), user.id);
  }

  const legacyUsers = db
    .prepare(`SELECT id, player_code FROM users WHERE player_code IS NOT NULL AND player_code != ''`)
    .all()
    .filter((user) => !isValidPlayerCode(user.player_code));

  for (const user of legacyUsers) {
    update.run(generatePlayerCode(), user.id);
  }
}
