import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('erp_token') || sessionStorage.getItem('erp_token');
    const storedUser = localStorage.getItem('erp_user') || sessionStorage.getItem('erp_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Auto logout timer (30 minutes of inactivity)
  useEffect(() => {
    if (!token) return;

    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        alert('Session expired due to inactivity. Please log in again.');
      }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimeout));
    resetTimeout();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimeout));
      clearTimeout(timeout);
    };
  }, [token]);

  const login = (userData, jwtToken, rememberMe) => {
    setUser(userData);
    setToken(jwtToken);
    
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('erp_token', jwtToken);
    storage.setItem('erp_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    sessionStorage.removeItem('erp_token');
    sessionStorage.removeItem('erp_user');
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
