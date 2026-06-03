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
  setDoc(doc(db, 'users', user.uid), profile).catch(console.error);
  await sendCustomVerificationEmail(email, user.uid);
  return profile;
}

async function sendCustomVerificationEmail(email: string, uid: string) {
  try {
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, uid }),
    });
    if (!res.ok) throw new Error('API error');
  } catch {
    const user = auth.currentUser;
    if (user) await sendEmailVerification(user);
  }
}

export async function loginWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  await user.reload();
  if (user.emailVerified) return user; // verified via Firebase link

  // Check custom Firestore-based confirmation (Resend flow)
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists() && snap.data().emailConfirmed) return user;

  throw Object.assign(new Error('Email not verified'), { code: 'auth/email-not-verified' });
}

export async function logout() {
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user || user.emailVerified) return;
  await sendCustomVerificationEmail(user.email ?? '', user.uid);
}

export async function getCurrentUser() {
  const firebaseUser = await getFirebaseCurrentUser();
  if (!firebaseUser) return null;

  const fallback = createFallbackUser(firebaseUser.uid, firebaseUser.email ?? '');
  try {
    const snap = await withTimeout(getDoc(doc(db, 'users', firebaseUser.uid)), 6000);
    if (!snap.exists()) {
      // No profile yet — only allow through if Firebase itself verified the email
      if (!firebaseUser.emailVerified) return null;
      setDoc(doc(db, 'users', firebaseUser.uid), fallback).catch(() => {});
      return fallback;
    }
    const data = snap.data();
    // Accept either Firebase-verified or Resend-verified (emailConfirmed) accounts
    if (!firebaseUser.emailVerified && !data.emailConfirmed) return null;
    return data as User;
  } catch {
    if (!firebaseUser.emailVerified) return null;
    return fallback;
  }
}
