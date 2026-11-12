import { describe, expect, it } from 'vitest';
import { milestones } from './progress';
import { withSampleWork } from './seed';
import { emptyState } from './store';
import { createProject, saveDraftText } from './studio';

const reached = (s: Parameters<typeof milestones>[0]) => milestones(s).filter((m) => m.achievedAt).map((m) => m.kind);

describe('milestones', () => {
  it('a new user has none, and nothing is phrased as falling behind', () => {
    const all = milestones(emptyState());
    expect(all.every((m) => !m.achievedAt)).toBe(true);
    expect(JSON.stringify(all)).not.toMatch(/streak|behind|missed|points|rank/i);
  });

  it('sample work does not count as the user’s own progress', () => {
    expect(reached(withSampleWork(emptyState()))).toEqual([]);
  });

  it('derives milestones from real records', () => {
    let [s, , d] = createProject(emptyState(), { title: 'Mine', type: 'script', intent: '' });
    s = saveDraftText(s, d.id, 'word '.repeat(1000));
    expect(reached(s)).toEqual(expect.arrayContaining(['first_project', 'words_1000']));
  });
});
