import React, { useState } from 'react';

export default function PollComposer({ open, onClose, onCreate }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  if (!open) return null;

  function setOption(idx, value) {
    setOptions((prev) => prev.map((v, i) => (i === idx ? value : v)));
  }

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function create() {
    const trimmed = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || trimmed.length < 2) return;
    onCreate?.({ question: question.trim(), options: trimmed });
    onClose?.();
    setQuestion('');
    setOptions(['', '']);
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-card" style={{ background: 'var(--panel,#fff)', color: 'inherit', width: 'min(92vw, 560px)', borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Create a poll</div>
        <input className="input" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
        {options.map((o, i) => (
          <input key={i} className="input" placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOption(i, e.target.value)} />
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="chip" onClick={addOption}>Add option</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="chip" onClick={onClose}>Cancel</button>
            <button className="button primary" onClick={create}>Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}

