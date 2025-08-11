import React from "react";
import { FiPhoneCall, FiVideo } from "react-icons/fi";

export default function CallButtons({ onAudioCall, onVideoCall }) {
  
  return (
    <div className="call-buttons">
      <button className="icon-btn" title="Start audio call" onClick={onAudioCall}><FiPhoneCall /></button>
      <button className="icon-btn" title="Start video call" onClick={onVideoCall}><FiVideo /></button>
    </div>
  );
}

