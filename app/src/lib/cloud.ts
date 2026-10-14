// Cloud mode: a shared family space on Supabase. Turned on by setting VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY at build time; without them the app runs in local (single-device) mode.

import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import type { DocumentInput, ExtractedEvent } from '../../supabase/functions/_shared/extraction';
import { isoToday } from './documents';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
export const cloudEnabled = supabase !== null;
export const appleSignInEnabled = import.meta.env.VITE_ENABLE_APPLE_SIGNIN === 'true';

export interface Family {
  id: string;
  name: string;
}

export interface FamilyAccount {
  userId: string;
  email: string | null;
  role: 'owner' | 'parent';
}

function db() {
  if (!supabase) throw new Error('Cloud mode is not configured');
  return supabase;
}

/** Postgres errors from our RPCs come back as plain messages; make them friendly. */
function friendly(message: string): string {
  if (message.includes('invite is invalid or expired')) return 'That invite code is wrong, already used, or expired. Ask for a new one.';
  if (message.includes('already in a family')) return "You're already in a family on this account.";
  return message;
}

export async function getMyFamily(userId: string): Promise<Family | null> {
  const { data, error } = await db().from('family_users').select('family_id, families(name)').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const fam = data.families as unknown as { name: string } | null;
  return { id: data.family_id as string, name: fam?.name ?? 'Our family' };
}

export async function createFamily(name: string): Promise<void> {
  const { error } = await db().rpc('create_family', { p_name: name });
  if (error) throw new Error(friendly(error.message));
}

export async function acceptInvite(code: string): Promise<void> {
  const { error } = await db().rpc('accept_invite', { p_code: code });
  if (error) throw new Error(friendly(error.message));
}

export async function createInvite(): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await db().rpc('create_invite');
  if (error) throw new Error(friendly(error.message));
  const row = (data as { code: string; expires_at: string }[])[0];
  return { code: row.code, expiresAt: row.expires_at };
}

export async function listAccounts(familyId: string): Promise<FamilyAccount[]> {
  const { data, error } = await db().from('family_users').select('user_id, email, role').eq('family_id', familyId).order('joined_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ userId: r.user_id, email: r.email, role: r.role }));
}

export async function extractCloud(doc: DocumentInput): Promise<ExtractedEvent[]> {
  const { data, error } = await db().functions.invoke('extract', { body: { doc, today: isoToday() } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? 'The AI reader had a problem. Please try again.');
    }
    throw new Error("Couldn't reach the AI reader. Check your internet connection.");
  }
  return (data as { events: ExtractedEvent[] }).events;
}

export function inviteLink(code: string): string {
  return `${location.origin}${location.pathname}?invite=${encodeURIComponent(code)}`;
}
