'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export interface UseChecklistResult {
  checkedIds: string[];
  isChecked: (id: string) => boolean;
  toggleItem: (id: string) => void;
  resetChecklist: () => void;
}

const CHECKLIST_CHANGE_EVENT = 'airwise-checklist-change';

function subscribeChecklist(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(CHECKLIST_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHECKLIST_CHANGE_EVENT, callback);
  };
}

function getChecklistSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.checklist) ?? '[]';
  } catch {
    return '[]';
  }
}

function getChecklistServerSnapshot(): string {
  return '[]';
}

function parseChecklistJson(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function writeChecklist(next: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.checklist, JSON.stringify(next));
    window.dispatchEvent(new Event(CHECKLIST_CHANGE_EVENT));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Persists completed air-quality action items in browser localStorage using useSyncExternalStore.
 */
export function useChecklist(): UseChecklistResult {
  const rawSnapshot = useSyncExternalStore(
    subscribeChecklist,
    getChecklistSnapshot,
    getChecklistServerSnapshot
  );

  const checkedIds = useMemo(() => parseChecklistJson(rawSnapshot), [rawSnapshot]);

  const isChecked = useCallback((id: string) => checkedIds.includes(id), [checkedIds]);

  const toggleItem = useCallback((id: string) => {
    const current = parseChecklistJson(getChecklistSnapshot());
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    writeChecklist(next);
  }, []);

  const resetChecklist = useCallback(() => {
    writeChecklist([]);
  }, []);

  return {
    checkedIds,
    isChecked,
    toggleItem,
    resetChecklist,
  };
}
