// Permission enforcement for the coach (PRD §9). The coach only ever receives what this function returns,
// so the context chip in the UI is exactly what the coach saw.

import { exerciseById, lessonById } from '../content/curriculum';
import { submittedVersions } from '../lib/academy';
import { usableObservations } from '../lib/profile';
import type { AppState, CoachContext } from '../lib/types';
import type { ResolvedContext } from './service';

export interface ContextResolution {
  context: ResolvedContext;
  /** What exists but was left out, and why — shown so boundaries are visible. */
  withheld: string[];
}

export function resolveContext(s: AppState, ctx: CoachContext): ContextResolution {
  const perms = s.profile.permissions;
  const labels: string[] = [];
  const withheld: string[] = [];
  const out: ResolvedContext = { labels };

  if (ctx.type === 'none') {
    labels.push('Nothing — a context-free conversation');
    return { context: out, withheld };
  }

  if (ctx.type === 'lesson' && ctx.id) {
    const lesson = lessonById(ctx.id);
    if (lesson) { out.lesson = lesson; labels.push(`Lesson: “${lesson.title}”`); }
  }

  if (ctx.type === 'exercise' && ctx.id) {
    const ex = exerciseById(ctx.id);
    if (ex) {
      out.exercise = ex;
      out.lesson = lessonById(ex.lessonId);
      labels.push(`Exercise: “${ex.title}”`);
    }
  }

  if (ctx.type === 'attempt' && ctx.id) {
    // You opened the coach on this attempt, so it may read it.
    const a = s.attempts.find((x) => x.id === ctx.id);
    if (a) {
      const ex = exerciseById(a.exerciseId);
      const latest = submittedVersions(a).at(-1) ?? a.versions.at(-1);
      out.exercise = ex;
      out.lesson = ex && lessonById(ex.lessonId);
      out.attemptText = latest?.text;
      labels.push(`Your attempt at “${ex?.title ?? 'an exercise'}”`);
    }
  }

  if ((ctx.type === 'project' || ctx.type === 'draft') && ctx.id) {
    // User-initiated: the selected project/draft is allowed even when Studio personalization is off.
    const draft = ctx.type === 'draft' ? s.drafts.find((d) => d.id === ctx.id) : undefined;
    const project = s.projects.find((p) => p.id === (draft ? draft.projectId : ctx.id));
    if (project) {
      out.project = project;
      labels.push(`Project: “${project.title}” (title, intent, notes)`);
    }
    if (draft) {
      out.draft = { id: draft.id, title: draft.title, text: draft.text };
      labels.push(`This draft: “${draft.title}”`);
    }
    const others = s.projects.length - (project ? 1 : 0);
    if (others > 0) withheld.push(`Your other ${others} Studio project${others === 1 ? '' : 's'} — only what you opened the coach from is shared.`);
  } else if (s.projects.length && !perms.studioForPersonalization) {
    withheld.push('Your Studio work — “Learn from my Studio work” is off.');
  }

  if (perms.profile) {
    out.profile = { goals: s.profile.goals, interests: s.profile.interests, feedbackStyle: s.profile.feedbackStyle };
    out.observations = usableObservations(s);
    labels.push('Your Creative Profile');
  } else {
    withheld.push('Your Creative Profile — turned off in Settings.');
  }

  if (!perms.academyHistory && s.attempts.length && ctx.type !== 'attempt') {
    withheld.push('Your Academy practice history — turned off in Settings.');
  }

  return { context: out, withheld };
}
