import { describe, expect, it } from 'vitest';
import { syncSelfReports } from './profile';
import { recommend } from './recommend';
import { emptyState } from './store';
import type { AppState } from './types';

const setup = (patch: Partial<AppState['profile']>): AppState => {
  const s = emptyState();
  return syncSelfReports({ ...s, profile: { ...s.profile, ...patch } });
};

describe('recommend', () => {
  it('explains a general start when setup was skipped', () => {
    const [r] = recommend(emptyState());
    expect(r.reasons[0]).toMatch(/skipped setup/);
  });

  it('cites the onboarding inputs that informed it', () => {
    const [r] = recommend(setup({ goals: ['Write a short film'], frictions: ['structure'] }));
    expect(r.lessonId).toBe('scene-intention');
    expect(r.reasons.join(' ')).toMatch(/Write a short film/);
    expect(r.reasons.join(' ')).toMatch(/grow in story progression/);
  });

  it('can build from a strength', () => {
    const recs = recommend(setup({ strengths: ['voice'] }), { limit: 10 });
    expect(recs.some((r) => r.basis === 'strength' && r.reasons.some((x) => /strength you named/.test(x)))).toBe(true);
  });

  it('hides dismissed recommendations and brings deferred ones back after a few days', () => {
    const s = setup({ goals: ['Write a short film'] });
    const top = recommend(s)[0].key;
    const t0 = Date.parse('2026-03-01T00:00:00Z');
    const dismissed = { ...s, recommendations: { [top]: { status: 'dismissed' as const, at: new Date(t0).toISOString() } } };
    expect(recommend(dismissed, { at: t0, limit: 20 }).some((r) => r.key === top)).toBe(false);
    const deferred = { ...s, recommendations: { [top]: { status: 'deferred' as const, at: new Date(t0).toISOString() } } };
    expect(recommend(deferred, { at: t0 + 86_400_000, limit: 20 }).some((r) => r.key === top)).toBe(false);
    expect(recommend(deferred, { at: t0 + 4 * 86_400_000, limit: 20 }).some((r) => r.key === top)).toBe(true);
  });

  it('ignores Studio projects unless the user opted in', () => {
    const base = setup({});
    const withProject: AppState = {
      ...base,
      projects: [{ id: 'p', title: 'Film', type: 'script', intent: '', status: 'drafting', notes: [], createdAt: '', updatedAt: '' }],
    };
    const off = recommend(withProject, { limit: 10 }).flatMap((r) => r.reasons).join(' ');
    expect(off).not.toMatch(/Studio/);
    const on = recommend({ ...withProject, profile: { ...withProject.profile, permissions: { ...withProject.profile.permissions, studioForPersonalization: true } } }, { limit: 10 })
      .flatMap((r) => r.reasons).join(' ');
    expect(on).toMatch(/Studio/);
  });

  it('never uses guilt or streak language', () => {
    const text = JSON.stringify(recommend(setup({ goals: ['Build a daily writing practice'] }), { limit: 10 }));
    expect(text).not.toMatch(/streak|behind|missed|haven't|overdue/i);
  });
});
