// src/components/Signup.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { auth, googleProvider } from "../config/firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";

function getAuthErrorMessage(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed": "Email/password sign up is disabled.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-up was cancelled.",
  };
  return map[code] || error?.message || "Something went wrong. Please try again.";
}

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }
  const navigate = useNavigate();

  const handleSignup = async () => {
    if (!email) {
      const text = "Please enter your email.";
      setMessage({ type: "error", text });
      alert(text);
      return;
    }
    if (!password || password.length < 6) {
      const text = "Password must be at least 6 characters.";
      setMessage({ type: "error", text });
      alert(text);
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const text = "Signup successful! You can now log in.";
      setMessage({ type: "success", text });
      alert("Signup successful!");
      navigate("/chat");
    } catch (error) {
      const text = getAuthErrorMessage(error);
      setMessage({ type: "error", text });
      alert(text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      const text = "Signed up with Google successfully.";
      setMessage({ type: "success", text });
      alert("Google signup successful!");
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join us in a few easy steps</p>

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
            autoComplete="new-password"
          />
        </div>

        <button className="button primary" onClick={handleSignup} disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </button>

        <div className="divider"><span>or</span></div>

        <button className="button google" onClick={handleGoogleSignup} disabled={isLoading}>
          <FcGoogle className="icon" />
          Continue with Google
        </button>

        <p className="muted">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
