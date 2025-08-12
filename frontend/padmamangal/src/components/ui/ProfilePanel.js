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
    
      <div 
        className="modal-overlay" 
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}