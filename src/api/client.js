import { getApiUrl } from '../config';

const TOKEN_KEY = 'chess-games-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getApiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed.');
  }

  return data;
}

export const api = {
  me: () => apiFetch('/api/auth/me'),
  register: (username, password) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  searchUsers: (q) => apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`),
  createChallenge: (payload) =>
    apiFetch('/api/challenges', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  pendingChallenges: () => apiFetch('/api/challenges/pending'),
  acceptChallenge: (id) =>
    apiFetch(`/api/challenges/${id}/accept`, { method: 'POST' }),
  declineChallenge: (id) =>
    apiFetch(`/api/challenges/${id}/decline`, { method: 'POST' }),
  getGame: (id) => apiFetch(`/api/games/${id}`),
  getHome: () => apiFetch('/api/home'),
  addFriend: (friendId) =>
    apiFetch('/api/friends', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    }),
};
