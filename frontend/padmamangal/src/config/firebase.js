// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDP5XOldJg76WMQHdkohCfe3HqPRlEZJqQ",
  authDomain: "padmamangal-2f711.firebaseapp.com",
  projectId: "padmamangal-2f711",
  storageBucket: "padmamangal-2f711.appspot.com",
  messagingSenderId: "50985240681",
  appId: "1:50985240681:web:d48644cc3aaf7dba33baf8",
  measurementId: "G-M787N5M4RN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // ✅ Added this
export const db = getFirestore(app);
export const storage = getStorage(app);
export const firebaseStorage = storage; // alias to avoid naming collisions in consumers
