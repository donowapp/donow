/**
 * Authentication utility functions
 * Handles signup, login, logout, and user retrieval
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '@/types';

/**
 * Sign up a new user with email and password
 * Creates user in Firebase Auth and stores user data in Firestore
 */
export async function signupWithEmail(
  email: string,
  password: string,
  userData: Partial<User>
) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  const user = userCredential.user;

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    ...userData,
    isVerified: false,
    donationCount: 0,
    receivedCount: 0,
    rating: 0,
    role: 'user',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return user;
}

/**
 * Login user with email and password
 */
export async function loginWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Logout current user
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Get current user data from Firestore
 */
export async function getCurrentUser() {
  if (!auth.currentUser) return null;

  const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
  return userDoc.data() as User | undefined;
}