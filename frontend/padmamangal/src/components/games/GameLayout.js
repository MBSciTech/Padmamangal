import React from 'react';

export default function GameLayout({ title, subtitle, children, accent = '#8B5CF6' }) {
  return (
    <div className="game-shell">
      <div className="game-hero" style={{ '--accent': accent }}>
        <div className="game-title">{title}</div>
        {subtitle && <div className="game-subtitle">{subtitle}</div>}
      </div>
      <div className="game-content">
        {children}
      </div>
    </div>
  );
}

