// Local mode only: calls Claude straight from the browser with the family's own key.
// In cloud mode the same extraction runs in the `extract` edge function instead.
// This module (and the Anthropic SDK) is loaded on demand.

import Anthropic from '@anthropic-ai/sdk';
import {
  buildSystemPrompt, documentContent, EXTRACTION_MODEL, EXTRACTION_SCHEMA, normalizeExtracted, validateDocument,
  type DocumentInput, type ExtractedEvent,
} from '../../supabase/functions/_shared/extraction';
import type { FamilyMember } from './types';

export async function extractLocal(apiKey: string, doc: DocumentInput, members: FamilyMember[], today = new Date()): Promise<ExtractedEvent[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.beta.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    // If a safety classifier ever declines, the API retries on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: EXTRACTION_SCHEMA } },
    system: buildSystemPrompt(members, today),
    messages: [{ role: 'user', content: documentContent(validateDocument(doc)) }],
  });

  if (response.stop_reason === 'refusal') throw new Error("Claude couldn't read this document. Try pasting the text instead.");
  if (response.stop_reason === 'max_tokens') throw new Error('That document is very long. Try splitting it into smaller pieces.');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error("Couldn't understand the response. Please try again.");
  return normalizeExtracted(JSON.parse(text.text));
}

export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'That API key was not accepted. Check it under Family → Settings.';
  if (err instanceof Anthropic.RateLimitError) return 'Too many requests right now. Wait a minute and try again.';
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check your internet connection.";
  if (err instanceof Anthropic.APIError) return `Claude returned an error (${err.status}). ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
