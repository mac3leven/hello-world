import { describe, expect, it } from 'vitest';
import { escapeIcs, toCsv, toIcs } from './calendarExport';
import { hhmm, isoDate } from './dates';
import { buildEventPlan, findConflicts, leaveBy } from './planner';
import { matchMembers, questionsFor } from './questions';
import { parseLine, parseText } from './simpleParser';
import { initialState } from './store';
import type { AppState, FamilyEvent } from './types';

const today = new Date(2026, 9, 14); // Oct 14 2026

const family: AppState = {
  ...initialState,
  onboarded: true,
  members: [
    { id: 'dad', name: 'Brandon', role: 'parent', color: '#000', getReadyMinutes: 10 },
    { id: 'big', name: 'Liam', role: 'child', age: 6, color: '#111', getReadyMinutes: 25 },
    { id: 'small', name: 'Owen', role: 'child', age: 2, color: '#222' },
  ],
  places: [{ id: 'p1', name: 'Riverside Park', travelMinutes: 20 }],
};

const game: FamilyEvent = {
  id: 'g1', title: 'Soccer vs Tigers', date: '2026-10-24', startTime: '09:00', endTime: '10:00',
  location: 'Riverside Park', category: 'sports', memberIds: ['big'], driverId: 'dad',
  prep: [{ id: 'x', text: 'Pack shin guards', daysBefore: 1 }],
};

describe('simpleParser', () => {
  it('reads a named date, time, location and prep', () => {
    const e = parseLine('Sat, Oct 24 9:00 AM Soccer vs Tigers @ Riverside Park - bring water bottle', today)!;
    expect(e.date).toBe('2026-10-24');
    expect(e.startTime).toBe('09:00');
    expect(e.location).toBe('Riverside Park');
    expect(e.category).toBe('sports');
    expect(e.prep[0].text).toBe('Bring water bottle');
    expect(e.title).toContain('Soccer vs Tigers');
  });

  it('reads numeric dates and time ranges with shared am/pm', () => {
    const e = parseLine('10/27 6-7:30pm Practice at Lincoln Field', today)!;
    expect(e).toMatchObject({ date: '2026-10-27', startTime: '18:00', endTime: '19:30', location: 'Lincoln Field' });
  });

  it('rolls dates without a year into next year when they are well in the past', () => {
    expect(parseLine('Jan 5 - School resumes', today)!.date).toBe('2027-01-05');
    expect(parseLine('Oct 1 - Book fair', today)!.date).toBe('2026-10-01');
  });

  it('treats lines without dates as noise', () => {
    expect(parseText('Dear families,\nNov 3 No school\nThanks!', today)).toHaveLength(1);
  });
});

describe('planner', () => {
  it('works backwards from the start time using the slowest person and the drive', () => {
    const plan = buildEventPlan(family, game);
    const byKind = Object.fromEntries(plan.map((t) => [t.kind, t]));
    // 9:00 start - 10 min cushion - 20 min drive = leave 8:30; Liam needs 25 min → start getting ready 8:05
    expect(hhmm(byKind.travel.start)).toBe('08:30');
    expect(hhmm(byKind['get-ready'].start)).toBe('08:05');
    expect(hhmm(byKind.return.end)).toBe('10:20');
    expect(isoDate(byKind.prep.start)).toBe('2026-10-23');
    expect(byKind.event.dependsOn).toEqual([byKind.travel.id]);
    expect(byKind['get-ready'].dependsOn).toEqual([byKind.prep.id]);
    expect(hhmm(leaveBy(family, game)!)).toBe('08:30');
  });

  it('keeps all-day items simple', () => {
    const plan = buildEventPlan(family, { ...game, startTime: undefined, endTime: undefined, prep: [] });
    expect(plan.map((t) => t.kind)).toEqual(['event']);
  });

  it('flags the same person needed in two places', () => {
    const party = { ...game, id: 'g2', title: 'Birthday party', startTime: '09:30', location: 'Somewhere', prep: [], driverId: undefined };
    const conflicts = findConflicts({ ...family, events: [game, party] });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].reason).toContain('Liam');
  });

  it('does not flag events for different people with different drivers', () => {
    const other = { ...game, id: 'g3', memberIds: ['small'], driverId: undefined, prep: [] };
    expect(findConflicts({ ...family, events: [game, other] })).toHaveLength(0);
  });
});

describe('questions', () => {
  it('matches family names as whole words', () => {
    expect(matchMembers(['Picture Day for Liam'], family.members)).toEqual(['big']);
    expect(matchMembers(['Owenton Library visit'], family.members)).toEqual([]);
  });

  it('asks about new places and unknown get-ready times, once each', () => {
    const drafts = [
      { title: 'Swim', date: '2026-10-20', startTime: '17:00', location: 'YMCA', category: 'sports' as const, who: ['Owen'], prep: [] },
      { title: 'Swim', date: '2026-10-27', startTime: '17:00', location: 'ymca ', category: 'sports' as const, who: ['Owen'], prep: [] },
      { title: 'Game', date: '2026-10-24', startTime: '09:00', location: 'Riverside Park', category: 'sports' as const, who: ['Liam'], prep: [] },
    ];
    const qs = questionsFor(family, drafts, {});
    expect(qs.map((q) => q.kind).sort()).toEqual(['get-ready', 'travel']);
  });
});

describe('calendar export', () => {
  it('produces a valid-looking ics with a get-ready reminder', () => {
    const ics = toIcs({ ...family, events: [game] }, undefined, new Date(Date.UTC(2026, 9, 14)));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261024T090000');
    expect(ics).toContain('SUMMARY:Soccer vs Tigers');
    expect(ics).toContain('TRIGGER:-PT45M'); // 30 min before start to leave + 15 min to get going
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });

  it('escapes special characters', () => {
    expect(escapeIcs('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
  });

  it('quotes csv cells that need it', () => {
    const csv = toCsv({ ...family, events: [{ ...game, title: 'Game, home' }] });
    expect(csv.split('\n')[1]).toMatch(/^"Game, home",2026-10-24,09:00/);
  });
});
