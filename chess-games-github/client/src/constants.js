export const BOARD_COLORS = {
  light: '#eeeed2',
  dark: '#769656',
};

export const TIME_PRESETS = [
  { id: 'bullet_1_0', label: '1+0 Bullet', category: 'Bullet', baseMinutes: 1, incrementSeconds: 0 },
  { id: 'bullet_1_1', label: '1+1 Bullet', category: 'Bullet', baseMinutes: 1, incrementSeconds: 1 },
  { id: 'bullet_2_1', label: '2+1 Bullet', category: 'Bullet', baseMinutes: 2, incrementSeconds: 1 },
  { id: 'blitz_3_0', label: '3+0 Blitz', category: 'Blitz', baseMinutes: 3, incrementSeconds: 0 },
  { id: 'blitz_3_2', label: '3+2 Blitz', category: 'Blitz', baseMinutes: 3, incrementSeconds: 2 },
  { id: 'blitz_5_0', label: '5+0 Blitz', category: 'Blitz', baseMinutes: 5, incrementSeconds: 0 },
  { id: 'blitz_5_3', label: '5+3 Blitz', category: 'Blitz', baseMinutes: 5, incrementSeconds: 3 },
  { id: 'rapid_10_0', label: '10+0 Rapid', category: 'Rapid', baseMinutes: 10, incrementSeconds: 0 },
  { id: 'rapid_10_5', label: '10+5 Rapid', category: 'Rapid', baseMinutes: 10, incrementSeconds: 5 },
  { id: 'rapid_15_10', label: '15+10 Rapid', category: 'Rapid', baseMinutes: 15, incrementSeconds: 10 },
  { id: 'classical_30_0', label: '30+0 Classical', category: 'Classical', baseMinutes: 30, incrementSeconds: 0 },
  { id: 'classical_30_20', label: '30+20 Classical', category: 'Classical', baseMinutes: 30, incrementSeconds: 20 },
  { id: 'unlimited', label: 'Unlimited', category: 'Casual', baseMinutes: 0, incrementSeconds: 0 },
];

export const BOT_LEVELS = [
  { id: 'beginner', label: 'Beginner', depth: 1, skill: 0 },
  { id: 'intermediate', label: 'Intermediate', depth: 3, skill: 5 },
  { id: 'medium', label: 'Medium', depth: 6, skill: 10 },
  { id: 'hard', label: 'Hard', depth: 10, skill: 15 },
  { id: 'expert', label: 'Expert', depth: 14, skill: 20 },
];

export const GAME_MODES = [
  { id: 'local', label: 'Local (same device)', description: 'Two players take turns on one screen' },
  { id: 'bot', label: 'Play vs Bot', description: 'Challenge the computer at your chosen level' },
  { id: 'online', label: 'Challenge a friend', description: 'Search by username or ID and play on another device' },
];

export function timeControlToMs({ baseMinutes, incrementSeconds }) {
  return {
    baseMs: baseMinutes * 60 * 1000,
    incrementMs: incrementSeconds * 1000,
    unlimited: baseMinutes === 0,
  };
}

export function formatClock(ms) {
  if (ms === null || ms === undefined) return '--:--';
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatTimeControlLabel({ baseMinutes, incrementSeconds }) {
  if (baseMinutes === 0) return 'Unlimited';
  if (incrementSeconds === 0) return `${baseMinutes} min`;
  return `${baseMinutes}+${incrementSeconds}`;
}
