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
  const now = new Date();

  const profile: User = {
    uid: user.uid,
    email: user.email ?? email,
    ...userData,
    phone: userData.phone ?? '',
    name: userData.name ?? '',
    address: userData.address ?? '',
    city: userData.city ?? '',
    state: userData.state ?? '',
    pincode: userData.pincode ?? '',
    isVerified: false,
    donationCount: 0,
    receivedCount: 0,
    rating: 0,
    role: 'user',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', user.uid), profile);

  return profile;
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
  return userDoc.exists() ? (userDoc.data() as User) : null;
}
