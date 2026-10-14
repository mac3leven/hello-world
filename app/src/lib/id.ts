export function uid(prefix = ''): string {
  return prefix + crypto.randomUUID().slice(0, 8);
}

export function normalizePlace(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
