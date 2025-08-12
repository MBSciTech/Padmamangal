import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import UnoRoom from './UnoRoom';
import LudoRoom from './LudoRoom';

export default function GamesHub() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 16 }}>
      <h2>Games</h2>
      <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="chip" onClick={() => navigate('uno')}>UNO</button>
        <button className="chip" onClick={() => navigate('ludo')}>Ludo</button>
      </nav>
      <Routes>
        <Route path="uno/*" element={<UnoRoom />} />
        <Route path="ludo/*" element={<LudoRoom />} />
        <Route index element={<div>Select a game above.</div>} />
      </Routes>
    </div>
  );
}

