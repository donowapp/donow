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

function createFallbackUser(
  uid: string,
  email: string,
  userData: Partial<User> = {}
): User {
  const now = new Date();

  return {
    uid,
    email,
    phone: userData.phone ?? '',
    name: userData.name ?? email.split('@')[0],
    address: userData.address ?? '',
    city: userData.city ?? '',
    state: userData.state ?? '',
    pincode: userData.pincode ?? '',
    isVerified: userData.isVerified ?? false,
    donationCount: userData.donationCount ?? 0,
    receivedCount: userData.receivedCount ?? 0,
    rating: userData.rating ?? 0,
    role: userData.role ?? 'user',
    status: userData.status ?? 'active',
    createdAt: userData.createdAt ?? now,
    updatedAt: now,
  };
}

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
  const profile = createFallbackUser(user.uid, user.email ?? email, userData);

  setDoc(doc(db, 'users', user.uid), profile).catch((error) => {
    console.error('Failed to save user profile:', error);
  });

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

  const fallbackUser = createFallbackUser(
    auth.currentUser.uid,
    auth.currentUser.email ?? ''
  );

  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    return userDoc.exists() ? (userDoc.data() as User) : fallbackUser;
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return fallbackUser;
  }
}
