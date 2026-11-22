import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('college_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('college_auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('college_auth_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('college_auth_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error("Session verification failed", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const setAuthSession = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('college_auth_token', newToken);
    localStorage.setItem('college_auth_user', JSON.stringify(userData));
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token: newToken, user: userData } = res.data;
    setAuthSession(newToken, userData);
    return userData;
  };

  const adminLogin = async (identifier, password, rememberMe) => {
    const res = await authApi.adminLogin({ identifier, password, remember_me: rememberMe });
    const { token: newToken, user: userData } = res.data;
    setAuthSession(newToken, userData);
    return userData;
  };

  const hodLogin = async (identifier, password, rememberMe) => {
    const res = await authApi.hodLogin({ identifier, password, remember_me: rememberMe });
    const { token: newToken, user: userData } = res.data;
    setAuthSession(newToken, userData);
    return userData;
  };

  const staffLogin = async (identifier, password, rememberMe) => {
    const res = await authApi.staffLogin({ identifier, password, remember_me: rememberMe });
    const { token: newToken, user: userData } = res.data;
    setAuthSession(newToken, userData);
    return userData;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('college_auth_token');
    localStorage.removeItem('college_auth_user');
  };

  const hasRole = (...roles) => {
    if (!user || !user.role) return false;
    const lowerUserRole = user.role.toLowerCase();
    return roles.some(r => r.toLowerCase() === lowerUserRole);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      adminLogin,
      hodLogin,
      staffLogin,
      setAuthSession,
      logout,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
