import { useState, type ReactNode, type CSSProperties } from 'react';
import type { Theme } from '../themes/theme.js';

interface MobileDrawerProps {
  children: ReactNode;
  theme: Theme;
  defaultOpen?: boolean;
}

/**
 * Mobile drawer component that slides up from the bottom of the screen.
 * Provides collapsible controls for mobile devices.
 */
export function MobileDrawer({ children, theme, defaultOpen = false }: MobileDrawerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const drawerStyle: CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.ui.cardBg,
    borderTopLeftRadius: '1rem',
    borderTopRightRadius: '1rem',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
    transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 60px))',
    transition: 'transform 0.3s ease-out',
    maxHeight: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    pointerEvents: 'auto',
  };

  const handleStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1rem',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  };

  const handleBarStyle: CSSProperties = {
    width: '60px',
    height: '4px',
    backgroundColor: theme.ui.textSecondary,
    borderRadius: '2px',
    opacity: 0.5,
  };

  const contentStyle: CSSProperties = {
    padding: '0 1rem 1rem 1rem',
    overflowY: isOpen ? 'auto' : 'hidden',
    overflowX: 'hidden',
    flex: 1,
    WebkitOverflowScrolling: 'touch',
    visibility: isOpen ? 'visible' : 'hidden',
  };

  return (
    <div style={drawerStyle}>
      <div style={handleStyle} onClick={() => setIsOpen(!isOpen)}>
        <div style={handleBarStyle} />
      </div>
      <div style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
