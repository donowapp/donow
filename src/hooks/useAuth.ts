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
  sendLoginLink: (email: string) => Promise<void>;
  completeLogin: (email: string, href: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,

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
