// Tiny hash router: every screen in the PRD screen map has its own address (#/studio/draft/abc),
// so screens can be linked, bookmarked, and navigated with the browser's back button.

import { useEffect, useState } from 'react';

export type RouteName =
  | 'welcome' | 'onboarding-goals' | 'onboarding-strengths' | 'onboarding-coach'
  | 'home'
  | 'academy' | 'path' | 'lesson' | 'exercise' | 'feedback'
  | 'studio' | 'ideas' | 'new-project' | 'project' | 'draft' | 'history'
  | 'profile' | 'evidence'
  | 'coach' | 'progress' | 'settings'
  | 'not-found';

export interface Route {
  name: RouteName;
  params: Record<string, string>;
  query: URLSearchParams;
}

const PATTERNS: [RouteName, string][] = [
  ['home', '/'],
  ['welcome', '/welcome'],
  ['onboarding-goals', '/onboarding/goals'],
  ['onboarding-strengths', '/onboarding/strengths'],
  ['onboarding-coach', '/onboarding/coach'],
  ['academy', '/academy'],
  ['path', '/academy/path/:pathId'],
  ['lesson', '/academy/lesson/:lessonId'],
  ['exercise', '/academy/exercise/:exerciseId'],
  ['feedback', '/academy/attempt/:attemptId'],
  ['studio', '/studio'],
  ['ideas', '/studio/ideas'],
  ['new-project', '/studio/new'],
  ['project', '/studio/project/:projectId'],
  ['draft', '/studio/draft/:draftId'],
  ['history', '/studio/draft/:draftId/history'],
  ['profile', '/profile'],
  ['evidence', '/profile/observation/:observationId'],
  ['coach', '/coach'],
  ['progress', '/progress'],
  ['settings', '/settings'],
];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const query = new URLSearchParams(qs);
  const parts = path.split('/').filter(Boolean);
  for (const [name, pattern] of PATTERNS) {
    const pp = pattern.split('/').filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = pp.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return seg === parts[i];
    });
    if (ok) return { name, params, query };
  }
  return { name: 'not-found', params: {}, query };
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const hash = `#${path}`;
  if (opts.replace) location.replace(hash);
  else location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Build a coach link that carries mode and context in the address. */
export function coachHref(opts: { mode?: string; ctx?: string; id?: string; conversation?: string } = {}): string {
  const q = new URLSearchParams();
  if (opts.mode) q.set('mode', opts.mode);
  if (opts.ctx && opts.ctx !== 'none') q.set('ctx', opts.ctx);
  if (opts.id) q.set('id', opts.id);
  if (opts.conversation) q.set('c', opts.conversation);
  const s = q.toString();
  return `#/coach${s ? `?${s}` : ''}`;
}
