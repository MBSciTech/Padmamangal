import React from "react";
import { FiImage, FiFileText, FiBarChart2, FiMapPin, FiX } from "react-icons/fi";

function AttachmentTile({ icon: Icon, label, onClick }) {
  return (
    <button
      className="attach-tile"
      onClick={onClick}
      type="button"
    >
      <div className="tile-icon"><Icon size={22} /></div>
      <div className="tile-label">{label}</div>
    </button>
  );
}

export default function AttachmentSheet({ open, onClose, onSelect }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="sheet-panel">
        <div className="sheet-header">
          <div>Add to chat</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <div className="sheet-grid">
          <AttachmentTile icon={FiBarChart2} label="Poll" onClick={() => onSelect?.("poll")} />
          <AttachmentTile icon={FiFileText} label="Document" onClick={() => onSelect?.("document")} />
          <AttachmentTile icon={FiImage} label="Image/Video" onClick={() => onSelect?.("image")} />
          <AttachmentTile icon={FiMapPin} label="Location" onClick={() => onSelect?.("location")} />
        </div>
      </div>
    </div>
  );
}

