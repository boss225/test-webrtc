'use client';

import { BRAND_CONFIG } from '../config/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  showText?: boolean;
  variant?: 'default' | 'white' | 'gradient';
  className?: string;
}

export default function Logo({
  size = 'md',
  showIcon = true,
  showText = true,
  variant = 'default',
  className = ''
}: LogoProps) {
  const sizes = {
    sm: {
      icon: 'w-10 h-10',
      text: 'text-lg',
      container: 'gap-2',
    },
    md: {
      icon: 'w-12 h-12',
      text: 'text-xl',
      container: 'gap-2',
    },
    lg: {
      icon: 'w-17 h-17',
      text: 'text-2xl',
      container: 'gap-3',
    },
    xl: {
      icon: 'w-20 h-20',
      text: 'text-3xl',
      container: 'gap-3',
    },
  };

  const textStyles = {
    default: 'font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent',
    white: 'font-bold text-white',
    gradient: 'font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent',
  };

  return (
    <div className={`flex items-center ${sizes[size].container} ${className}`}>
      {showIcon && (
        <div className={`${sizes[size].icon} relative flex items-center`}>
          <img
            src="/logo.png"
            alt={BRAND_CONFIG.name + ' logo'}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      )}

      {showText && (
        <span className={textStyles[variant] + ' ' + sizes[size].text}>
          {BRAND_CONFIG.name}
        </span>
      )}
    </div>
  );
}