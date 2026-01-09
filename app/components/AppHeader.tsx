'use client';

import { ReactNode } from 'react';
import UserProfile from './UserProfile';
import Logo from './Logo';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showUserProfile?: boolean;
}

export default function AppHeader({ 
  title, 
  subtitle, 
  actions,
  showUserProfile = true 
}: AppHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Logo size="lg" showText={false} variant="white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-sm text-blue-100 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {actions}
            {showUserProfile && <UserProfile />}
          </div>
        </div>
      </div>
    </header>
  );
}