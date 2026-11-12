import { describe, expect, it } from 'vitest';
import { emptyState } from '../lib/store';
import { createProject, saveDraftText } from '../lib/studio';
import type { AppState } from '../lib/types';
import { resolveContext } from './context';

function twoProjects(): { s: AppState; draftId: string } {
  let [s, , d] = createProject(emptyState(), { title: 'Ferry', type: 'script', intent: 'father and daughter' });
  s = saveDraftText(s, d.id, 'INT. DECK – NIGHT');
  [s] = createProject(s, { title: 'Secret other', type: 'short_story', intent: 'private' });
  return { s, draftId: d.id };
}

describe('coach context', () => {
  it('context-free conversations get nothing at all', () => {
    const { s } = twoProjects();
    const r = resolveContext(s, { type: 'none' });
    expect(r.context.profile).toBeUndefined();
    expect(r.context.draft).toBeUndefined();
    expect(r.context.project).toBeUndefined();
  });

  it('shares the selected draft even with Studio personalization off, but never other projects', () => {
    const { s, draftId } = twoProjects();
    expect(s.profile.permissions.studioForPersonalization).toBe(false);
    const r = resolveContext(s, { type: 'draft', id: draftId });
    expect(r.context.draft?.text).toContain('DECK');
    expect(JSON.stringify(r.context)).not.toContain('Secret other');
    expect(r.withheld.join(' ')).toMatch(/other 1 Studio project/);
  });

  it('withholds Studio work from Academy conversations when not opted in', () => {
    const { s } = twoProjects();
    const r = resolveContext(s, { type: 'lesson', id: 'subtext' });
    expect(r.context.lesson?.id).toBe('subtext');
    expect(r.context.project).toBeUndefined();
    expect(r.withheld.join(' ')).toMatch(/Learn from my Studio work/);
  });

  it('withholds the profile when the user turns it off', () => {
    const { s } = twoProjects();
    const off = { ...s, profile: { ...s.profile, permissions: { ...s.profile.permissions, profile: false } } };
    const r = resolveContext(off, { type: 'lesson', id: 'subtext' });
    expect(r.context.profile).toBeUndefined();
    expect(r.context.labels).not.toContain('Your Creative Profile');
    expect(r.withheld.join(' ')).toMatch(/Creative Profile/);
  });
});
