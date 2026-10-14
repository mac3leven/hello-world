// Offline fallback: pulls dated lines out of pasted text without any AI.
// Handles the common shapes found in school newsletters and team schedules:
//   "Oct 21 - Picture Day"   "10/24 6:00 PM vs Tigers @ Riverside Park"   "Friday, November 3: No school"
// The AI reader (extractWithClaude) is much better at messy documents; this keeps the app useful without a key.

import type { DraftEvent, EventCategory } from './types';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAY_RE = '(?:(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|rsday|urday)?\\.?,?\\s*)?';

const NAMED_DATE = new RegExp(`${WEEKDAY_RE}\\b${MONTH_RE}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'i');
const NUMERIC_DATE = new RegExp(`${WEEKDAY_RE}\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b`, 'i');
const TIME = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i;
const LOCATION = /(?:\s@\s*|\bat\s+)([A-Z][\w'.&-]*(?:\s+[A-Z0-9][\w'.&-]*)*)/;
const PREP = /\b(bring|wear|remember|don't forget|due|sign|pack|return)\b(.*)/i;

const CATEGORY_WORDS: [EventCategory, RegExp][] = [
  ['sports', /\b(game|practice|match|tournament|vs\.?|scrimmage|soccer|baseball|t-ball|basketball|football|hockey|swim|meet)\b/i],
  ['school', /\b(school|class|teacher|picture day|conference|field trip|early release|no school|pta|homework|book fair|grade)\b/i],
  ['appointment', /\b(doctor|dentist|appointment|checkup|haircut)\b/i],
  ['activity', /\b(party|recital|lesson|camp|birthday|rehearsal|club)\b/i],
];

function to24(h: number, m: number, ampm?: string): string {
  let hour = h;
  const ap = ampm?.toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && hour < 12) hour += 12;
  if (ap === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Pick the year so a date without one lands in the upcoming school year rather than the past. */
function inferYear(month: number, day: number, today: Date): number {
  const y = today.getFullYear();
  const candidate = new Date(y, month, day);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 86_400_000);
  return candidate < sixtyDaysAgo ? y + 1 : y;
}

function fullYear(y: string): number {
  const n = Number(y);
  return n < 100 ? 2000 + n : n;
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseLine(line: string, today = new Date()): DraftEvent | null {
  let rest = line;
  let date: string | undefined;

  const named = NAMED_DATE.exec(line);
  const numeric = named ? null : NUMERIC_DATE.exec(line);
  if (named) {
    const month = MONTHS.indexOf(named[1].slice(0, 3).toLowerCase());
    const day = Number(named[2]);
    date = iso(named[3] ? Number(named[3]) : inferYear(month, day, today), month, day);
    rest = rest.replace(named[0], ' ');
  } else if (numeric) {
    const month = Number(numeric[1]) - 1;
    const day = Number(numeric[2]);
    if (month > 11 || day > 31) return null;
    date = iso(numeric[3] ? fullYear(numeric[3]) : inferYear(month, day, today), month, day);
    rest = rest.replace(numeric[0], ' ');
  }
  if (!date) return null;

  let startTime: string | undefined;
  let endTime: string | undefined;
  const t = TIME.exec(rest);
  if (t) {
    if (t[4]) {
      // Range like "6-7:30pm": the start borrows the end's am/pm if it has none.
      startTime = to24(Number(t[1]), Number(t[2] ?? 0), t[3] ?? t[6]);
      endTime = to24(Number(t[4]), Number(t[5] ?? 0), t[6]);
    } else {
      startTime = to24(Number(t[7]), Number(t[8] ?? 0), t[9]);
    }
    rest = rest.replace(t[0], ' ');
  }

  let location: string | undefined;
  const loc = LOCATION.exec(rest);
  if (loc) {
    location = loc[1].trim();
    rest = rest.replace(loc[0], ' ');
  }

  const prep: DraftEvent['prep'] = [];
  const p = PREP.exec(rest);
  if (p) {
    prep.push({ text: (p[1] + p[2]).trim().replace(/^./, (c) => c.toUpperCase()).replace(/[.!]+$/, ''), daysBefore: 1 });
    rest = rest.replace(p[0], ' ');
  }

  const title = rest.replace(/^[\s\-–—:,|•*]+|[\s\-–—:,|•*.]+$/g, '').replace(/\s{2,}/g, ' ').trim() || 'Event';
  const category = CATEGORY_WORDS.find(([, re]) => re.test(line))?.[0] ?? 'other';

  return { title, date, startTime, endTime, location, category, who: [], prep };
}

export function parseText(text: string, today = new Date()): DraftEvent[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => parseLine(l, today))
    .filter((e): e is DraftEvent => e !== null);
}
