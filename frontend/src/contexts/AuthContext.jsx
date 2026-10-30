import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('bookleaf_token');
    if (!token) { setLoading(false); return; }

    auth.me()
      .then(data => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('bookleaf_token');
        localStorage.removeItem('bookleaf_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, role) => {
    const data = await auth.login(email, password, role);
    localStorage.setItem('bookleaf_token', data.token);
    localStorage.setItem('bookleaf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    localStorage.removeItem('bookleaf_token');
    localStorage.removeItem('bookleaf_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
