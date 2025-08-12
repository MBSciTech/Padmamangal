import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import GameLayout from './GameLayout';

function createRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function UnoRoom() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'unoRooms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function createRoom() {
    const rid = createRoomId();
    await setDoc(doc(db, 'unoRooms', rid), {
      createdAt: serverTimestamp(),
      owner: user?.uid,
      started: false,
      players: {},
      deckTop: { color: 'red', value: '5' },
    });
    setRoomId(rid);
  }

  async function joinRoom(id) {
    if (!id) return;
    setRoomId(id);
    await updateDoc(doc(db, 'unoRooms', id), {
      [`players.${user.uid}`]: { displayName: user.displayName || user.email || 'Player' },
    });
  }

  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'unoRooms', roomId), (snap) => {
      const data = snap.data();
      setRoom({ id: roomId, ...data });
      setPlayers(Object.entries(data?.players || {}).map(([uid, p]) => ({ uid, ...p })));
    });
    return () => unsub();
  }, [roomId]);

  return (
    <GameLayout title="UNO" subtitle="Create a room and invite family" accent="#F59E0B">
      <div className="game-panel" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button className="game-btn" onClick={createRoom} disabled={!user}>Create room</button>
        <input className="input" placeholder="Enter room id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <button className="game-btn" onClick={() => joinRoom(roomId)} disabled={!user || !roomId}>Join</button>
        {room && <span className="game-chip">Room <b>{room.id}</b></span>}
      </div>
      {room && (
        <div className="game-panel" style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {players.map((p) => (
              <span key={p.uid} className="game-chip">{p.displayName}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className={`uno-card ${room.deckTop.color}`}>{room.deckTop.value}</div>
            <div style={{ color: '#93c5fd' }}>Top card</div>
          </div>
          <div style={{ color: '#9CA3AF' }}>Gameplay to be implemented: draw/play cards, turns, etc.</div>
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

