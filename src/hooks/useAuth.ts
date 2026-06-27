'use client';

import { create } from 'zustand';
import { User } from '@/types';
import * as authLib from '@/lib/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  unverifiedEmail: string | null;
  signup: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code ?? '';
    switch (code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      // Deliberately identical to the wrong-password message: distinguishing
      // "no such account" from "wrong password" lets attackers enumerate which
      // emails are registered. Both map to one generic message.
      case 'auth/user-not-found':
        return 'Incorrect email or password';
      case 'auth/email-not-verified':
        return 'Your email is not verified. Click the link we sent to your inbox.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Try again later.';
      case 'auth/user-disabled':
        return 'This account has been suspended';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters';
      default:
        return error.message || 'Something went wrong';
    }
  }
  return 'Something went wrong';
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,
  unverifiedEmail: null,

  signup: async (email, password, userData) => {
    set({ loading: true, error: null });
    try {
      await authLib.signupWithEmail(email, password, userData);
      // Don't set user — must verify email before accessing the app
      set({ user: null, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, unverifiedEmail: null });
    try {
      await authLib.loginWithEmail(email, password);
      const user = await authLib.getCurrentUser();
      set({ user, loading: false });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code ?? '';
      if (code === 'auth/email-not-verified') {
        set({ error: getErrorMessage(error), loading: false, unverifiedEmail: email });
      } else {
        set({ error: getErrorMessage(error), loading: false });
      }
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authLib.logout();
      set({ user: null, loading: false, unverifiedEmail: null });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const user = await authLib.getCurrentUser();
      set({ user, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null, unverifiedEmail: null }),
}));
