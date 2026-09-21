import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('erp_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
            localStorage.setItem('erp_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_user');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: userData, accessToken } = res.data.data;
      localStorage.setItem('erp_token', accessToken);
      localStorage.setItem('erp_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (permissionCode) => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Super Admin') return true;
    const permissions = user.role.permissions || [];
    return permissions.includes(permissionCode);
  };

  const updateCurrentUser = (updatedData) => {
    setUser(updatedData);
    localStorage.setItem('erp_user', JSON.stringify(updatedData));
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, hasPermission, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
