import React from 'react';

const EMOJIS = ['👍','❤️','😂','🎉','😮','😢','🙏'];

export default function ReactionsBar({ onReact }) {
  return (
    <div className="reactions-bar">
      {EMOJIS.map((e) => (
        <button key={e} className="reaction-btn" onClick={() => onReact?.(e)}>{e}</button>
      ))}
    </div>
  );
}

