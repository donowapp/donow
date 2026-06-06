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
import { syncOwnPublicProfile } from './profiles';
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
    // Trust/privilege fields are NEVER taken from caller-supplied userData —
    // they are pinned to safe defaults. Promotion/verification/status changes
    // happen only through server (Admin SDK) routes. (Firestore rules enforce
    // this too; this is defense-in-depth.)
    isVerified: false,
    donationCount: 0,
    receivedCount: 0,
    rating: 0,
    role: 'user',
    status: 'active',
    createdAt: now,
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
  // Seed the world-readable public profile (display fields only).
  syncOwnPublicProfile(user.uid, {
    name: profile.name,
    city: profile.city,
    state: profile.state,
    profileImage: profile.profileImage,
  }).catch(console.error);
  await sendCustomVerificationEmail();
  return profile;
}

async function sendCustomVerificationEmail() {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not signed in');
    const token = await currentUser.getIdToken();
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
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

/**
 * Permanently deletes the signed-in user's account and all associated data
 * (DPDP right to erasure). Runs the server-side cascade, then signs out locally.
 */
export async function deleteOwnAccount(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in.');
  const token = await currentUser.getIdToken();
  const res = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Could not delete account.');
  }
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user || user.emailVerified) return;
  await sendCustomVerificationEmail();
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
