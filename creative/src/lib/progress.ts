// Milestones (PRD H1, §2 principle 6): meaningful moments derived from real work — no points, ranks, or streaks.
// Derived rather than stored, so they always match the underlying records (and disappear if work is deleted).

import { exerciseById } from '../content/curriculum';
import { submittedVersions } from './academy';
import { wordCount } from './labels';
import type { AppState } from './types';

export interface Milestone {
  kind: string;
  title: string;
  description: string;
  achievedAt?: string;
}

const earliest = (dates: (string | undefined)[]) => dates.filter((d): d is string => !!d).sort()[0];

export function milestones(s: AppState): Milestone[] {
  const realIdeas = s.ideas.filter((i) => !i.text.startsWith('[Sample]'));
  const realProjects = s.projects.filter((p) => !p.title.startsWith('[Sample]'));
  const realProjectIds = new Set(realProjects.map((p) => p.id));
  const realDrafts = s.drafts.filter((d) => realProjectIds.has(d.projectId));
  const submitted = s.attempts.filter((a) => submittedVersions(a).length > 0);
  const revised = s.attempts.filter((a) => submittedVersions(a).length > 1);
  const words = realDrafts.reduce((n, d) => n + wordCount(d.text), 0);
  const accepted = s.revisions.filter((r) => r.source === 'coach_accepted' && realDrafts.some((d) => d.id === r.draftId));
  const firstRevised = revised.map((a) => submittedVersions(a)[1]?.submittedAt);

  return [
    { kind: 'first_idea', title: 'Captured an idea', description: 'Saved a first idea to the Studio inbox.', achievedAt: earliest(realIdeas.map((i) => i.createdAt)) },
    { kind: 'first_project', title: 'Started a project', description: 'Turned an idea or intention into a Studio project.', achievedAt: earliest(realProjects.map((p) => p.createdAt)) },
    { kind: 'first_feedback', title: 'Practised with feedback', description: 'Submitted an Academy exercise for feedback.', achievedAt: earliest(submitted.map((a) => submittedVersions(a)[0].submittedAt)) },
    { kind: 'first_revision', title: 'Revised after feedback', description: 'Came back to an exercise and revised it.', achievedAt: earliest(firstRevised) },
    { kind: 'lesson_finished', title: 'Finished a practice cycle', description: 'Marked an exercise finished, with or without a reflection.', achievedAt: earliest(s.attempts.filter((a) => a.status === 'complete').map((a) => a.updatedAt)) },
    { kind: 'linked_learning', title: 'Applied learning to your work', description: 'Connected an Academy lesson to a Studio project.', achievedAt: earliest(s.links.filter((l) => realProjectIds.has(l.projectId)).map((l) => l.createdAt)) },
    { kind: 'words_1000', title: '1,000 words in the Studio', description: `Across your drafts (currently ${words.toLocaleString()}).`, achievedAt: words >= 1000 ? earliest(realDrafts.map((d) => d.updatedAt)) : undefined },
    { kind: 'coach_accepted', title: 'Used a coach suggestion', description: 'Chose to add a coach suggestion to a draft.', achievedAt: earliest(accepted.map((r) => r.createdAt)) },
    { kind: 'project_finished', title: 'Finished a project', description: 'Marked a Studio project as finished.', achievedAt: earliest(realProjects.filter((p) => p.status === 'finished').map((p) => p.updatedAt)) },
  ];
}

/** A plain-language list of recent activity for the Progress page. */
export function recentLearning(s: AppState) {
  return [...s.attempts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((a) => ({ attempt: a, exercise: exerciseById(a.exerciseId), submissions: submittedVersions(a).length }));
}

/** Most recent activity of any kind, or undefined for a brand-new user. */
export function lastActivity(s: AppState): string | undefined {
  return [
    ...s.attempts.map((a) => a.updatedAt),
    ...s.drafts.map((d) => d.updatedAt),
    ...s.ideas.map((i) => i.createdAt),
    ...s.conversations.map((c) => c.updatedAt),
  ].sort().at(-1);
}
