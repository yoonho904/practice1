import React from 'react';

/**
 * PLACEHOLDER ATOM CONTROL PANEL
 *
 * Original control panel was heavily integrated with deleted visualization system.
 * This placeholder prevents build errors while the new system is developed.
 */
export function AtomControlPanel() {
  return (
    <div style={{
      padding: '1rem',
      background: '#2d2d30',
      borderRadius: '6px',
      border: '1px solid #444',
      color: '#fff'
    }}>
      <h4 style={{ margin: '0 0 1rem 0' }}>Atom Controls</h4>
      <p style={{ margin: '0.5rem 0', fontSize: '0.9em', opacity: 0.7 }}>
        Control panel temporarily disabled during system reconstruction.
      </p>
      <div style={{
        marginTop: '1rem',
        fontSize: '0.8em',
        opacity: 0.5
      }}>
        Will be rebuilt with new backend integration.
      </div>
    </div>
  );
}