// Core data model for Family Huddle.
import type { ExtractedEvent } from '../../supabase/functions/_shared/extraction';

export type MemberRole = 'parent' | 'child';

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  age?: number;
  color: string;
  /** Minutes this person needs to get ready to leave the house. Undefined = we haven't asked yet. */
  getReadyMinutes?: number;
}

/** A place we go to. Travel time is learned once and re-used. */
export interface Place {
  id: string;
  name: string;
  /** One-way drive time from home, in minutes. */
  travelMinutes: number;
}

export type EventCategory = 'school' | 'sports' | 'activity' | 'appointment' | 'work' | 'other';

/** Something that has to happen before the event (buy cleats, sign form, pack snack). */
export interface PrepItem {
  id: string;
  text: string;
  /** How many days before the event this needs to be done. 0 = day of. */
  daysBefore: number;
  done?: boolean;
}

export interface FamilyEvent {
  id: string;
  title: string;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Local time HH:MM (24h). Undefined = all day. */
  startTime?: string;
  endTime?: string;
  location?: string;
  category: EventCategory;
  memberIds: string[];
  /** Who is driving / responsible. */
  driverId?: string;
  notes?: string;
  prep: PrepItem[];
  /** Name of the document this came from, if any. */
  source?: string;
}

export interface Settings {
  /** Anthropic API key - stays on this device, sent only to api.anthropic.com. */
  apiKey?: string;
  /** Extra cushion added before arrival (parking, finding the field, etc). */
  bufferMinutes: number;
  /** Default reminder time for prep tasks, HH:MM. */
  prepReminderTime: string;
}

export interface AppState {
  members: FamilyMember[];
  places: Place[];
  events: FamilyEvent[];
  settings: Settings;
  onboarded: boolean;
}

/** An event as extracted from a document, before the family reviews it. */
export type DraftEvent = ExtractedEvent;

export type PlanTaskKind = 'prep' | 'get-ready' | 'travel' | 'event' | 'return';

/** A task on the project-plan timeline, derived from events + family knowledge. */
export interface PlanTask {
  id: string;
  eventId: string;
  kind: PlanTaskKind;
  title: string;
  start: Date;
  end: Date;
  /** Ids of tasks that must finish before this one starts. */
  dependsOn: string[];
  memberIds: string[];
  prepItemId?: string;
  done?: boolean;
}
