import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import ToastProvider from "./components/ui/ToastProvider";
import ThemeProvider from "./components/ui/ThemeProvider";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import PhoneLogin from "./components/PhoneLogin";
import ChatRoom from "./components/ChatRoom";
import GamesHub from "./components/games/GamesHub";
import Navbar from "./components/ui/Navbar";

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname || '/chat';
  const activeKey =
    path.startsWith('/games') ? 'games' :
    path.startsWith('/announcement') ? 'announcement' :
    path.startsWith('/recipe') ? 'recipe' :
    path.startsWith('/calendar') ? 'calendar' :
    path.startsWith('/vault') ? 'vault' : 'chat';

  return (
    <>
      <Navbar
        activeKey={activeKey}
        onNavigate={(key) => {
          if (key === 'chat') navigate('/chat');
          else if (key === 'games') navigate('/games');
          else if (key === 'announcement') navigate('/announcement');
          else if (key === 'recipe') navigate('/recipe');
          else if (key === 'calendar') navigate('/calendar');
          else if (key === 'vault') navigate('/vault');
        }}
      />
      <div className="app-content">
        <Routes>
          <Route path="/signUp" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/phone" element={<PhoneLogin />} />
          <Route path="/chat" element={<ChatRoom />} />
          <Route path="/games/*" element={<GamesHub />} />
          <Route path="/announcement" element={<div style={{ padding: 16 }}>Announcement coming soon</div>} />
          <Route path="/recipe" element={<div style={{ padding: 16 }}>Recipe coming soon</div>} />
          <Route path="/calendar" element={<div style={{ padding: 16 }}>Calendar coming soon</div>} />
          <Route path="/vault" element={<div style={{ padding: 16 }}>Vault coming soon</div>} />
          <Route path="*" element={<ChatRoom />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AppShell />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
