import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

export default function PollMessage({ db, roomId, message, currentUid }) {
  const [votes, setVotes] = useState({}); // uid -> optionId

  useEffect(() => {
    if (!db || !roomId || !message?.id) return;
    const votesCol = collection(db, 'rooms', roomId, 'messages', message.id, 'votes');
    const unsub = onSnapshot(votesCol, (snap) => {
      const map = {};
      snap.forEach((d) => { const v = d.data(); map[d.id] = v.optionId; });
      setVotes(map);
    });
    return () => unsub();
  }, [db, roomId, message?.id]);

  const counts = useMemo(() => {
    const c = {};
    for (const uid in votes) {
      const opt = votes[uid];
      c[opt] = (c[opt] || 0) + 1;
    }
    return c;
  }, [votes]);

  const myVote = votes[currentUid] || null;

  async function castVote(optionId) {
    if (!db || !roomId || !message?.id || !currentUid) return;
    const voteRef = doc(db, 'rooms', roomId, 'messages', message.id, 'votes', currentUid);
    await setDoc(voteRef, { optionId, createdAt: serverTimestamp() });
  }

  return (
    <div className="bubble poll">
      <div className="sender-badge">{message.question || 'Poll'}</div>
      <div className="poll-options">
        {(message.options || []).map((opt) => (
          <button
            key={opt.id}
            className={`poll-option ${myVote === opt.id ? 'selected' : ''}`}
            onClick={() => castVote(opt.id)}
          >
            <div className="text">{opt.text}</div>
            <div className="count">{counts[opt.id] || 0}</div>
          </button>
        ))}
      </div>
      <div className="caption" style={{ marginTop: 6 }}>Tap to vote. Your vote updates in real-time.</div>
    </div>
  );
}

