'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { gasPost } from '@/lib/gas';

type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('eco-agent-user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        const updateStreak = async () => {
          try {
            const isGuest = parsed.id?.startsWith('guest_');
            await gasPost('upsert', 'users', {
              id: parsed.id,
              email: parsed.email,
              name: parsed.name,
              picture: parsed.picture,
              created_at: parsed.created_at || new Date().toISOString()
            }, {
              queryField: isGuest ? 'id' : 'email',
              queryValue: isGuest ? parsed.id : parsed.email
            });
          } catch (err) {
            console.error(err);
          }
        };
        updateStreak();
      } catch (e) {
        console.error('Failed to parse saved user');
        localStorage.removeItem('eco-agent-user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('eco-agent-user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eco-agent-user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
