// Studio record helpers (FR-04). Studio work is independent: nothing here reads or writes Academy data.
// Versioning rules: autosave keeps periodic snapshots; restoring never overwrites — the current text is
// snapshotted first and the restored text becomes a new version.

import { now, uid } from './id';
import type { AppState, Draft, DraftRevision, ProjectType, RevisionSource, StudioProject } from './types';

export const AUTO_SNAPSHOT_MS = 10 * 60_000;

export function createProject(
  s: AppState,
  input: { title: string; type: ProjectType; intent: string; goal?: string; ideaId?: string },
  ids: { projectId?: string; draftId?: string } = {},
): [AppState, StudioProject, Draft] {
  const t = now();
  const project: StudioProject = {
    id: ids.projectId ?? uid('proj'),
    title: input.title.trim() || 'Untitled project',
    type: input.type,
    intent: input.intent.trim(),
    goal: input.goal?.trim() || undefined,
    status: 'seed',
    notes: [],
    createdAt: t,
    updatedAt: t,
  };
  const draft: Draft = { id: ids.draftId ?? uid('draft'), projectId: project.id, title: 'Draft 1', text: '', createdAt: t, updatedAt: t };
  const ideas = input.ideaId ? s.ideas.map((i) => (i.id === input.ideaId ? { ...i, projectId: project.id } : i)) : s.ideas;
  return [{ ...s, projects: [project, ...s.projects], drafts: [draft, ...s.drafts], ideas }, project, draft];
}

export function addDraft(s: AppState, projectId: string, draftId = uid('draft')): [AppState, Draft] {
  const t = now();
  const n = s.drafts.filter((d) => d.projectId === projectId).length + 1;
  const draft: Draft = { id: draftId, projectId, title: `Draft ${n}`, text: '', createdAt: t, updatedAt: t };
  return [{ ...s, drafts: [draft, ...s.drafts], projects: touchProject(s.projects, projectId, t) }, draft];
}

const touchProject = (projects: StudioProject[], id: string, t: string) =>
  projects.map((p) => (p.id === id ? { ...p, updatedAt: t, status: p.status === 'seed' ? 'drafting' : p.status } : p));

/** Newest first; revisions stored later win ties on timestamp. */
export const revisionsFor = (s: AppState, draftId: string) =>
  s.revisions
    .map((r, i) => [r, i] as const)
    .filter(([r]) => r.draftId === draftId)
    .sort(([a, ai], [b, bi]) => b.createdAt.localeCompare(a.createdAt) || bi - ai)
    .map(([r]) => r);

function snapshot(s: AppState, draftId: string, text: string, source: RevisionSource, note?: string, at = now()): AppState {
  const rev: DraftRevision = { id: uid('rev'), draftId, text, source, note: note?.trim() || undefined, createdAt: at };
  return { ...s, revisions: [...s.revisions, rev] };
}

/** Autosave: update the draft; take an automatic snapshot at most every 10 minutes of editing. */
export function saveDraftText(s: AppState, draftId: string, text: string, at = new Date()): AppState {
  const draft = s.drafts.find((d) => d.id === draftId);
  if (!draft || draft.text === text) return s;
  const t = at.toISOString();
  let next: AppState = {
    ...s,
    drafts: s.drafts.map((d) => (d.id === draftId ? { ...d, text, updatedAt: t } : d)),
    projects: touchProject(s.projects, draft.projectId, t),
  };
  const last = revisionsFor(s, draftId)[0];
  if (draft.text.trim() && (!last || at.getTime() - Date.parse(last.createdAt) >= AUTO_SNAPSHOT_MS) && last?.text !== draft.text) {
    // Snapshot the text as it was before this burst of editing.
    next = snapshot(next, draftId, draft.text, 'auto', undefined, t);
  }
  return next;
}

export function saveSnapshot(s: AppState, draftId: string, note?: string, source: RevisionSource = 'manual'): AppState {
  const draft = s.drafts.find((d) => d.id === draftId);
  return draft ? snapshot(s, draftId, draft.text, source, note) : s;
}

/** Restore as a new version: the current text is kept as a snapshot first, nothing is lost. */
export function restoreRevision(s: AppState, revisionId: string): AppState {
  const rev = s.revisions.find((r) => r.id === revisionId);
  if (!rev) return s;
  const draft = s.drafts.find((d) => d.id === rev.draftId);
  if (!draft) return s;
  let next = s;
  const latest = revisionsFor(s, draft.id)[0];
  if (draft.text !== latest?.text) next = snapshot(next, draft.id, draft.text, 'manual', 'Before restoring an earlier version');
  const t = now();
  next = {
    ...next,
    drafts: next.drafts.map((d) => (d.id === draft.id ? { ...d, text: rev.text, updatedAt: t } : d)),
  };
  return snapshot(next, draft.id, rev.text, 'restore', `Restored version from ${new Date(rev.createdAt).toLocaleString()}`, t);
}

/** Accept a coach proposal into a draft: only ever called from an explicit user action. */
export function acceptIntoDraft(s: AppState, draftId: string, text: string): AppState {
  const draft = s.drafts.find((d) => d.id === draftId);
  if (!draft) return s;
  let next = snapshot(s, draftId, draft.text, 'manual', 'Before adding coach suggestion');
  const combined = `${draft.text.replace(/\s+$/, '')}\n\n${text}`;
  next = saveDraftText(next, draftId, combined);
  return snapshot(next, draftId, combined, 'coach_accepted', 'Added coach suggestion');
}

export function deleteProject(s: AppState, projectId: string): AppState {
  const draftIds = new Set(s.drafts.filter((d) => d.projectId === projectId).map((d) => d.id));
  return {
    ...s,
    projects: s.projects.filter((p) => p.id !== projectId),
    drafts: s.drafts.filter((d) => !draftIds.has(d.id)),
    revisions: s.revisions.filter((r) => !draftIds.has(r.draftId)),
    links: s.links.filter((l) => l.projectId !== projectId),
    // Ideas return to the inbox rather than being deleted with the project.
    ideas: s.ideas.map((i) => (i.projectId === projectId ? { ...i, projectId: undefined } : i)),
  };
}

export const SOURCE_LABEL: Record<RevisionSource, string> = {
  manual: 'Saved by you',
  auto: 'Automatic snapshot',
  restore: 'Restored',
  coach_accepted: 'Coach suggestion accepted',
};
