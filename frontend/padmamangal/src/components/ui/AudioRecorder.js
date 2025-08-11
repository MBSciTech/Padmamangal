import React, { useEffect, useRef, useState } from "react";
import { FiMic, FiSquare, FiPlay, FiPause } from "react-icons/fi";

export default function AudioRecorder({ onSend, busy, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm'))
        ? 'audio/webm' : undefined;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) audioChunksRef.current.push(evt.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        // stop all tracks after capture
        try { stream.getTracks().forEach((t) => t.stop()); } catch {}
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access failed:', err);
      onError?.(err);
    }
  }

  function stop() {
    try { mediaRecorderRef.current?.stop(); } finally { setIsRecording(false); }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  }

  function clearClip() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setIsPlaying(false);
  }

  async function send() {
    if (!blobUrl || busy) return;
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    await onSend?.(blob);
    clearClip();
  }

  return (
    <div className="audio-recorder">
      {!blobUrl ? (
        <button
          className={`icon-btn pulse ${isRecording ? 'active' : ''}`}
          title={isRecording ? 'Stop' : 'Record voice'}
          onClick={isRecording ? stop : start}
          disabled={busy}
        >
          {isRecording ? <FiSquare /> : <FiMic />}
        </button>
      ) : (
        <div className="clip-bar">
          <button className="icon-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <FiPause /> : <FiPlay />}
          </button>
          <div className={`eq ${isPlaying ? 'on' : ''}`}>
            <span></span><span></span><span></span><span></span>
          </div>
          <audio ref={audioRef} src={blobUrl} preload="metadata" />
          <div className="clip-actions">
            <button className="chip" onClick={clearClip} disabled={busy}>Discard</button>
            <button className="button primary" onClick={send} disabled={busy}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

