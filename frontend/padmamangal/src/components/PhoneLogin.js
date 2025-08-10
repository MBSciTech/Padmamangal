import { useEffect, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../config/firebase";

const PhoneLogin = () => {
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container", // container ID first
        { size: "invisible" },
        auth // auth instance last
      );
    }
  }, []);

  const sendOTP = async () => {
    if (!phone.startsWith("+")) {
      alert("Please include country code, e.g. +91...");
      return;
    }

    try {
      const appVerifier = window.recaptchaVerifier;
      await signInWithPhoneNumber(auth, phone, appVerifier);
      console.log("OTP sent!");
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Enter phone number with country code"
      />
      <div id="recaptcha-container"></div>
      <button onClick={sendOTP}>Send OTP</button>
    </div>
  );
};

export default PhoneLogin;
