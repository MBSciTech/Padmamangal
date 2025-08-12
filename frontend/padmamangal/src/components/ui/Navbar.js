import React, { useState } from 'react';
import { FiMessageSquare, FiTarget, FiBell, FiBookOpen, FiCalendar, FiLock } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../config/firebase';
import ProfilePanel from './ProfilePanel';

const items = [
  { key: 'chat', label: 'Chat', Icon: FiMessageSquare },
  { key: 'games', label: 'Games', Icon: FiTarget },
  { key: 'announcement', label: 'Announcement', Icon: FiBell },
  { key: 'recipe', label: 'Recipe', Icon: FiBookOpen },
  { key: 'calendar', label: 'Calendar', Icon: FiCalendar },
  { key: 'vault', label: 'Vault', Icon: FiLock },
];

export default function Navbar({ activeKey = 'chat', onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileHover, setProfileHover] = useState(false);
  const user = auth.currentUser;
  
  const isAuthPage = location.pathname.startsWith('/login') || 
                     location.pathname.startsWith('/signup') || 
                     location.pathname.startsWith('/phone');
  
  if (isAuthPage) return null;

  const getInitials = (user) => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <nav className="app-navbar" role="navigation" aria-label="Primary">
        <div className="nav-container">
          <div className="nav-brand">
            <h1 className="brand-text">Padmamangal</h1>
          </div>
          
          <div className="nav-items-wrapper">
            <div className="nav-active-indicator" />
            {items.map(({ key, label, Icon }, index) => {
              const isActive = key === activeKey;
              return (
                <button
                  key={key}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate?.(key)}
                  title={label}
                  style={{
                    '--item-index': index,
                    '--active-index': items.findIndex(item => item.key === activeKey)
                  }}
                >
                  <span className="nav-icon">
                    <Icon size={18} />
                  </span>
                  <span className="nav-label">{label}</span>
                  <div className="nav-ripple" />
                </button>
              );
            })}
          </div>

          <div className="nav-profile-section">
            <button 
              className={`nav-profile ${profileHover ? 'hover' : ''}`}
              onClick={() => setOpen(true)}
              onMouseEnter={() => setProfileHover(true)}
              onMouseLeave={() => setProfileHover(false)}
              title="Profile"
            >
              <div className="profile-avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="avatar-image" />
                ) : (
                  <span className="avatar-text">{getInitials(user)}</span>
                )}
                <div className="profile-status" />
              </div>
              <div className="profile-info">
                <span className="profile-name">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="profile-status-text">Online</span>
              </div>
            </button>
          </div>
        </div>
      </nav>
      
      <ProfilePanel open={open} onClose={() => setOpen(false)} user={user} />

      <style jsx>{`
        .app-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(17, 17, 17, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-container {
          display: flex;
          height: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .nav-brand {
          flex-shrink: 0;
        }

        .brand-text {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .nav-items-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          justify-content: center;
          max-width: 600px;
        }

        .nav-active-indicator {
          position: absolute;
          bottom: -8px;
          height: 3px;
          width: calc(100% / 6 - 8px);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 2px;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateX(calc(var(--active-index, 0) * (100% + 8px)));
          box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
        }

        .nav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 16px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          border-radius: 12px;
          min-height: 48px;
          flex: 1;
          max-width: 100px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-item:hover {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }

        .nav-item.active {
          color: #fff;
          background: rgba(102, 126, 234, 0.15);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-item:hover .nav-icon {
          transform: scale(1.1);
        }

        .nav-item.active .nav-icon {
          transform: scale(1.05);
          filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.4));
        }

        .nav-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.3px;
          white-space: nowrap;
          opacity: 0.9;
          transition: opacity 0.3s ease;
        }

        .nav-ripple {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, transparent 70%);
          opacity: 0;
          transform: scale(0);
          transition: all 0.4s ease;
          pointer-events: none;
        }

        .nav-item:active .nav-ripple {
          opacity: 1;
          transform: scale(1);
        }

        .nav-profile-section {
          flex-shrink: 0;
        }

        .nav-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: rgba(255, 255, 255, 0.9);
        }

        .nav-profile:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(102, 126, 234, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .profile-avatar {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-text {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .profile-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid rgba(17, 17, 17, 0.95);
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-right: 8px;
        }

        .profile-name {
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
        }

        .profile-status-text {
          font-size: 10px;
          color: rgba(34, 197, 94, 0.8);
          line-height: 1;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .app-navbar {
            top: auto;
            bottom: 0;
            height: 72px;
            border-bottom: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(17, 17, 17, 0.98);
            padding-bottom: env(safe-area-inset-bottom);
          }

          .nav-container {
            padding: 0 16px;
            gap: 12px;
          }

          .nav-brand {
            display: none;
          }

          .nav-items-wrapper {
            max-width: none;
            gap: 4px;
          }

          .nav-active-indicator {
            top: 4px;
            bottom: auto;
            height: 2px;
          }

          .nav-item {
            padding: 4px 8px;
            min-height: 52px;
            gap: 2px;
            max-width: none;
            flex: 1;
          }

          .nav-label {
            font-size: 9px;
          }

          .nav-profile {
            padding: 4px;
            border-radius: 16px;
            gap: 0;
            min-width: 44px;
          }

          .profile-avatar {
            width: 32px;
            height: 32px;
          }

          .profile-info {
            display: none;
          }

          .profile-status {
            width: 8px;
            height: 8px;
            bottom: 1px;
            right: 1px;
            border-width: 1.5px;
          }
        }

        /* Small mobile devices */
        @media (max-width: 480px) {
          .nav-container {
            padding: 0 12px;
            gap: 8px;
          }

          .nav-item {
            padding: 4px 6px;
            gap: 1px;
          }

          .nav-label {
            font-size: 8px;
          }

          .profile-avatar {
            width: 28px;
            height: 28px;
          }

          .avatar-text {
            font-size: 12px;
          }
        }

        /* Desktop hover effects */
        @media (hover: hover) {
          .nav-item::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: inherit;
          }

          .nav-item:hover::before {
            opacity: 1;
          }
        }

        /* Accessibility */
        .nav-item:focus,
        .nav-profile:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
        }

        .nav-item:focus:not(:focus-visible),
        .nav-profile:focus:not(:focus-visible) {
          box-shadow: none;
        }

        /* Light mode support */
        @media (prefers-color-scheme: light) {
          .app-navbar {
            background: rgba(255, 255, 255, 0.95);
            border-color: rgba(0, 0, 0, 0.1);
          }

          .brand-text {
            color: #1f2937;
            background: none;
            -webkit-text-fill-color: initial;
          }

          .nav-item {
            color: rgba(0, 0, 0, 0.6);
          }

          .nav-item:hover {
            color: rgba(0, 0, 0, 0.9);
            background: rgba(0, 0, 0, 0.05);
          }

          .nav-item.active {
            color: #333;
            background: rgba(102, 126, 234, 0.1);
          }

          .nav-profile {
            background: rgba(0, 0, 0, 0.05);
            border-color: rgba(0, 0, 0, 0.1);
            color: rgba(0, 0, 0, 0.9);
          }

          .nav-profile:hover {
            background: rgba(0, 0, 0, 0.1);
          }

          .profile-status {
            border-color: rgba(255, 255, 255, 0.95);
          }
        }
      `}</style>
    </>
  );
}