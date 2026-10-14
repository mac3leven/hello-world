// Maps the app state to/from rows in `family_records` and works out what changed.
// Each member, place, and event is its own row, so two parents editing different things
// never overwrite each other. Edits to the same thing: the last save wins.

import type { AppState, FamilyEvent, FamilyMember, Place, Settings } from './types';

export type RecordKind = 'member' | 'place' | 'event' | 'settings';

export interface SyncRecord {
  kind: RecordKind;
  id: string;
  data: unknown;
  deleted?: boolean;
}

/** Settings shared by the family. The API key and onboarding flag stay on the device. */
type SharedSettings = Pick<Settings, 'bufferMinutes' | 'prepReminderTime'>;

export const recordKey = (r: Pick<SyncRecord, 'kind' | 'id'>) => `${r.kind}:${r.id}`;

export function toRecords(state: AppState): Map<string, SyncRecord> {
  const out = new Map<string, SyncRecord>();
  const add = (kind: RecordKind, id: string, data: unknown) => out.set(`${kind}:${id}`, { kind, id, data });
  state.members.forEach((m) => add('member', m.id, m));
  state.places.forEach((p) => add('place', p.id, p));
  state.events.forEach((e) => add('event', e.id, e));
  const shared: SharedSettings = { bufferMinutes: state.settings.bufferMinutes, prepReminderTime: state.settings.prepReminderTime };
  add('settings', 'family', shared);
  return out;
}

/** Rows to write so the server matches `next`. Removed items become soft-deletes. */
export function diffStates(prev: AppState, next: AppState): SyncRecord[] {
  const a = toRecords(prev);
  const b = toRecords(next);
  const changes: SyncRecord[] = [];
  for (const [key, rec] of b) {
    const old = a.get(key);
    if (!old || JSON.stringify(old.data) !== JSON.stringify(rec.data)) changes.push(rec);
  }
  for (const [key, rec] of a) {
    if (!b.has(key)) changes.push({ kind: rec.kind, id: rec.id, data: {}, deleted: true });
  }
  return changes;
}

const byMember = (x: FamilyMember, y: FamilyMember) =>
  (x.role === y.role ? 0 : x.role === 'parent' ? -1 : 1) || (y.age ?? 99) - (x.age ?? 99) || x.name.localeCompare(y.name);

/** Applies server rows on top of a state, keeping device-only settings. */
export function applyRecords(state: AppState, records: SyncRecord[]): AppState {
  const members = new Map(state.members.map((m) => [m.id, m]));
  const places = new Map(state.places.map((p) => [p.id, p]));
  const events = new Map(state.events.map((e) => [e.id, e]));
  let settings = state.settings;

  for (const r of records) {
    const target = r.kind === 'member' ? members : r.kind === 'place' ? places : r.kind === 'event' ? events : null;
    if (target) {
      if (r.deleted) target.delete(r.id);
      else (target as Map<string, unknown>).set(r.id, { ...(r.data as object), id: r.id });
    } else if (r.kind === 'settings' && !r.deleted) {
      settings = { ...settings, ...(r.data as SharedSettings) };
    }
  }

  return {
    ...state,
    members: [...members.values()].sort(byMember) as FamilyMember[],
    places: [...places.values()].sort((x, y) => x.name.localeCompare(y.name)) as Place[],
    events: [...events.values()].sort((x, y) => (x.date + (x.startTime ?? '')).localeCompare(y.date + (y.startTime ?? ''))) as FamilyEvent[],
    settings,
  };
}
