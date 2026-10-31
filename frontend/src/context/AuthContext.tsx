import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  quickSwitch: (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
        localStorage.removeItem('brightloop_token');
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data?.user) {
      if (res.data.token) {
        localStorage.setItem('brightloop_token', res.data.token);
      }
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || 'Login failed' };
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    if (res.success && res.data?.user) {
      if (res.data.token) {
        localStorage.setItem('brightloop_token', res.data.token);
      }
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error?.message || 'Registration failed' };
  };

  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('brightloop_token');
    setUser(null);
  };

  const quickSwitch = async (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => {
    setLoading(true);
    let email = 'admin@brightloop.io';
    let password = 'Admin@12345!';

    if (role === 'STAFF') {
      email = 'staff1@brightloop.io';
      password = 'Staff@12345!';
    } else if (role === 'CUSTOMER') {
      email = 'billing@acme.com';
      password = 'Customer@12345!';
    }

    await login(email, password);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        quickSwitch,
        refreshUser: fetchProfile,
      }}
    >
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
