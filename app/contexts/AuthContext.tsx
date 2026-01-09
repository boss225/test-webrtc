'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userId: string | null;
  username: string | null;
  supabaseUserId: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedSessionId = localStorage.getItem('sessionId');

      if (token && storedUser && storedSessionId) {
        try {
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId: storedSessionId }),
          });

          const data = await response.json();

          if (data.valid && data.user) {
            setIsAuthenticated(true);
            setUser(data.user);
            setUserId(storedSessionId);
            setUsername(data.user.username);
            setSupabaseUserId(data.user.id);
          } else {
            // Clear invalid session
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('Verify session error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('sessionId');
        }
      }

      setIsLoading(false);
    };

    verifySession();
  }, []);

  const register = async (
    email: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Auto login after register
      return await login(email, password);
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Save to state and localStorage
      setIsAuthenticated(true);
      setUser(data.user);
      setUserId(data.sessionId);
      setUsername(data.user.username);
      setSupabaseUserId(data.user.id);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('sessionId', data.sessionId);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  };

  const logout = async () => {
    if (userId) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear state and localStorage
    setIsAuthenticated(false);
    setUser(null);
    setUserId(null);
    setUsername(null);
    setSupabaseUserId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        userId,
        username,
        supabaseUserId,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}