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
  signup: (
    email: string,
    password: string,
    userData: Partial<User>
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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
      await authLib.signupWithEmail(email, password, userData);
      const user = await authLib.getCurrentUser();
      set({ user, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      await authLib.loginWithEmail(email, password);
      const user = await authLib.getCurrentUser();
      set({ user, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      await authLib.logout();
      set({ user: null, loading: false });
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), loading: false });
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
