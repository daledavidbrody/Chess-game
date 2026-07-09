const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

export function getApiUrl(path) {
  return `${apiBase}${path}`;
}

export function getSocketUrl() {
  const configured = import.meta.env.VITE_SOCKET_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (apiBase) return apiBase;
  if (typeof window !== 'undefined') return window.location.origin;
  return undefined;
}
