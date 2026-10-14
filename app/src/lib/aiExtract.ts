// Reads a school/sports document (PDF, photo, or text) with Claude and returns structured events.
// The API key is provided by the family, stored only on this device, and sent only to Anthropic.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { DraftEvent, FamilyMember } from './types';

export const MODEL = 'claude-opus-5-5';

const ExtractedEvents = z.object({
  events: z.array(
    z.object({
      title: z.string().describe('Short, friendly title, e.g. "Soccer game vs Tigers" or "Picture Day"'),
      date: z.string().describe('YYYY-MM-DD'),
      startTime: z.string().nullable().describe('24h HH:MM, or null if all-day / not stated'),
      endTime: z.string().nullable().describe('24h HH:MM, or null'),
      location: z.string().nullable(),
      category: z.enum(['school', 'sports', 'activity', 'appointment', 'work', 'other']),
      who: z.array(z.string()).describe('Family member names, grades, or teams this applies to'),
      notes: z.string().nullable(),
      prep: z.array(
        z.object({
          text: z.string().describe('Something to do/bring/buy beforehand, phrased as a to-do'),
          daysBefore: z.number().int().describe('How many days before the event it should be done; 0 = day of'),
        }),
      ),
    }),
  ),
});

export type DocumentInput =
  | { kind: 'text'; name: string; text: string }
  | { kind: 'pdf'; name: string; base64: string }
  | { kind: 'image'; name: string; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' };

function systemPrompt(members: FamilyMember[], today: Date) {
  const family = members.length
    ? members.map((m) => `- ${m.name} (${m.role}${m.age !== undefined ? `, age ${m.age}` : ''})`).join('\n')
    : '(not set up yet)';
  return `You help a busy family turn school, sports, and activity documents into calendar events and to-do lists.

Today is ${today.toDateString()}. When a document omits the year, choose the year that puts the date in the upcoming season/school year.

The family:
${family}

Extract every dated event the family might need to show up for or act on. Rules:
- One entry per occurrence. Expand recurring schedules ("every Tuesday in October") into individual dates.
- Skip events that are clearly for other grades/teams than the family's kids when the document makes that obvious.
- Put deadlines (forms due, payments, sign-ups) in as their own events with category matching the source, and no start time.
- Put things to bring, wear, buy, or sign into "prep" on the related event, with a sensible daysBefore (e.g. buy supplies 3 days before, pack a bag 0-1 days before).
- In "who", use the family member's name when you can tell who it's for; otherwise the team/grade as written.
- Don't invent times or locations that aren't in the document.`;
}

function contentFor(doc: DocumentInput): Anthropic.Beta.BetaContentBlockParam {
  switch (doc.kind) {
    case 'pdf':
      return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.base64 }, title: doc.name };
    case 'image':
      return { type: 'image', source: { type: 'base64', media_type: doc.mediaType, data: doc.base64 } };
    case 'text':
      return { type: 'document', source: { type: 'text', media_type: 'text/plain', data: doc.text }, title: doc.name };
  }
}

export async function extractWithClaude(apiKey: string, doc: DocumentInput, members: FamilyMember[], today = new Date()): Promise<DraftEvent[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // If a request is ever declined by a safety classifier, let the API retry on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(ExtractedEvents) },
    system: systemPrompt(members, today),
    messages: [{ role: 'user', content: [contentFor(doc), { type: 'text', text: `Extract the events from "${doc.name}".` }] }],
  });

  if (response.stop_reason === 'refusal') throw new Error("Claude couldn't read this document. Try pasting the text instead.");
  if (response.stop_reason === 'max_tokens') throw new Error('That document is very long. Try splitting it into smaller pieces.');
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Couldn't understand the response. Please try again.");

  return parsed.events.map((e) => ({
    title: e.title,
    date: e.date,
    startTime: e.startTime ?? undefined,
    endTime: e.endTime ?? undefined,
    location: e.location ?? undefined,
    category: e.category,
    who: e.who,
    notes: e.notes ?? undefined,
    prep: e.prep,
  }));
}

export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'That API key was not accepted. Check it under Family → Settings.';
  if (err instanceof Anthropic.RateLimitError) return 'Too many requests right now. Wait a minute and try again.';
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check your internet connection.";
  if (err instanceof Anthropic.APIError) return `Claude returned an error (${err.status}). ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

export async function fileToDocument(file: File): Promise<DocumentInput> {
  const name = file.name;
  if (file.type === 'application/pdf') return { kind: 'pdf', name, base64: await toBase64(file) };
  if (/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
    return { kind: 'image', name, base64: await toBase64(file), mediaType: file.type as 'image/jpeg' };
  }
  return { kind: 'text', name, text: await file.text() };
}

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
