import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import ToastProvider from "./components/ui/ToastProvider";
import ThemeProvider from "./components/ui/ThemeProvider";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import PhoneLogin from "./components/PhoneLogin";
import ChatRoom from "./components/ChatRoom";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/signUp" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/phone" element={<PhoneLogin />} />
            <Route path="/chat" element={<ChatRoom />} />
          </Routes>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
