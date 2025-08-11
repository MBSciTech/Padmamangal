import React from 'react';
import { FiPhone, FiPhoneIncoming, FiVideo, FiX } from 'react-icons/fi';

export default function IncomingCallModal({ open, callerName, kind, onAccept, onDecline }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-card" style={{ background: 'var(--panel,#fff)', color: 'inherit', width: 'min(92vw, 480px)', borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Incoming {kind === 'video' ? 'Video' : 'Audio'} Call</div>
        <div style={{ color: 'var(--muted,#64748b)' }}>{callerName || 'Someone'} is calling…</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="chip" onClick={onDecline}><FiX /> Decline</button>
          <button className="button primary" onClick={onAccept}>{kind === 'video' ? <FiVideo /> : <FiPhoneIncoming />} Accept</button>
        </div>
      </div>
    </div>
  );
}

