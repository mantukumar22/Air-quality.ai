/**
 * @fileoverview Hydration-safe dark/light mode hook synchronized with Tailwind's
 * `.dark` root class and `localStorage`.
 */

'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export type ThemeMode = 'light' | 'dark';

export interface UseThemeResult {
  theme: ThemeMode;
  toggleTheme: () => void;
}

const THEME_CHANGE_EVENT = 'airwise-theme-change';

function subscribeTheme(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function getThemeSnapshot(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function getThemeServerSnapshot(): ThemeMode {
  return 'light';
}

/**
 * Manages light/dark mode preference synced with Tailwind's `.dark` root class.
 *
 * @returns Active `theme` mode and `toggleTheme` callback.
 */
export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const current = getThemeSnapshot();
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, next);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    } catch {
      // Non-fatal: ignore storage write errors
    }
  }, []);

  return { theme, toggleTheme };
}
