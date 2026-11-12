import { describe, expect, it } from 'vitest';
import { emptyState, normalize } from './store';

describe('store', () => {
  it('defaults Studio-for-personalization to off (opt-in)', () => {
    expect(emptyState().profile.permissions).toEqual({ academyHistory: true, profile: true, studioForPersonalization: false });
  });

  it('fills in missing fields from older or partial saves', () => {
    const s = normalize({ user: { name: 'B' }, profile: { goals: ['x'] } });
    expect(s.user.name).toBe('B');
    expect(s.user.onboarded).toBe(false);
    expect(s.profile.goals).toEqual(['x']);
    expect(s.profile.permissions.studioForPersonalization).toBe(false);
    expect(s.drafts).toEqual([]);
  });
});
