// Calendar export. A standard .ics file imports into Apple Calendar, Google Calendar,
// Outlook, and most others. Notion imports the CSV export as a database.

import { addMinutes, isoDate, toDate } from './dates';
import { leaveBy } from './planner';
import type { AppState, FamilyEvent } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Floating local time (no TZ) - shows at the same wall-clock time wherever it's opened. */
function icsLocal(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545 says lines should be folded at 75 octets. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

function describe(state: AppState, e: FamilyEvent): string {
  const names = state.members.filter((m) => e.memberIds.includes(m.id)).map((m) => m.name);
  const lines: string[] = [];
  if (names.length) lines.push(`Who: ${names.join(', ')}`);
  const driver = state.members.find((m) => m.id === e.driverId);
  if (driver) lines.push(`Driver: ${driver.name}`);
  const leave = leaveBy(state, e);
  if (leave) lines.push(`Leave by: ${leave.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
  if (e.prep.length) lines.push('', 'To do before:', ...e.prep.map((p) => `- ${p.text}`));
  if (e.notes) lines.push('', e.notes);
  if (e.source) lines.push('', `From: ${e.source}`);
  return lines.join('\n');
}

export function toIcs(state: AppState, events: FamilyEvent[] = state.events, now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Family Huddle//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Family Huddle'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.id}@family-huddle`, `DTSTAMP:${icsUtc(now)}`);
    if (e.startTime) {
      const start = toDate(e.date, e.startTime);
      const end = e.endTime ? toDate(e.date, e.endTime) : addMinutes(start, 60);
      lines.push(`DTSTART:${icsLocal(start)}`, `DTEND:${icsLocal(end)}`);
    } else {
      const day = toDate(e.date);
      const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${icsDate(day)}`, `DTEND;VALUE=DATE:${icsDate(next)}`);
    }
    lines.push(`SUMMARY:${escapeIcs(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    lines.push(`DESCRIPTION:${escapeIcs(describe(state, e))}`, `CATEGORIES:${e.category.toUpperCase()}`);

    // Reminder at "time to start getting ready", not just at the event start.
    const leave = leaveBy(state, e);
    if (leave && e.startTime) {
      const minutesBefore = Math.round((toDate(e.date, e.startTime).getTime() - leave.getTime()) / 60_000) + 15;
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(`Start getting ready for ${e.title}`)}`, `TRIGGER:-PT${minutesBefore}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** One-click "add to Google Calendar" link for a single event. */
export function googleCalendarUrl(state: AppState, e: FamilyEvent): string {
  let dates: string;
  if (e.startTime) {
    const start = toDate(e.date, e.startTime);
    const end = e.endTime ? toDate(e.date, e.endTime) : addMinutes(start, 60);
    dates = `${icsLocal(start)}/${icsLocal(end)}`;
  } else {
    const day = toDate(e.date);
    dates = `${icsDate(day)}/${icsDate(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1))}`;
  }
  const params = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, details: describe(state, e) });
  if (e.location) params.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV that Notion (and Excel/Sheets) can import as a database. */
export function toCsv(state: AppState): string {
  const header = ['Name', 'Date', 'Start', 'End', 'Leave by', 'Location', 'Category', 'Who', 'Driver', 'To do before', 'Notes'];
  const rows = state.events.map((e) => {
    const leave = leaveBy(state, e);
    return [
      e.title, e.date, e.startTime ?? '', e.endTime ?? '',
      leave ? `${isoDate(leave)} ${pad(leave.getHours())}:${pad(leave.getMinutes())}` : '',
      e.location ?? '', e.category,
      state.members.filter((m) => e.memberIds.includes(m.id)).map((m) => m.name).join(', '),
      state.members.find((m) => m.id === e.driverId)?.name ?? '',
      e.prep.map((p) => p.text).join('; '), e.notes ?? '',
    ];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
