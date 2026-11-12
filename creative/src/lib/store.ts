// Local-first persistence: everything lives in this browser's localStorage under one key.
// Swap `storage` for a synced backend later (PRD FR-08) without touching the screens.

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { now } from './id';
import type { AppState } from './types';

export const STORAGE_KEY = 'creative-dev:v1';

export function emptyState(): AppState {
  const t = now();
  return {
    schemaVersion: 1,
    user: { name: '', createdAt: t, onboarded: false },
    profile: {
      goals: [],
      interests: [],
      strengths: [],
      frictions: [],
      feedbackStyle: 'direct',
      sessionMinutes: 20,
      preferredMode: 'mentor',
      permissions: { academyHistory: true, profile: true, studioForPersonalization: false },
      updatedAt: t,
    },
    observations: [],
    attempts: [],
    ideas: [],
    projects: [],
    drafts: [],
    revisions: [],
    links: [],
    conversations: [],
    recommendations: {},
    reflections: [],
  };
}

/** Fill in anything missing so older saves keep working. */
export function normalize(raw: unknown): AppState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<AppState>;
  return {
    ...base,
    ...s,
    schemaVersion: 1,
    user: { ...base.user, ...s.user },
    profile: { ...base.profile, ...s.profile, permissions: { ...base.profile.permissions, ...s.profile?.permissions } },
  };
}

export interface Storage {
  load(): AppState;
  save(state: AppState): void;
  clear(): void;
}

export const localStore: Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalize(JSON.parse(raw)) : emptyState();
    } catch {
      return emptyState();
    }
  },
  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export type SaveStatus = 'saved' | 'saving' | 'error';

interface StoreValue {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  saveStatus: SaveStatus;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children, storage = localStore }: { children: ReactNode; storage?: Storage }) {
  const [state, setState] = useState<AppState>(() => storage.load());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  // Skip saving when nothing changed since the last write (also avoids a false "Saving…" on load).
  const persisted = useRef(state);

  useEffect(() => {
    if (state === persisted.current) return;
    setSaveStatus('saving');
    // Short debounce so typing doesn't write on every keystroke.
    const t = setTimeout(() => {
      try {
        storage.save(state);
        persisted.current = state;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [state, storage]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const replace = useCallback((s: AppState) => setState(s), []);

  return createElement(StoreContext.Provider, { value: { state, update, replace, saveStatus } }, children);
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

/** Export for the user (PRD §9). Everything is the user's own data; nothing secret is stored. */
export function exportJson(state: AppState): string {
  return JSON.stringify({ exportedAt: now(), app: 'creative-development', data: state }, null, 2);
}
