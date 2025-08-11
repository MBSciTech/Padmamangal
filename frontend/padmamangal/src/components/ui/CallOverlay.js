import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff } from 'react-icons/fi';
import { Room, RoomEvent, createLocalTracks, Track, setLogLevel, LogLevel } from 'livekit-client';

export default function CallOverlay({ open, onClose, tokenFetcher, roomName, kind = 'video', wsUrl }) {
  const [room, setRoom] = useState(null);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(kind === 'video');
  const containerRef = useRef(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connectRoom = useCallback(async () => {
    if (!open) return;
    try {
      if (!wsUrl) {
        throw new Error('LiveKit WebSocket URL is not configured');
      }
      setError(null);
      setConnecting(true);
      setLogLevel(LogLevel.warn);
      const token = await tokenFetcher(roomName);
      const lkRoom = new Room({ adaptiveStream: true, dynacast: true });
      setRoom(lkRoom);
      const tracks = await createLocalTracks({ audio: true, video: kind === 'video' });
      await lkRoom.connect(wsUrl, token);
      for (const t of tracks) {
        await lkRoom.localParticipant.publishTrack(t);
      }
      setJoined(true);
      setConnecting(false);
      attachParticipants(lkRoom);
      lkRoom.on(RoomEvent.ParticipantConnected, () => attachParticipants(lkRoom));
      lkRoom.on(RoomEvent.ParticipantDisconnected, () => attachParticipants(lkRoom));
      lkRoom.on(RoomEvent.TrackSubscribed, () => attachParticipants(lkRoom));
      lkRoom.on(RoomEvent.TrackUnsubscribed, () => attachParticipants(lkRoom));
    } catch (e) {
      console.error('LiveKit connect failed', e);
      setError(e?.message || 'Failed to join call');
      setConnecting(false);
    }
  }, [open, kind, roomName, tokenFetcher, wsUrl]);

  function attachParticipants(lkRoom) {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    const participants = [lkRoom.localParticipant, ...Array.from(lkRoom.participants.values())];
    for (const p of participants) {
      for (const pub of p.tracks.values()) {
        const track = pub.track;
        if (!track) continue;
        const el = track.attach();
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'cover';
        const tile = document.createElement('div');
        tile.className = 'video-tile';
        tile.appendChild(el);
        container.appendChild(tile);
      }
    }
  }

  useEffect(() => {
    if (open) connectRoom();
    return () => {
      if (room) {
        try { room.disconnect(); } catch {}
      }
      setRoom(null);
      setJoined(false);
    };
  }, [open]);

  async function toggleMic() {
    if (!room) return;
    const enable = !micOn;
    await room.localParticipant.setMicrophoneEnabled(enable);
    setMicOn(enable);
  }

  async function toggleCam() {
    if (!room) return;
    const enable = !camOn;
    await room.localParticipant.setCameraEnabled(enable);
    setCamOn(enable);
  }

  if (!open) return null;
  return (
    <div className="call-overlay">
      <div className="call-panel">
        <div className="call-title">{kind === 'video' ? 'Video Call' : 'Audio Call'}</div>
        {connecting && <div style={{ padding: 12 }}>Connecting…</div>}
        {error && <div className="message error" style={{ marginBottom: 8 }}>{error}</div>}
        <div ref={containerRef} className="video-row" style={{ gridTemplateColumns: kind === 'video' ? '2fr 1fr' : '1fr' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
          <button className={`icon-btn ${micOn ? '' : 'recording'}`} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
            {micOn ? <FiMic /> : <FiMicOff />}
          </button>
          {kind === 'video' && (
            <button className="icon-btn" onClick={toggleCam} title={camOn ? 'Turn camera off' : 'Turn camera on'}>
              {camOn ? <FiVideo /> : <FiVideoOff />}
            </button>
          )}
          <button className="button primary" onClick={onClose}><FiPhoneOff /> End</button>
        </div>
      </div>
    </div>
  );
}

