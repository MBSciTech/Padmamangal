import React, { useEffect, useState } from 'react';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import GameLayout from './GameLayout';

function createRoomId() { return Math.random().toString(36).slice(2, 8); }

export default function LudoRoom() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);

  useEffect(() => { const u = onAuthStateChanged(auth, setUser); return () => u(); }, []);
  useEffect(() => {
    const q = query(collection(db, 'ludoRooms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  async function createRoom() {
    const rid = createRoomId();
    await setDoc(doc(db, 'ludoRooms', rid), {
      createdAt: serverTimestamp(),
      owner: user?.uid,
      started: false,
      players: {},
      boardState: {},
    });
    setRoomId(rid);
  }
  async function joinRoom(id) {
    if (!id) return;
    setRoomId(id);
    await updateDoc(doc(db, 'ludoRooms', id), {
      [`players.${user.uid}`]: { displayName: user.displayName || user.email || 'Player' },
    });
  }
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'ludoRooms', roomId), (snap) => setRoom({ id: roomId, ...snap.data() }));
    return () => unsub();
  }, [roomId]);

  return (
    <GameLayout title="Ludo" subtitle="Create a room and invite family" accent="#10B981">
      <div className="game-panel" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button className="game-btn" onClick={createRoom} disabled={!user}>Create room</button>
        <input className="input" placeholder="Enter room id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <button className="game-btn" onClick={() => joinRoom(roomId)} disabled={!user || !roomId}>Join</button>
        {room && <span className="game-chip">Room <b>{room.id}</b></span>}
      </div>
      {room && (
        <div className="game-panel" style={{ display: 'grid', gap: 12 }}>
          <div className="ludo-grid">
            {Array.from({ length: 225 }).map((_, i) => (
              <div key={i} className={`ludo-cell ${i % 2 ? 'alt' : ''}`} />
            ))}
          </div>
          <div style={{ color: '#9CA3AF' }}>Gameplay to be implemented: piece movement, dice, turns, etc.</div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>Recent rooms</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {rooms.map((r) => (
            <button key={r.id} className="game-btn" onClick={() => joinRoom(r.id)}>{r.id}</button>
          ))}
        </div>
      </div>
    </GameLayout>
  );
}

