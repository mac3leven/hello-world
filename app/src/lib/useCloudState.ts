// Keeps the app state in sync with the family's rows in Supabase.
//
//   local edit ──▶ optimistic update ──▶ queue changed rows ──▶ upsert (retried if offline)
//   other parent's edit ──▶ realtime UPDATE ──▶ merged in (unless we have an unsent edit to the same row)
//
// A copy is cached on the device so the plan opens instantly and is readable offline.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './cloud';
import { initialState } from './store';
import { applyRecords, diffStates, recordKey, type SyncRecord } from './sync';
import type { AppState } from './types';

export type SyncStatus = 'loading' | 'saved' | 'saving' | 'offline';

const cacheKey = (familyId: string) => `family-huddle:cloud:${familyId}`;
const RETRY_MS = 15_000;

function loadCache(familyId: string): AppState {
  try {
    const raw = localStorage.getItem(cacheKey(familyId));
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return { ...initialState, ...parsed, settings: { ...initialState.settings, ...parsed.settings, apiKey: undefined } };
    }
  } catch {
    // Unreadable cache: start fresh from the server.
  }
  return initialState;
}

interface Row {
  kind: SyncRecord['kind'];
  id: string;
  data: unknown;
  deleted: boolean;
}

export function useCloudState(familyId: string) {
  const [state, setState] = useState<AppState>(() => loadCache(familyId));
  const [status, setStatus] = useState<SyncStatus>('loading');
  const stateRef = useRef(state);
  const pending = useRef(new Map<string, SyncRecord>());
  const flushing = useRef(false);

  const commit = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    try {
      localStorage.setItem(cacheKey(familyId), JSON.stringify(next));
    } catch {
      // Storage full/blocked: still works, just no offline copy.
    }
  }, [familyId]);

  const flush = useCallback(async function flushPending(): Promise<void> {
    if (!supabase || flushing.current || pending.current.size === 0) return;
    flushing.current = true;
    setStatus('saving');
    const batch = [...pending.current.values()];
    const { error } = await supabase.from('family_records').upsert(
      batch.map((r) => ({ family_id: familyId, kind: r.kind, id: r.id, data: r.data, deleted: !!r.deleted })),
    );
    flushing.current = false;
    if (error) {
      setStatus('offline');
      return;
    }
    // Only clear rows that weren't edited again while this batch was in flight.
    for (const r of batch) if (pending.current.get(recordKey(r)) === r) pending.current.delete(recordKey(r));
    if (pending.current.size) void flushPending();
    else setStatus('saved');
  }, [familyId]);

  // Initial load + live updates.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const merge = (rows: Row[], replace: boolean) => {
      const incoming = rows.filter((r) => !pending.current.has(recordKey(r)));
      const base = replace ? { ...initialState, settings: stateRef.current.settings, onboarded: stateRef.current.onboarded } : stateRef.current;
      const next = applyRecords(base, incoming);
      // On first load, a family that already has people in it has been set up (e.g. a partner who just joined).
      commit(replace ? { ...next, onboarded: next.onboarded || next.members.length > 0 } : next);
    };

    supabase.from('family_records').select('kind, id, data, deleted').eq('family_id', familyId).eq('deleted', false)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setStatus('offline'); return; }
        merge(data as Row[], true);
        setStatus(pending.current.size ? 'saving' : 'saved');
      });

    const channel = supabase
      .channel(`family-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_records', filter: `family_id=eq.${familyId}` },
        (payload) => { if (payload.new && 'kind' in payload.new) merge([payload.new as Row], false); })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase!.removeChannel(channel);
    };
  }, [familyId, commit]);

  // Retry unsent edits when the connection comes back (and periodically, as a fallback).
  useEffect(() => {
    const retry = () => void flush();
    window.addEventListener('online', retry);
    const timer = setInterval(() => { if (pending.current.size) retry(); }, RETRY_MS);
    return () => { window.removeEventListener('online', retry); clearInterval(timer); };
  }, [flush]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    const prev = stateRef.current;
    const next = applyRecords(fn(prev), []);
    for (const change of diffStates(prev, next)) pending.current.set(recordKey(change), change);
    commit(next);
    void flush();
  }, [commit, flush]);

  return [state, update, status] as const;
}
