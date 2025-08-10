// src/components/Login.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { auth, googleProvider } from "../config/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";

function getAuthErrorMessage(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  };
  return map[code] || error?.message || "Something went wrong. Please try again.";
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error'|'info', text: string }
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email) {
      const text = "Please enter your email.";
      setMessage({ type: "error", text });
      alert(text);
      return;
    }
    if (!password) {
      const text = "Please enter your password.";
      setMessage({ type: "error", text });
      alert(text);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const text = `Welcome back, ${email}! You are now logged in.`;
      setMessage({ type: "success", text });
      alert("Login successful!");
      navigate("/chat");
    } catch (error) {
      const text = getAuthErrorMessage(error);
      setMessage({ type: "error", text });
      alert(text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      const text = "Signed in with Google successfully.";
      setMessage({ type: "success", text });
      alert("Google login successful!");
    } catch (error) {
      const text = getAuthErrorMessage(error);
      setMessage({ type: "error", text });
      alert(text);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to your account</p>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <div className="form-row">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="form-row">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="button primary" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </button>

        <div className="divider"><span>or</span></div>

        <button className="button google" onClick={handleGoogleLogin} disabled={isLoading}>
          <FcGoogle className="icon" />
          Continue with Google
        </button>

        <p className="muted">
          Don't have an account? <Link to="/signUp">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
