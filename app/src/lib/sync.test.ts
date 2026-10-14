import { describe, expect, it } from 'vitest';
import { normalizeExtracted, validateDocument } from '../../supabase/functions/_shared/extraction';
import { initialState } from './store';
import { applyRecords, diffStates } from './sync';
import type { AppState } from './types';

const base: AppState = {
  ...initialState,
  onboarded: true,
  settings: { ...initialState.settings, apiKey: 'sk-ant-secret' },
  members: [{ id: 'm1', name: 'Liam', role: 'child', age: 6, color: '#111' }],
  events: [{ id: 'e1', title: 'Soccer', date: '2026-10-24', category: 'sports', memberIds: ['m1'], prep: [] }],
};

describe('sync diff', () => {
  it('sends only what changed', () => {
    const next = { ...base, events: base.events.map((e) => ({ ...e, title: 'Soccer (moved)' })) };
    expect(diffStates(base, next)).toEqual([{ kind: 'event', id: 'e1', data: next.events[0] }]);
  });

  it('turns removals into soft deletes', () => {
    expect(diffStates(base, { ...base, events: [] })).toEqual([{ kind: 'event', id: 'e1', data: {}, deleted: true }]);
  });

  it('never syncs the API key or onboarding flag', () => {
    const next = { ...base, onboarded: false, settings: { ...base.settings, apiKey: 'sk-ant-other', bufferMinutes: 20 } };
    const changes = diffStates(base, next);
    expect(changes).toEqual([{ kind: 'settings', id: 'family', data: { bufferMinutes: 20, prepReminderTime: '19:00' } }]);
    expect(JSON.stringify(changes)).not.toContain('sk-ant');
  });
});

describe('applying server rows', () => {
  it('adds, updates, and deletes, keeping device-only settings', () => {
    const next = applyRecords(base, [
      { kind: 'member', id: 'm2', data: { id: 'm2', name: 'Dad', role: 'parent', color: '#000' } },
      { kind: 'event', id: 'e1', data: {}, deleted: true },
      { kind: 'settings', id: 'family', data: { bufferMinutes: 5, prepReminderTime: '20:00' } },
    ]);
    expect(next.members.map((m) => m.name)).toEqual(['Dad', 'Liam']); // grown-ups first
    expect(next.events).toEqual([]);
    expect(next.settings).toEqual({ apiKey: 'sk-ant-secret', bufferMinutes: 5, prepReminderTime: '20:00' });
  });

  it('round-trips: applying a diff to the old state gives the new state', () => {
    const next: AppState = {
      ...base,
      places: [{ id: 'p1', name: 'YMCA', travelMinutes: 12 }],
      events: [...base.events, { id: 'e2', title: 'Swim', date: '2026-10-20', startTime: '17:00', category: 'sports', memberIds: [], prep: [] }],
    };
    expect(applyRecords(base, diffStates(base, next))).toEqual(applyRecords(next, []));
  });
});

describe('AI output handling', () => {
  it('keeps good events and drops malformed ones', () => {
    const events = normalizeExtracted({
      events: [
        { title: 'Picture Day', date: '2026-10-23', startTime: null, endTime: null, location: null, category: 'school', who: ['Liam'], notes: null, prep: [{ text: 'Wear school colors', daysBefore: 1 }] },
        { title: 'Bad date', date: 'next Tuesday', category: 'school', who: [], prep: [] },
        { title: 'Odd fields', date: '2026-10-24', startTime: '25:99', category: 'nonsense', who: 'Liam', prep: [{ text: 'x', daysBefore: 999 }] },
      ],
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ title: 'Picture Day', startTime: undefined, prep: [{ text: 'Wear school colors', daysBefore: 1 }] });
    expect(events[1]).toMatchObject({ startTime: undefined, category: 'other', who: [], prep: [{ text: 'x', daysBefore: 60 }] });
  });

  it('returns nothing for junk', () => {
    expect(normalizeExtracted(null)).toEqual([]);
    expect(normalizeExtracted({ events: 'nope' })).toEqual([]);
  });

  it('validates uploads before they are sent', () => {
    expect(validateDocument({ kind: 'text', name: 'a', text: 'Oct 1 game' }).kind).toBe('text');
    expect(() => validateDocument({ kind: 'image', name: 'a', base64: 'AAAA', mediaType: 'image/heic' })).toThrow(/JPEG/);
    expect(() => validateDocument({ kind: 'pdf', name: 'a', base64: 'not base64!' })).toThrow();
    expect(() => validateDocument({ kind: 'pdf', name: 'a', base64: 'A'.repeat(15_000_000) })).toThrow(/too big/);
    expect(() => validateDocument({ kind: 'exe' })).toThrow();
  });
});
