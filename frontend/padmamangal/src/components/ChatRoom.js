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
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FaEdit, FaTrash, FaSignOutAlt, FaPaperclip, FaMicrophone, FaStop } from "react-icons/fa";
import { IoMdArrowDown } from "react-icons/io";
import { useToast } from "./ui/ToastProvider";

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
  const [activeRoom, setActiveRoom] = useState({ id: GROUP_ROOM_ID, name: "Padmamangal", isGroup: true });
  const [isNarrow, setIsNarrow] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

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

  useEffect(() => {
    if (!user) return;
    const usersQuery = query(collection(db, "users"), orderBy("email"));
    const unsub = onSnapshot(usersQuery, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.id !== user.uid);
      setUsers(list);
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

  async function uploadAndSend(file) {
    if (!file || !user) return;
    setIsSending(true);
    const path = `uploads/${activeRoom.id}/${user.uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    try {
      await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
      const url = await getDownloadURL(storageRef);

      let msgType = "file";
      const ct = (file.type || "application/octet-stream").toLowerCase();
      if (ct.startsWith("image/")) msgType = "image";
      else if (ct.startsWith("video/")) msgType = "video";
      else if (ct.startsWith("audio/")) msgType = "audio";

      await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
        type: msgType,
        url,
        fileName: file.name,
        contentType: ct,
        uid: user.uid,
        email: user.email || null,
        createdAt: serverTimestamp(),
      });
      show("Uploaded", { type: "success", duration: 1500 });
    } catch (e) {
      show("Upload failed", { type: "error" });
    } finally {
      setIsSending(false);
    }
  }

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (file) uploadAndSend(file);
    e.target.value = "";
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
            <select className="theme-switch" onChange={(e) => document.body.className = `theme-${e.target.value}`} defaultValue={document.body.className.replace('theme-','') || 'gradient'}>
              <option value="gradient">Gradient</option>
              <option value="yosemite">Yosemite</option>
              <option value="exotic">Exotic</option>
              <option value="orbit">Orbit</option>
            </select>
            <button className="chip" onClick={() => fileInputRef.current?.click()}>Attach</button>
            <button className="chip" onClick={shareLocation}>Share location</button>
            <button className="chip" onClick={() => { signOut(auth); }}>Sign out <FaSignOutAlt style={{ marginLeft: 6 }}/></button>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              ref={fileInputRef}
              onChange={onPickFile}
              hidden
            />
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
                  {m.text} {m.editedAt && <small>(edited)</small>}
                </div>
              )}
              {m.type === "image" && (
                <div className="bubble media"><img src={m.url} alt="uploaded" /></div>
              )}
              {m.type === "video" && (
                <div className="bubble media"><video src={m.url} controls /></div>
              )}
              {m.type === "audio" && (
                <div className="bubble media"><audio src={m.url} controls /></div>
              )}
              {m.type === "location" && (
                <a
                  href={`https://maps.google.com/?q=${m.latitude},${m.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bubble"
                >
                  View Location
                </a>
              )}
              <div className="meta">{(ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " • " : "")} {m.email || m.uid}</div>
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
          <button className="icon-btn" title="Attach" onClick={() => fileInputRef.current?.click()}>
            <FaPaperclip />
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
          <button className={`icon-btn ${isRecording ? 'recording' : ''}`} title={isRecording ? "Stop" : "Voice message"} onClick={toggleRecording}>
            {isRecording ? <FaStop /> : <FaMicrophone />}
          </button>
          <button
            className="button primary"
            onClick={editingMessageId ? updateMessage : sendTextMessage}
            disabled={!text.trim()}
          >
            {editingMessageId ? "Update" : "Send"}
          </button>
        </div>
      </footer>
      </div>
    </div>
  );
}

export default ChatRoom;
