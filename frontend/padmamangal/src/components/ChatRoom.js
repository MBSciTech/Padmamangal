import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../config/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { FaEdit, FaTrash, FaPaperclip } from "react-icons/fa";
import { FiPhoneCall, FiVideo, FiPaperclip } from "react-icons/fi";
import { IoMdArrowDown } from "react-icons/io";
import { useToast } from "./ui/ToastProvider";
import AttachmentSheet from "./ui/AttachmentSheet";
import AudioRecorder from "./ui/AudioRecorder";
import CallButtons from "./ui/CallButtons";
import IncomingCallModal from "./ui/IncomingCallModal";
import PollMessage from "./ui/PollMessage";
import PollComposer from "./ui/PollComposer";
import ReactionsBar from "./ui/ReactionsBar";
import CallOverlay from "./ui/CallOverlay";

const GROUP_ROOM_ID = "padmamangal-group";
function computeDirectRoomId(uidA, uidB) {
  return [uidA, uidB].sort().join("__");
}

function ChatRoom() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [longPressedMsgId, setLongPressedMsgId] = useState(null);
  const [users, setUsers] = useState([]);
  const [userIdToProfile, setUserIdToProfile] = useState({});
  const [activeRoom, setActiveRoom] = useState({ id: GROUP_ROOM_ID, name: "Padmamangal", isGroup: true });
  const [isNarrow, setIsNarrow] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callKind, setCallKind] = useState('audio');
  const [incomingCall, setIncomingCall] = useState(null);
  const [showPollComposer, setShowPollComposer] = useState(false);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { show } = useToast();
  const [showScrollDown, setShowScrollDown] = useState(false);
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) {
        navigate("/login", { replace: true });
      } else {
        show(`Welcome ${u.email || "back"}!`, { type: "success" });
      }
    });
    return () => unsub();
  }, [navigate, show]);

  useEffect(() => {
    if (!user) return;
    async function ensureGroupExists() {
      const roomRef = doc(db, "rooms", GROUP_ROOM_ID);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        await setDoc(roomRef, {
          name: "Padmamangal",
          isGroup: true,
          createdAt: serverTimestamp(),
        });
      }
    }
    async function ensureUserProfile() {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
          });
        } else {
          await setDoc(
            userRef,
            { email: user.email || null, displayName: user.displayName || null, photoURL: user.photoURL || null },
            { merge: true }
          );
        }
      } catch (e) {}
    }
    ensureGroupExists();
    ensureUserProfile();
  }, [user]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'calls'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      for (const d of snap.docs) {
        const c = { id: d.id, ...d.data() };
        if (c.to === user.uid && c.status === 'ringing') {
          setIncomingCall(c);
          break;
        }
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const usersQuery = query(collection(db, "users"), orderBy("email"));
    const unsub = onSnapshot(usersQuery, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.id !== user.uid);
      setUsers(list);
      const map = {};
      for (const d of snap.docs) map[d.id] = d.data();
      setUserIdToProfile(map);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !activeRoom?.id) return;
    const msgsQuery = query(
      collection(db, "rooms", activeRoom.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(msgsQuery, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
      const el = listRef.current;
      const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 120 : true;
      if (nearBottom) {
        queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      } else {
        setShowScrollDown(true);
      }
    });
    return () => unsub();
  }, [user, activeRoom?.id]);

  // Track viewport width to enable mobile/desktop modes
  useEffect(() => {
    const onResize = () => {
      const narrow = window.innerWidth <= 768;
      setIsNarrow(narrow);
      if (!narrow) setShowSidebar(true); // always show sidebar on desktop
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function sendTextMessage() {
    const value = text.trim();
    if (!value || !user) return;
    setIsSending(true);
    await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
      type: "text",
      text: value,
      uid: user.uid,
      email: user.email || null,
      createdAt: serverTimestamp(),
    });
    setText("");
    setIsSending(false);
    show("Message sent", { type: "success", duration: 1500 });
  }

  const inferContentTypeFromFilename = (filename) => {
    const lower = (filename || "").toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.heif')) return 'image/heif';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.m4a')) return 'audio/m4a';
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.wav')) return 'audio/wav';
    return 'application/octet-stream';
  };

  async function uploadAndSend(file, captionText = "") {
    if (!file || !user) return;
    setIsSending(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed with status ${res.status}`);
      }
      const data = await res.json();
      if (!data?.url) throw new Error("No URL returned from upload server");

      const chosenContentType = (file.type && file.type.trim()) || inferContentTypeFromFilename(file.name);
      const ctLower = chosenContentType.toLowerCase();
      let msgType = "file";
      if (ctLower.startsWith("image/")) msgType = "image";
      else if (ctLower.startsWith("video/")) msgType = "video";
      else if (ctLower.startsWith("audio/")) msgType = "audio";

      const trimmedCaption = (captionText || "").trim();
      const payload = {
        type: msgType,
        url: data.url,
        fileName: file.name,
        contentType: chosenContentType,
        uid: user.uid,
        email: user.email || null,
        createdAt: serverTimestamp(),
      };
      if (trimmedCaption) payload.caption = trimmedCaption;

      await addDoc(collection(db, "rooms", activeRoom.id, "messages"), payload);

      show("Uploaded", { type: "success", duration: 1500 });
    } catch (err) {
      console.error("Upload failed:", err);
      show(`Upload failed: ${err?.message || err}`, { type: "error" });
    } finally {
      setIsSending(false);
    }
  }
  

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (file) {
      // Open caption modal instead of immediate upload
      try {
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
        setPendingCaption("");
        setShowUploadModal(true);
      } catch (_) {
        // Fallback: if preview cannot be created, still allow caption entry
        setPendingFile(file);
        setPendingPreviewUrl(null);
        setPendingCaption("");
        setShowUploadModal(true);
      }
    }
    e.target.value = "";
  }

  function closeUploadModal() {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setShowUploadModal(false);
    setPendingFile(null);
    setPendingCaption("");
    setPendingPreviewUrl(null);
  }

  async function confirmUpload() {
    const file = pendingFile;
    const caption = pendingCaption;
    try {
      await uploadAndSend(file, caption);
      closeUploadModal();
    } catch (_) {
      // uploadAndSend already toasts errors
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : undefined;
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) audioChunksRef.current.push(evt.data);
      };
      mr.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
          await uploadVoiceMessage(blob);
        } catch (err) {
          show("Failed to send voice message", { type: "error" });
        } finally {
          audioChunksRef.current = [];
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((t) => t.stop());
            audioStreamRef.current = null;
          }
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (err) {
      show("Microphone permission denied", { type: "error" });
    }
  }

  function stopRecording() {
    try {
      mediaRecorderRef.current?.stop();
    } finally {
      setIsRecording(false);
    }
  }

  function toggleRecording() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  async function uploadVoiceMessage(blob) {
    if (!blob || !user) return;
    const filename = `voice-${Date.now()}.webm`;
    const path = `uploads/${activeRoom.id}/${user.uid}/${filename}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: "audio/webm" });
    const url = await getDownloadURL(storageRef);
    await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
      type: "audio",
      url,
      fileName: filename,
      contentType: "audio/webm",
      uid: user.uid,
      email: user.email || null,
      createdAt: serverTimestamp(),
    });
    show("Voice message sent", { type: "success", duration: 1500 });
  }

  function shareLocation() {
    if (!navigator.geolocation) {
      show("Geolocation not supported", { type: "error" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
            type: "location",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            uid: user?.uid,
            email: user?.email || null,
            createdAt: serverTimestamp(),
          });
          show("Location shared", { type: "success", duration: 1500 });
        } catch (e) {
          show("Failed to share location", { type: "error" });
        }
      },
      async () => {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.latitude && data.longitude) {
          await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
            type: "location",
            latitude: data.latitude,
            longitude: data.longitude,
            uid: user?.uid,
            email: user?.email || null,
            createdAt: serverTimestamp(),
          });
          show("Approximate location shared", { type: "success", duration: 1500 });
        } else {
          show("Unable to fetch location", { type: "error" });
        }
      }
    );
  }

  async function deleteMessage(id) {
    await deleteDoc(doc(db, "rooms", activeRoom.id, "messages", id));
    setLongPressedMsgId(null);
  }

  function startEditing(message) {
    setText(message.text);
    setEditingMessageId(message.id);
    setLongPressedMsgId(null);
  }

  async function updateMessage() {
    if (!editingMessageId) return;
    await updateDoc(doc(db, "rooms", activeRoom.id, "messages", editingMessageId), {
      text,
      editedAt: serverTimestamp(),
    });
    setText("");
    setEditingMessageId(null);
  }

  // Sidebar interactions
  async function openDirectChat(otherUser) {
    if (!user || !otherUser?.id) return;
    const roomId = [user.uid, otherUser.id].sort().join("__");
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      await setDoc(roomRef, { isGroup: false, members: [user.uid, otherUser.id], createdAt: serverTimestamp() });
    }
    setActiveRoom({ id: roomId, name: otherUser.displayName || otherUser.email || "Direct chat", isGroup: false });
    if (isNarrow) setShowSidebar(false);
  }

  function openGroupChat() {
    setActiveRoom({ id: GROUP_ROOM_ID, name: "Padmamangal", isGroup: true });
    if (isNarrow) setShowSidebar(false);
  }

  function backToList() {
    if (isNarrow) setShowSidebar(true);
  }

  function handleLongPress(id) {
    setLongPressedMsgId(id);
  }

  function handlePressCancel() {
    setLongPressedMsgId(null);
  }

  function displayNameOf(uid) {
    const p = userIdToProfile[uid];
    return p?.displayName || p?.firstName || p?.email?.split('@')[0] || uid?.slice(0, 6) || 'User';
  }

  function pickColor(uid) {
    const palette = [
      '#2563eb', '#16a34a', '#db2777', '#f59e0b', '#7c3aed', '#0ea5e9', '#dc2626', '#059669'
    ];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  return (
    <div className={`chat-shell ${isNarrow ? "narrow" : ""} ${isNarrow && showSidebar ? "show-list" : isNarrow ? "show-chat" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">Chats</div>
        <div className={`room-item ${activeRoom.id === GROUP_ROOM_ID ? "active" : ""}`} onClick={openGroupChat}>
          <div className="avatar group">P</div>
          <div className="room-texts">
            <div className="room-name">Padmamangal</div>
            <div className="room-sub">Group</div>
          </div>
        </div>
        <div className="sidebar-section">Direct messages</div>
        {users.map((u) => (
          <div
            key={u.id}
            className={`room-item ${activeRoom.id === computeDirectRoomId(user?.uid || "", u.id) ? "active" : ""}`}
            onClick={() => openDirectChat(u)}
          >
            <div className="avatar">{(u.displayName || u.email || "?").charAt(0).toUpperCase()}</div>
            <div className="room-texts">
              <div className="room-name">{u.displayName || u.email || "Unknown"}</div>
              <div className="room-sub">Tap to chat</div>
            </div>
          </div>
        ))}
      </aside>

      <div className="chat-container">
        <header className="chat-header">
          <div className="chat-title">
            {isNarrow && !showSidebar && (
              <button className="chip" onClick={backToList} style={{ marginRight: 8 }}>Back</button>
            )}
            {activeRoom.name || "Direct chat"}
          </div>
          <div className="chat-actions">
            <CallButtons onAudioCall={async () => {
                            setCallKind('audio');
                            setCallOpen(true);
                            if (activeRoom?.id && user?.uid) {
                              await addDoc(collection(db, 'calls'), {
                                roomId: activeRoom.id,
                                from: user.uid,
                                to: activeRoom.isGroup ? null : activeRoom.id.replace(user.uid, '').replace('__',''),
                                kind: 'audio',
                                status: 'ringing',
                                createdAt: serverTimestamp(),
                              });
                            }
                          }}
                         onVideoCall={async () => {
                            setCallKind('video');
                            setCallOpen(true);
                            if (activeRoom?.id && user?.uid) {
                              await addDoc(collection(db, 'calls'), {
                                roomId: activeRoom.id,
                                from: user.uid,
                                to: activeRoom.isGroup ? null : activeRoom.id.replace(user.uid, '').replace('__',''),
                                kind: 'video',
                                status: 'ringing',
                                createdAt: serverTimestamp(),
                              });
                            }
                          }} />
            <button className="icon-btn" title="Attach" onClick={() => setShowAttachSheet(true)}>
              <FiPaperclip />
            </button>
            <input type="file" accept="image/*,video/*,audio/*" ref={fileInputRef} onChange={onPickFile} hidden />
          </div>
        </header>

        <main className="chat-messages" ref={listRef} onScroll={() => {
          const el = listRef.current;
          if (!el) return;
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          setShowScrollDown(!nearBottom);
        }}>
        {messages.map((m) => {
          const isMine = m.uid === user?.uid;
          const ts = m.createdAt?.toDate ? m.createdAt.toDate() : null;
          let pressTimer;
          return (
            <div
              key={m.id}
              className={`msg ${isMine ? "me" : ""}`}
              onMouseDown={() => {
                pressTimer = setTimeout(() => handleLongPress(m.id), 600);
              }}
              onMouseUp={() => clearTimeout(pressTimer)}
              onMouseLeave={() => clearTimeout(pressTimer)}
              onTouchStart={() => {
                pressTimer = setTimeout(() => handleLongPress(m.id), 600);
              }}
              onTouchEnd={() => clearTimeout(pressTimer)}
              onTouchCancel={() => clearTimeout(pressTimer)}
            >
              {m.type === "text" && (
                <div className="bubble">
                  <div className="sender-badge" style={{ color: pickColor(m.uid) }}>{displayNameOf(m.uid)}</div>
                  <div>{m.text} {m.editedAt && <small>(edited)</small>}</div>
                  {m.reactions && (
                    <div className="reaction-cloud">
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <span key={emoji}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {m.type === "image" && (
                <div className="bubble media">
                  <div className="sender-badge" style={{ color: pickColor(m.uid) }}>{displayNameOf(m.uid)}</div>
                  <img src={m.url} alt="uploaded" />
                  {m.caption && <div className="caption" style={{ marginTop: 6 }}>{m.caption}</div>}
                  {m.reactions && (
                    <div className="reaction-cloud">
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <span key={emoji}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {m.type === "video" && (
                <div className="bubble media">
                  <div className="sender-badge" style={{ color: pickColor(m.uid) }}>{displayNameOf(m.uid)}</div>
                  <video src={m.url} controls />
                  {m.caption && <div className="caption" style={{ marginTop: 6 }}>{m.caption}</div>}
                  {m.reactions && (
                    <div className="reaction-cloud">
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <span key={emoji}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {m.type === "audio" && (
                <div className="bubble media">
                  <div className="sender-badge" style={{ color: pickColor(m.uid) }}>{displayNameOf(m.uid)}</div>
                  <audio src={m.url} controls />
                  {m.reactions && (
                    <div className="reaction-cloud">
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <span key={emoji}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {m.type === 'poll' && (
                <PollMessage db={db} roomId={activeRoom.id} message={m} currentUid={user?.uid} />
              )}
              {m.type === "file" && (
                <div className="bubble">
                  <div className="sender-badge" style={{ color: pickColor(m.uid) }}>{displayNameOf(m.uid)}</div>
                  <a href={m.url} target="_blank" rel="noreferrer">
                    Download {m.fileName || 'file'}
                  </a>
                  {m.caption && <div className="caption" style={{ marginTop: 6 }}>{m.caption}</div>}
                  {m.reactions && (
                    <div className="reaction-cloud">
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <span key={emoji}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {m.type === "location" && (
                <div className="bubble">
                  <div className="sender-badge" style={{ color: pickColor(m.uid) }}>{displayNameOf(m.uid)}</div>
                  <div className="map-preview">
                    <iframe
                      title="location"
                      width="100%"
                      height="200"
                      style={{ border: 0, borderRadius: 10 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(m.latitude + ',' + m.longitude)}&z=15&output=embed`}
                    />
                    <a href={`https://maps.google.com/?q=${m.latitude},${m.longitude}`} target="_blank" rel="noreferrer" className="map-link">Open in Maps</a>
                  </div>
                  {m.reactions && (
                    <div className="reaction-cloud">
                      {Object.entries(m.reactions).map(([emoji, count]) => (
                        <span key={emoji}>{emoji} {count}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="meta">{(ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "")}</div>
              {isMine && (
                <div className="msg-actions">
                  <button className="msg-more" onClick={() => setLongPressedMsgId(m.id)}>⋯</button>
                  {longPressedMsgId === m.id && (
                    <div className="msg-menu">
                      <button onClick={() => startEditing(m)} className="menu-item"><FaEdit /> Edit</button>
                      <button onClick={() => deleteMessage(m.id)} className="menu-item danger"><FaTrash /> Delete</button>
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <ReactionsBar onReact={async (emoji) => {
                  try {
                    const ref = doc(db, 'rooms', activeRoom.id, 'messages', m.id);
                    const current = m.reactions || {};
                    const next = { ...current, [emoji]: (current[emoji] || 0) + 1 };
                    await updateDoc(ref, { reactions: next });
                  } catch (e) {
                    // ignore
                  }
                }} />
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
        {showScrollDown && (
          <button className="scroll-down" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            <IoMdArrowDown size={20} />
          </button>
        )}
      </main>

      <footer className="chat-input">
        <div className="composer">
          <button className="icon-btn" title="Attach" onClick={() => setShowAttachSheet(true)}>
            <FiPaperclip />
          </button>
          <input
            className="input flex"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={editingMessageId ? "Edit message..." : "Type a message"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                editingMessageId ? updateMessage() : sendTextMessage();
              }
            }}
          />
          <AudioRecorder onSend={uploadVoiceMessage} busy={isSending} />
          <button
            className="button primary"
            onClick={editingMessageId ? updateMessage : sendTextMessage}
            disabled={!text.trim()}
          >
            {editingMessageId ? "Update" : "Send"}
          </button>
        </div>
      </footer>

      <AttachmentSheet
        open={showAttachSheet}
        onClose={() => setShowAttachSheet(false)}
        onSelect={(kind) => {
          setShowAttachSheet(false);
          if (kind === 'image') fileInputRef.current?.click();
          else if (kind === 'location') shareLocation();
          else if (kind === 'document') show('Document upload coming soon', { type: 'info' });
          else if (kind === 'poll') setShowPollComposer(true);
        }}
      />
      <PollComposer
        open={showPollComposer}
        onClose={() => setShowPollComposer(false)}
        onCreate={async ({ question, options }) => {
          const opts = options.map((text, idx) => ({ id: `${idx}`, text }));
          await addDoc(collection(db, 'rooms', activeRoom.id, 'messages'), {
            type: 'poll',
            question,
            options: opts,
            uid: user.uid,
            email: user.email || null,
            createdAt: serverTimestamp(),
          });
        }}
      />
      <IncomingCallModal
        open={!!incomingCall}
        callerName={incomingCall ? displayNameOf(incomingCall.from) : ''}
        kind={incomingCall?.kind || 'audio'}
        onDecline={async () => {
          if (incomingCall) {
            try { await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'declined' }); } catch {}
          }
          setIncomingCall(null);
        }}
        onAccept={async () => {
          if (incomingCall) {
            try { await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'accepted' }); } catch {}
            setCallKind(incomingCall.kind || 'audio');
            setCallOpen(true);
          }
          setIncomingCall(null);
        }}
      />
      <CallOverlay
        open={callOpen}
        onClose={() => setCallOpen(false)}
        kind={callKind}
        roomName={activeRoom.id}
        wsUrl={process.env.REACT_APP_LIVEKIT_WS_URL || 'ws://localhost:7880'}
        tokenFetcher={async (roomName) => {
          const identity = user?.uid || Math.random().toString(36).slice(2, 8);
          const res = await fetch('http://localhost:5000/livekit-token', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName, identity })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Failed to get token');
          return data.token;
        }}
      />
      {showUploadModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeUploadModal();
          }}
        >
          <div
            className="modal-card"
            style={{
              background: 'var(--bg, #111)', color: 'inherit',
              width: 'min(92vw, 560px)', maxHeight: '88vh',
              borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', gap: 12
            }}
          >
            <div style={{ fontWeight: 600 }}>Add a caption</div>
            <div style={{
              borderRadius: 10, overflow: 'hidden', background: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 200
            }}>
              {(() => {
                if (!pendingFile) return null;
                const ct = (pendingFile.type && pendingFile.type.trim()) || inferContentTypeFromFilename(pendingFile.name);
                if (ct.startsWith('image/')) {
                  return <img src={pendingPreviewUrl || ''} alt={pendingFile.name} style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }} />;
                }
                if (ct.startsWith('video/')) {
                  return <video src={pendingPreviewUrl || ''} controls style={{ width: '100%', maxHeight: 360 }} />;
                }
                return <div style={{ padding: 16 }}>{pendingFile.name}</div>;
              })()}
            </div>
            <input
              value={pendingCaption}
              onChange={(e) => setPendingCaption(e.target.value)}
              placeholder="Add a caption..."
              className="input"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #333', background: 'transparent' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="chip" onClick={closeUploadModal} disabled={isSending}>Cancel</button>
              <button className="button primary" onClick={confirmUpload} disabled={isSending}>Send</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default ChatRoom;
