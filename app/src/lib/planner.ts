// Turns calendar events into a project plan: tasks with real start/end times and dependencies.
//
//   prep items ──▶ get ready ──▶ drive there ──▶ EVENT ──▶ drive home
//
// The durations come from what the family has told us (get-ready time per person,
// travel time per place), so the plan gets more accurate the more it's used.

import { addDays, addMinutes, toDate } from './dates';
import { normalizePlace } from './id';
import type { AppState, FamilyEvent, PlanTask } from './types';

export const DEFAULT_GET_READY = 20;
const PREP_TASK_MINUTES = 30;
const ALL_DAY_START = '08:00';

export function findPlace(state: Pick<AppState, 'places'>, location?: string) {
  if (!location) return undefined;
  const key = normalizePlace(location);
  return state.places.find((p) => normalizePlace(p.name) === key);
}

/** Longest get-ready time among the people going (plus the driver). The slowest person sets the pace. */
export function getReadyMinutes(state: Pick<AppState, 'members'>, event: FamilyEvent): number {
  const ids = new Set([...event.memberIds, ...(event.driverId ? [event.driverId] : [])]);
  const times = state.members
    .filter((m) => ids.has(m.id))
    .map((m) => m.getReadyMinutes ?? DEFAULT_GET_READY);
  return times.length ? Math.max(...times) : DEFAULT_GET_READY;
}

export function buildEventPlan(state: AppState, event: FamilyEvent): PlanTask[] {
  const tasks: PlanTask[] = [];
  const people = event.driverId && !event.memberIds.includes(event.driverId)
    ? [...event.memberIds, event.driverId]
    : event.memberIds;

  const allDay = !event.startTime;
  const start = toDate(event.date, event.startTime ?? ALL_DAY_START);
  const end = event.endTime
    ? toDate(event.date, event.endTime)
    : allDay ? toDate(event.date, '15:00') : addMinutes(start, 60);

  const eventTaskId = `${event.id}:event`;
  const prepIds: string[] = [];

  for (const item of event.prep) {
    const [h, m] = state.settings.prepReminderTime.split(':').map(Number);
    let prepStart = addDays(toDate(event.date), -item.daysBefore);
    prepStart.setHours(h, m);
    // A day-of prep task can't be scheduled after the event starts - pull it into the morning.
    if (prepStart >= start) prepStart = addMinutes(start, -(PREP_TASK_MINUTES + 120));
    const id = `${event.id}:prep:${item.id}`;
    prepIds.push(id);
    tasks.push({
      id, eventId: event.id, kind: 'prep', title: item.text,
      start: prepStart, end: addMinutes(prepStart, PREP_TASK_MINUTES),
      dependsOn: [], memberIds: people, prepItemId: item.id, done: item.done,
    });
  }

  // School days and other all-day items don't need a departure chain.
  const place = findPlace(state, event.location);
  if (allDay || !event.location) {
    tasks.push({
      id: eventTaskId, eventId: event.id, kind: 'event', title: event.title,
      start, end, dependsOn: prepIds, memberIds: people,
    });
    return tasks;
  }

  const travel = place?.travelMinutes ?? 15;
  const arriveBy = addMinutes(start, -state.settings.bufferMinutes);
  const leaveAt = addMinutes(arriveBy, -travel);
  const readyAt = addMinutes(leaveAt, -getReadyMinutes(state, event));

  const readyId = `${event.id}:ready`;
  const travelId = `${event.id}:travel`;
  const returnId = `${event.id}:return`;

  tasks.push(
    { id: readyId, eventId: event.id, kind: 'get-ready', title: 'Get ready', start: readyAt, end: leaveAt, dependsOn: prepIds, memberIds: people },
    { id: travelId, eventId: event.id, kind: 'travel', title: `Drive to ${event.location}`, start: leaveAt, end: arriveBy, dependsOn: [readyId], memberIds: people },
    { id: eventTaskId, eventId: event.id, kind: 'event', title: event.title, start, end, dependsOn: [travelId], memberIds: people },
    { id: returnId, eventId: event.id, kind: 'return', title: 'Drive home', start: end, end: addMinutes(end, travel), dependsOn: [eventTaskId], memberIds: people },
  );
  return tasks;
}

export function buildPlan(state: AppState): PlanTask[] {
  return state.events
    .flatMap((e) => buildEventPlan(state, e))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** When do we need to walk out the door? */
export function leaveBy(state: AppState, event: FamilyEvent): Date | undefined {
  return buildEventPlan(state, event).find((t) => t.kind === 'travel')?.start;
}

export interface Conflict {
  a: FamilyEvent;
  b: FamilyEvent;
  reason: string;
}

/**
 * Two events conflict when their full windows (get ready → drive home) overlap
 * and they share a person or a driver. Same idea as resource over-allocation in a PM tool.
 */
export function findConflicts(state: AppState): Conflict[] {
  const windows = state.events
    .filter((e) => e.startTime)
    .map((e) => {
      const plan = buildEventPlan(state, e).filter((t) => t.kind !== 'prep');
      return {
        event: e,
        start: Math.min(...plan.map((t) => t.start.getTime())),
        end: Math.max(...plan.map((t) => t.end.getTime())),
        people: new Set([...e.memberIds, ...(e.driverId ? [e.driverId] : [])]),
      };
    })
    .sort((x, y) => x.start - y.start);

  const conflicts: Conflict[] = [];
  for (let i = 0; i < windows.length; i++) {
    for (let j = i + 1; j < windows.length && windows[j].start < windows[i].end; j++) {
      const a = windows[i], b = windows[j];
      const shared = [...a.people].filter((p) => b.people.has(p));
      const sameDriver = a.event.driverId && a.event.driverId === b.event.driverId;
      if (shared.length || sameDriver) {
        const names = state.members.filter((m) => shared.includes(m.id)).map((m) => m.name);
        conflicts.push({
          a: a.event, b: b.event,
          reason: sameDriver
            ? `${state.members.find((m) => m.id === a.event.driverId)?.name ?? 'The same driver'} can't be in two places at once`
            : `${names.join(' & ')} would need to be in two places at once`,
        });
      }
    }
  }
  return conflicts;
}
