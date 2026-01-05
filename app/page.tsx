'use client';

import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import ChatRoom from './components/ChatRoom';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <ChatRoom /> : <LoginForm />;
}