import { describe, expect, it } from 'vitest';
import { coachHref, parseHash } from './router';

describe('router', () => {
  it('matches every screen-map route with params', () => {
    expect(parseHash('').name).toBe('home');
    expect(parseHash('#/academy/lesson/subtext')).toMatchObject({ name: 'lesson', params: { lessonId: 'subtext' } });
    expect(parseHash('#/studio/draft/d1/history')).toMatchObject({ name: 'history', params: { draftId: 'd1' } });
    expect(parseHash('#/profile/observation/o1').name).toBe('evidence');
    expect(parseHash('#/nope').name).toBe('not-found');
  });

  it('carries coach mode and context in the query', () => {
    const r = parseHash(coachHref({ mode: 'editor', ctx: 'draft', id: 'd1' }));
    expect(r.name).toBe('coach');
    expect(r.query.get('mode')).toBe('editor');
    expect(r.query.get('ctx')).toBe('draft');
    expect(r.query.get('id')).toBe('d1');
    expect(parseHash(coachHref({ ctx: 'none', conversation: 'c1' })).query.get('c')).toBe('c1');
    expect(coachHref({ ctx: 'none' })).toBe('#/coach');
  });
});
