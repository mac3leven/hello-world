// Turns a picked file into something the AI reader can take.
import type { DocumentInput } from '../../supabase/functions/_shared/extraction';

export type { DocumentInput };

export async function fileToDocument(file: File): Promise<DocumentInput> {
  const name = file.name;
  if (file.type === 'application/pdf') return { kind: 'pdf', name, base64: await toBase64(file) };
  if (/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
    return { kind: 'image', name, base64: await toBase64(file), mediaType: file.type as 'image/jpeg' };
  }
  if (/^image\//.test(file.type)) throw new Error('That photo format isn\'t supported. On iPhone, choose "Most Compatible" under Settings → Camera → Formats, or take a screenshot of it.');
  return { kind: 'text', name, text: await file.text() };
}

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
