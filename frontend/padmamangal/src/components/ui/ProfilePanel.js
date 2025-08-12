import React, { useRef, useState, useEffect } from 'react';
import { updateProfile, signOut } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { FiCamera, FiUser, FiPhone, FiMail, FiLogOut, FiEdit3, FiCheck, FiX, FiShield } from 'react-icons/fi';

export default function ProfilePanel({ open, onClose, user }) {
  const fileRef = useRef(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState(displayName);
  const [tempPhone, setTempPhone] = useState(phone);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setPhone(user?.phoneNumber || '');
    setTempDisplayName(user?.displayName || '');
    setTempPhone(user?.phoneNumber || '');
  }, [user]);

  if (!open) return null;

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose?.();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    setTempDisplayName(displayName);
    setTempPhone(phone);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setTempDisplayName(displayName);
    setTempPhone(phone);
  };

  const saveChanges = async () => {
    setDisplayName(tempDisplayName);
    setPhone(tempPhone);
    await saveProfile();
    setIsEditing(false);
  };

  async function saveProfile(photoURL) {
    if (!auth.currentUser) return;
    setBusy(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName || auth.currentUser.displayName,
        photoURL: photoURL || auth.currentUser.photoURL,
      });
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: displayName || null,
        photoURL: photoURL || null,
        phoneNumber: phone || null,
      }, { merge: true });
      
      if (!isEditing) {
        onClose?.();
      }
    } catch (e) {
      console.error('Save profile error:', e);
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  }

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setBusy(true);
      setUploadProgress(10);
      
      const form = new FormData();
      form.append('file', file);
      
      setUploadProgress(50);
      const res = await fetch('http://localhost:5000/upload', { 
        method: 'POST', 
        body: form 
      });
      
      setUploadProgress(80);
      const data = await res.json();
      if (!data?.url) throw new Error('Upload failed');
      
      setUploadProgress(100);
      await saveProfile(data.url);
    } catch (e) {
      console.error('Upload error:', e);
      setBusy(false);
      setUploadProgress(0);
    }
  }

  return (
    <>
      <div 
        className="modal-overlay" 
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      />
      <div className="profile-panel">
        <div className="panel-header">
          <div className="header-content">
            <div className="header-icon">
              <FiUser size={20} />
            </div>
            <div>
              <h2 className="panel-title">Profile</h2>
              <p className="panel-subtitle">Manage your account information</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={busy}>
            <FiX size={18} />
          </button>
        </div>

        <div className="panel-content">
          {/* Avatar Section */}
          <div className="avatar-section">
            <div className="avatar-container">
              <div className="profile-avatar-large">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="avatar-image" />
                ) : (
                  <span className="avatar-text-large">{getInitials(user)}</span>
                )}
                <div className="avatar-overlay">
                  <button 
                    className="camera-btn" 
                    onClick={() => fileRef.current?.click()} 
                    disabled={busy}
                    title="Change profile picture"
                  >
                    <FiCamera size={16} />
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                hidden 
                onChange={onPick} 
              />
            </div>
            <div className="avatar-info">
              <h3 className="user-name">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </h3>
              <div className="user-status">
                <div className="status-dot" />
                <span>Online</span>
              </div>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="profile-fields">
            <div className="field-group">
              <label className="field-label">
                <FiUser size={16} />
                Display Name
              </label>
              {isEditing ? (
                <input
                  className="field-input editing"
                  placeholder="Enter your display name"
                  value={tempDisplayName}
                  onChange={(e) => setTempDisplayName(e.target.value)}
                  disabled={busy}
                />
              ) : (
                <div className="field-display">
                  {displayName || 'No display name set'}
                </div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">
                <FiPhone size={16} />
                Phone Number
              </label>
              {isEditing ? (
                <input
                  className="field-input editing"
                  placeholder="Enter your phone number"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  disabled={busy}
                />
              ) : (
                <div className="field-display">
                  {phone || 'No phone number set'}
                </div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">
                <FiMail size={16} />
                Email Address
              </label>
              <div className="field-display verified">
                {user?.email}
                <div className="verified-badge">
                  <FiShield size={12} />
                  Verified
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {isEditing ? (
              <div className="edit-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={cancelEditing}
                  disabled={busy}
                >
                  <FiX size={16} />
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={saveChanges}
                  disabled={busy}
                >
                  <FiCheck size={16} />
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="main-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={startEditing}
                  disabled={busy}
                >
                  <FiEdit3 size={16} />
                  Edit Profile
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleSignOut}
                  disabled={busy}
                >
                  <FiLogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        .profile-panel {
          background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .panel-title {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
          line-height: 1;
        }

        .panel-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 4px 0 0 0;
          line-height: 1;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.9);
        }

        .panel-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .avatar-container {
          position: relative;
        }

        .profile-avatar-large {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255, 255, 255, 0.1);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-text-large {
          font-size: 28px;
          font-weight: 600;
          color: white;
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .avatar-container:hover .avatar-overlay {
          opacity: 1;
        }

        .camera-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .camera-btn:hover {
          background: white;
          transform: scale(1.05);
        }

        .upload-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 0 0 17px 17px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .avatar-info {
          flex: 1;
        }

        .user-name {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }

        .user-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: rgba(34, 197, 94, 0.9);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s infinite;
        }

        .profile-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field-input {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #ffffff;
          font-size: 15px;
          transition: all 0.2s ease;
        }

        .field-input:focus {
          outline: none;
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .field-input.editing {
          border-color: rgba(102, 126, 234, 0.3);
          background: rgba(255, 255, 255, 0.08);
        }

        .field-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .field-display {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          min-height: 19px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .field-display.verified {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.2);
        }

        .verified-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 6px;
          font-size: 11px;
          color: rgba(34, 197, 94, 0.9);
          font-weight: 500;
        }

        .action-buttons {
          margin-top: 8px;
        }

        .edit-actions,
        .main-actions {
          display: flex;
          gap: 12px;
        }

        .edit-actions {
          flex-direction: row-reverse;
        }

        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          flex: 1;
          min-height: 44px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.9);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: rgba(239, 68, 68, 0.9);
        }

        .btn-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: rgba(239, 68, 68, 1);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .profile-panel {
            margin: 0;
            border-radius: 20px 20px 0 0;
            max-height: 85vh;
          }

          .panel-header {
            padding: 20px;
          }

          .panel-content {
            padding: 20px;
            gap: 24px;
          }

          .avatar-section {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .profile-avatar-large {
            width: 100px;
            height: 100px;
          }

          .avatar-text-large {
            font-size: 36px;
          }

          .user-name {
            font-size: 18px;
          }

          .edit-actions,
          .main-actions {
            flex-direction: column;
          }

          .edit-actions {
            flex-direction: column-reverse;
          }
        }

        @media (max-width: 480px) {
          .modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .profile-panel {
            border-radius: 20px 20px 0 0;
            max-height: 90vh;
          }

          .panel-header {
            padding: 16px;
          }

          .panel-content {
            padding: 16px;
            gap: 20px;
          }

          .header-icon {
            width: 36px;
            height: 36px;
          }

          .panel-title {
            font-size: 18px;
          }
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Scrollbar styling */
        .profile-panel::-webkit-scrollbar {
          width: 6px;
        }

        .profile-panel::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .profile-panel::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .profile-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Light mode support */
        @media (prefers-color-scheme: light) {
          .profile-panel {
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border-color: rgba(0, 0, 0, 0.1);
            color: #1f2937;
          }

          .panel-header {
            border-color: rgba(0, 0, 0, 0.1);
            background: rgba(0, 0, 0, 0.02);
          }

          .panel-title {
            color: #1f2937;
          }

          .panel-subtitle {
            color: rgba(0, 0, 0, 0.6);
          }

          .close-btn {
            background: rgba(0, 0, 0, 0.1);
            color: rgba(0, 0, 0, 0.7);
          }

          .close-btn:hover {
            background: rgba(0, 0, 0, 0.15);
            color: rgba(0, 0, 0, 0.9);
          }

          .user-name {
            color: #1f2937;
          }

          .field-label {
            color: rgba(0, 0, 0, 0.8);
          }

          .field-input {
            background: rgba(0, 0, 0, 0.05);
            border-color: rgba(0, 0, 0, 0.1);
            color: #1f2937;
          }

          .field-input:focus {
            border-color: rgba(102, 126, 234, 0.5);
            background: rgba(0, 0, 0, 0.08);
          }

          .field-display {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(0, 0, 0, 0.08);
            color: rgba(0, 0, 0, 0.9);
          }

          .btn-secondary {
            background: rgba(0, 0, 0, 0.1);
            border-color: rgba(0, 0, 0, 0.2);
            color: rgba(0, 0, 0, 0.9);
          }

          .btn-secondary:hover:not(:disabled) {
            background: rgba(0, 0, 0, 0.15);
            border-color: rgba(0, 0, 0, 0.3);
          }
        }
      `}</style>
    </>
  );
}