import type { CSSProperties } from 'react';
import type { Theme, ThemeMode } from '../themes/theme.js';

interface TopNavProps {
  theme: Theme;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onOpenFAQ: () => void;
  isMobile: boolean;
}

export function TopNav({ theme, themeMode, onToggleTheme, onOpenFAQ, isMobile }: TopNavProps): JSX.Element {
  const containerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    gap: '0.75rem',
    padding: isMobile ? '0.75rem' : '1rem',
  };

  const buttonStyle: CSSProperties = {
    width: isMobile ? '44px' : '48px',
    height: isMobile ? '44px' : '48px',
    borderRadius: '12px',
    border: `2px solid ${theme.ui.text}80`,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    color: theme.ui.text,
    fontSize: isMobile ? '1.25rem' : '1.4rem',
    fontWeight: 600,
  };

  const iconStyle: CSSProperties = {
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const handleThemeHover = (e: React.MouseEvent<HTMLButtonElement>, isHovering: boolean) => {
    if (isHovering) {
      e.currentTarget.style.background = `${theme.ui.accent}ee`;
      e.currentTarget.style.transform = 'scale(1.05)';
    } else {
      e.currentTarget.style.background = `${theme.ui.cardBg}cc`;
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  const handleFAQHover = (e: React.MouseEvent<HTMLButtonElement>, isHovering: boolean) => {
    if (isHovering) {
      e.currentTarget.style.background = `${theme.ui.accent}ee`;
      e.currentTarget.style.transform = 'scale(1.05)';
    } else {
      e.currentTarget.style.background = `${theme.ui.cardBg}cc`;
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  return (
    <div style={containerStyle}>
      {/* FAQ Button */}
      <button
        onClick={onOpenFAQ}
        style={buttonStyle}
        onMouseEnter={(e) => handleFAQHover(e, true)}
        onMouseLeave={(e) => handleFAQHover(e, false)}
        aria-label="Open FAQ"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={iconStyle}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>

      {/* Theme Toggle Button */}
      <button
        onClick={onToggleTheme}
        style={buttonStyle}
        onMouseEnter={(e) => handleThemeHover(e, true)}
        onMouseLeave={(e) => handleThemeHover(e, false)}
        aria-label={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {themeMode === 'dark' ? (
          // Sun icon for light mode
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={iconStyle}
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          // Moon icon for dark mode
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={iconStyle}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </div>
  );
}
