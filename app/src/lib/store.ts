// Local-first storage: the whole family plan lives in this browser's localStorage.
// Nothing is sent anywhere except document text/images to Anthropic when you choose "Read with AI".

import { useCallback, useEffect, useState } from 'react';
import type { AppState } from './types';

const KEY = 'family-huddle:v1';

export const MEMBER_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

export const initialState: AppState = {
  members: [],
  places: [],
  events: [],
  settings: { bufferMinutes: 10, prepReminderTime: '19:00' },
  onboarded: false,
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState, ...parsed, settings: { ...initialState.settings, ...parsed.settings } };
  } catch {
    return initialState;
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked (private mode) - the app still works for this session.
    }
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  return [state, update] as const;
}

export function exportBackup(state: AppState): string {
  // Never include the API key in a backup file that might get shared.
  return JSON.stringify({ ...state, settings: { ...state.settings, apiKey: undefined } }, null, 2);
}
