import React from 'react';

interface NatiLogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
  adminBadge?: boolean;
}

export const NatiLogo: React.FC<NatiLogoProps> = ({ 
  size = 32, 
  showText = true, 
  textColor = '#FFFFFF',
  adminBadge = false
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', userSelect: 'none' }}>
      {/* 8-Petal Golden Flower Icon */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="natiGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBD34D" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        {/* Central Core */}
        <circle cx="50" cy="50" r="13" fill="url(#natiGoldGrad)" />
        {/* 8 Symmetrical Rounded Petals */}
        <g fill="url(#natiGoldGrad)">
          {/* Top & Bottom */}
          <rect x="42.5" y="6" width="15" height="34" rx="7.5" />
          <rect x="42.5" y="60" width="15" height="34" rx="7.5" />
          {/* Left & Right */}
          <rect x="6" y="42.5" width="34" height="15" rx="7.5" />
          <rect x="60" y="42.5" width="34" height="15" rx="7.5" />
          {/* Diagonal 45 deg */}
          <rect x="42.5" y="6" width="15" height="34" rx="7.5" transform="rotate(45 50 50)" />
          <rect x="42.5" y="60" width="15" height="34" rx="7.5" transform="rotate(45 50 50)" />
          {/* Diagonal -45 deg */}
          <rect x="6" y="42.5" width="34" height="15" rx="7.5" transform="rotate(45 50 50)" />
          <rect x="60" y="42.5" width="34" height="15" rx="7.5" transform="rotate(45 50 50)" />
        </g>
      </svg>

      {showText && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', lineHeight: 1 }}>
          <span style={{ 
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif", 
            fontWeight: 800, 
            fontSize: `${size * 0.65}px`, 
            color: textColor,
            letterSpacing: '-0.02em'
          }}>
            Nati Lotto
          </span>
          {adminBadge && (
            <span style={{ 
              fontSize: '0.65rem', 
              color: '#94A3B8', 
              fontWeight: 600, 
              marginLeft: '0.2rem',
              letterSpacing: '0.04em'
            }}>
              Admin
            </span>
          )}
        </div>
      )}
    </div>
  );
};
