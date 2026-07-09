import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken } from '../api/client';
import { getSocketUrl } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const token = getToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const me = await api.me();
        if (!active) return;
        setUser(me);
        const nextSocket = io(getSocketUrl(), { auth: { token } });
        setSocket(nextSocket);
      } catch {
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  async function login(username, password) {
    const result = await api.login(username, password);
    setToken(result.token);
    setUser({ id: result.id, username: result.username, playerCode: result.playerCode });
    socket?.disconnect();
    const nextSocket = io(getSocketUrl(), { auth: { token: result.token } });
    setSocket(nextSocket);
    return result;
  }

  async function register(username, password) {
    const result = await api.register(username, password);
    setToken(result.token);
    setUser({ id: result.id, username: result.username, playerCode: result.playerCode });
    socket?.disconnect();
    const nextSocket = io(getSocketUrl(), { auth: { token: result.token } });
    setSocket(nextSocket);
    return result;
  }

  function logout() {
    socket?.disconnect();
    setSocket(null);
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const token = getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    const me = await api.me();
    setUser(me);
    return me;
  }

  const value = useMemo(
    () => ({ user, loading, socket, login, register, logout, refreshUser }),
    [user, loading, socket]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
