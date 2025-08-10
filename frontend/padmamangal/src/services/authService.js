import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

/**
 * Sign up a new family member
 * @param {string} email
 * @param {string} password
 * @param {string} firstName
 * @param {string} lastName
 */
export async function signUp(email, password, firstName, lastName, relation) {
  try {
    // 1️⃣ Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 2️⃣ Store extra info in Firestore
    await setDoc(doc(db, "users", uid), {
      firstName,
      lastName,
      email,
      joinedAt: new Date(),
      isAdmin: false
    });

    return uid;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
}

/**
 * Login existing user
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}
