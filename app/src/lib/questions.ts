// Figures out what we still need to ask the family so the plan is accurate.
// Each answer is remembered, so questions get rarer the longer the app is used.

import { findPlace } from './planner';
import { normalizePlace } from './id';
import type { AppState, DraftEvent, FamilyMember } from './types';

export type Question =
  | { kind: 'travel'; key: string; place: string; prompt: string; options: number[] }
  | { kind: 'get-ready'; key: string; memberId: string; prompt: string; options: number[] }
  | { kind: 'who'; key: string; draftIndex: number; prompt: string }
  | { kind: 'start-time'; key: string; draftIndex: number; prompt: string };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds family members mentioned by name (whole words only, so "Al" doesn't match "Algebra"). */
export function matchMembers(who: string[], members: FamilyMember[]): string[] {
  const text = who.join(' ');
  return members
    .filter((m) => m.name.trim() && new RegExp(`\\b${escapeRe(m.name.trim())}\\b`, 'i').test(text))
    .map((m) => m.id);
}

const TIMED_CATEGORIES = new Set(['sports', 'activity', 'appointment']);

export function questionsFor(state: AppState, drafts: DraftEvent[], assigned: Record<number, string[]>): Question[] {
  const qs: Question[] = [];
  const seenPlaces = new Set<string>();
  const involved = new Set<string>();

  drafts.forEach((d, i) => {
    const who = assigned[i] ?? matchMembers([...d.who, d.title], state.members);
    who.forEach((id) => involved.add(id));

    if (!who.length && state.members.some((m) => m.role === 'child')) {
      qs.push({ kind: 'who', key: `who:${i}`, draftIndex: i, prompt: `Who is "${d.title}" for?` });
    }
    if (!d.startTime && TIMED_CATEGORIES.has(d.category)) {
      qs.push({ kind: 'start-time', key: `time:${i}`, draftIndex: i, prompt: `What time does "${d.title}" start on ${d.date}? (Leave blank if it's all day.)` });
    }
    if (d.location && d.startTime && !findPlace(state, d.location)) {
      const key = normalizePlace(d.location);
      if (!seenPlaces.has(key)) {
        seenPlaces.add(key);
        qs.push({ kind: 'travel', key: `travel:${key}`, place: d.location, prompt: `About how long is the drive to ${d.location}?`, options: [5, 10, 15, 20, 30, 45, 60] });
      }
    }
  });

  for (const m of state.members) {
    if (involved.has(m.id) && m.getReadyMinutes === undefined) {
      const who = m.role === 'child' ? `get ${m.name} ready` : `${m.name} to get ready`;
      qs.push({ kind: 'get-ready', key: `ready:${m.id}`, memberId: m.id, prompt: `How long does it usually take to ${who} and out the door? (shoes, jacket, bathroom...)`, options: [5, 10, 15, 20, 30, 45] });
    }
  }
  return qs;
}
