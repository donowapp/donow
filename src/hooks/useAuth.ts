/**
 * Zustand auth store hook
 * Manages global authentication state
 */

'use client';

import { create } from 'zustand';
import { User } from '@/types';
import * as authLib from '@/lib/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  sendLoginLink: (email: string) => Promise<void>;
  completeLogin: (email: string, href: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code ?? '';
    switch (code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Try again later.';
      case 'auth/user-disabled':
        return 'This account has been suspended';
      case 'auth/invalid-email':
        return 'Invalid email address';
      default:
        return error.message;
    }
  }
  return 'Something went wrong';
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await authLib.loginWithEmail(email, password);
      const user = await authLib.getCurrentUser();
      set({ user, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  signup: async (email, password, userData) => {
    set({ loading: true, error: null });
    try {
      const user = await authLib.signupWithEmail(email, password, userData);
      set({ user, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  sendLoginLink: async (email) => {
    set({ loading: true, error: null });
    try {
      await authLib.sendLoginLink(email);
      set({ loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  completeLogin: async (email, href) => {
    set({ loading: true, error: null });
    try {
      await authLib.completeLoginWithLink(email, href);
      const user = await authLib.getCurrentUser();
      set({ user, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authLib.logout();
      set({ user: null, loading: false });
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
}));
