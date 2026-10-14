// Reads a school/sports document with Claude on the server, so the API key never reaches a phone.
//
// Request:  POST { doc: DocumentInput, today: "YYYY-MM-DD" } with the user's Supabase JWT.
// Response: { events: ExtractedEvent[] } or { error: string }.
//
// Secrets (supabase secrets set ...): ANTHROPIC_API_KEY, optional ALLOWED_ORIGIN and AI_DAILY_LIMIT.
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import Anthropic from 'npm:@anthropic-ai/sdk@0.133.0';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import {
  buildSystemPrompt,
  documentContent,
  EXTRACTION_MODEL,
  EXTRACTION_SCHEMA,
  normalizeExtracted,
  validateDocument,
  type PromptMember,
} from '../_shared/extraction.ts';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '40');

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return reply(401, { error: 'Please sign in again.' });

  // A client scoped to the caller: every query below goes through row-level security as them.
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData } = await asUser.auth.getUser();
  if (!userData.user) return reply(401, { error: 'Please sign in again.' });

  const { data: membership } = await asUser.from('family_users').select('family_id').eq('user_id', userData.user.id).maybeSingle();
  if (!membership) return reply(403, { error: 'Join or create a family first.' });

  let doc, today: Date;
  try {
    const body = await req.json();
    doc = validateDocument(body?.doc);
    today = typeof body?.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? new Date(`${body.today}T12:00:00`) : new Date();
  } catch (err) {
    return reply(400, { error: err instanceof Error ? err.message : 'Bad request' });
  }

  // Cost guardrail: count the request before calling Claude.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: used, error: usageError } = await admin.rpc('increment_ai_usage', { p_family: membership.family_id });
  if (usageError) return reply(500, { error: 'Something went wrong. Please try again.' });
  if ((used as number) > DAILY_LIMIT) return reply(429, { error: `Your family has used today's ${DAILY_LIMIT} AI reads. Try again tomorrow, or paste the text instead.` });

  const { data: memberRows } = await asUser.from('family_records').select('data').eq('kind', 'member').eq('deleted', false);
  const members: PromptMember[] = (memberRows ?? []).map((r) => r.data as PromptMember);

  try {
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const response = await anthropic.beta.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 16000,
      // If a safety classifier ever declines, the API retries on a fallback model automatically.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: EXTRACTION_SCHEMA } },
      system: buildSystemPrompt(members, today),
      messages: [{ role: 'user', content: documentContent(doc) }],
    });

    if (response.stop_reason === 'refusal') return reply(422, { error: "Claude couldn't read this document. Try pasting the text instead." });
    if (response.stop_reason === 'max_tokens') return reply(422, { error: 'That document is very long. Try splitting it into smaller pieces.' });
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return reply(502, { error: "Couldn't understand the response. Please try again." });
    return reply(200, { events: normalizeExtracted(JSON.parse(text.text)) });
  } catch (err) {
    console.error('extract failed', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    if (err instanceof Anthropic.RateLimitError) return reply(503, { error: 'The AI reader is busy. Wait a minute and try again.' });
    return reply(502, { error: 'The AI reader had a problem. Please try again.' });
  }
});
