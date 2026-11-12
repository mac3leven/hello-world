import { describe, expect, it } from 'vitest';
import { emptyState } from './store';
import { acceptIntoDraft, AUTO_SNAPSHOT_MS, createProject, deleteProject, restoreRevision, revisionsFor, saveDraftText, saveSnapshot } from './studio';

function withDraft() {
  const [s, project, draft] = createProject(emptyState(), { title: 'Ferry', type: 'script', intent: 'x' });
  return { s, project, draft };
}

describe('studio', () => {
  it('creates a project with a first draft and attaches the source idea', () => {
    const base = { ...emptyState(), ideas: [{ id: 'i1', text: 'idea', tags: [], createdAt: '' }] };
    const [s, p] = createProject(base, { title: '  ', type: 'short_story', intent: '', ideaId: 'i1' });
    expect(p.title).toBe('Untitled project');
    expect(s.drafts.filter((d) => d.projectId === p.id)).toHaveLength(1);
    expect(s.ideas[0].projectId).toBe(p.id);
    expect(s.attempts).toEqual([]); // Studio never creates Academy records
  });

  it('takes automatic snapshots at most every 10 minutes', () => {
    let { s, draft } = withDraft();
    const t0 = new Date('2026-01-01T10:00:00Z');
    s = saveDraftText(s, draft.id, 'one', t0);
    s = saveDraftText(s, draft.id, 'one two', new Date(t0.getTime() + 60_000));
    expect(revisionsFor(s, draft.id)).toHaveLength(1); // snapshot of "one" before editing resumed
    s = saveDraftText(s, draft.id, 'one two three', new Date(t0.getTime() + 2 * 60_000));
    expect(revisionsFor(s, draft.id)).toHaveLength(1);
    s = saveDraftText(s, draft.id, 'one two three four', new Date(t0.getTime() + 2 * 60_000 + AUTO_SNAPSHOT_MS));
    expect(revisionsFor(s, draft.id)).toHaveLength(2);
  });

  it('restores as a new version without losing the current text', () => {
    let { s, draft } = withDraft();
    s = saveDraftText(s, draft.id, 'first');
    s = saveSnapshot(s, draft.id, 'v1');
    const v1 = revisionsFor(s, draft.id)[0];
    s = saveDraftText(s, draft.id, 'second, unsaved');
    s = restoreRevision(s, v1.id);
    expect(s.drafts.find((d) => d.id === draft.id)!.text).toBe('first');
    const texts = revisionsFor(s, draft.id).map((r) => r.text);
    expect(texts).toContain('second, unsaved');
    expect(revisionsFor(s, draft.id)[0].source).toBe('restore');
  });

  it('adds coach text only through acceptIntoDraft, with a snapshot before and after', () => {
    let { s, draft } = withDraft();
    s = saveDraftText(s, draft.id, 'Mine.');
    s = acceptIntoDraft(s, draft.id, 'Suggested line.');
    expect(s.drafts.find((d) => d.id === draft.id)!.text).toBe('Mine.\n\nSuggested line.');
    const revs = revisionsFor(s, draft.id);
    expect(revs.some((r) => r.text === 'Mine.')).toBe(true);
    expect(revs.some((r) => r.source === 'coach_accepted')).toBe(true);
  });

  it('deleting a project returns its ideas to the inbox', () => {
    const base = { ...emptyState(), ideas: [{ id: 'i1', text: 'idea', tags: [], createdAt: '' }] };
    const [s, p] = createProject(base, { title: 'P', type: 'other', intent: '', ideaId: 'i1' });
    const after = deleteProject(s, p.id);
    expect(after.projects).toHaveLength(0);
    expect(after.drafts).toHaveLength(0);
    expect(after.ideas[0].projectId).toBeUndefined();
  });
});
