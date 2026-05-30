import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '@/types';

function createFallbackUser(uid: string, email: string, userData: Partial<User> = {}): User {
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

function getFirebaseCurrentUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<FirebaseUser | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => { unsubscribe(); resolve(user); },
      () => { unsubscribe(); resolve(null); }
    );
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
}

export async function signupWithEmail(email: string, password: string, userData: Partial<User>) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  const profile = createFallbackUser(user.uid, user.email ?? email, userData);
  // Fire-and-forget — don't block signup on Firestore write
  setDoc(doc(db, 'users', user.uid), profile).catch(console.error);
  // Send verification email; keep Firebase session so resend can use auth.currentUser
  await sendEmailVerification(user);
  return profile;
}

export async function loginWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  // Reload to get fresh emailVerified state (in case they just clicked the link)
  await user.reload();
  if (!user.emailVerified) {
    // Keep Firebase session active — caller can resend verification via auth.currentUser
    throw Object.assign(new Error('Email not verified'), { code: 'auth/email-not-verified' });
  }
  return user;
}

export async function logout() {
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
}

export async function getCurrentUser() {
  const firebaseUser = await getFirebaseCurrentUser();
  if (!firebaseUser) return null;
  // Unverified accounts are treated as "not signed in" for the app
  if (!firebaseUser.emailVerified) return null;

  const fallback = createFallbackUser(firebaseUser.uid, firebaseUser.email ?? '');
  try {
    const snap = await withTimeout(getDoc(doc(db, 'users', firebaseUser.uid)), 6000);
    if (snap.exists()) return snap.data() as User;
    setDoc(doc(db, 'users', firebaseUser.uid), fallback).catch(() => {});
    return fallback;
  } catch {
    return fallback;
  }
}
