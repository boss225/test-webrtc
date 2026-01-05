'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  login: (username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verify session khi load
  useEffect(() => {
    const verifySession = async () => {
      const storedUserId = localStorage.getItem('userId');
      const storedUsername = localStorage.getItem('username');

      if (storedUserId && storedUsername) {
        try {
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: storedUserId }),
          });

          const data = await response.json();

          if (data.valid) {
            setIsAuthenticated(true);
            setUserId(storedUserId);
            setUsername(storedUsername);
          } else {
            // Session không hợp lệ, xóa localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
          }
        } catch (error) {
          console.error('Verify session error:', error);
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
        }
      }

      setIsLoading(false);
    };

    verifySession();
  }, []);

  const login = async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Lưu vào state và localStorage
      setIsAuthenticated(true);
      setUserId(data.userId);
      setUsername(data.username);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', data.username);

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

    // Clear state và localStorage
    setIsAuthenticated(false);
    setUserId(null);
    setUsername(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        username,
        login,
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