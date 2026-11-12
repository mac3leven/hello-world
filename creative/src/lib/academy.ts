// Academy record helpers. Attempts belong to the Academy only; nothing here touches Studio data.

import { EXERCISES, LESSONS, type Lesson } from '../content/curriculum';
import { now, uid } from './id';
import type { AppState, Feedback, LearningAttempt } from './types';

export const latestAttempt = (s: AppState, exerciseId: string): LearningAttempt | undefined =>
  s.attempts.filter((a) => a.exerciseId === exerciseId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

/** The unsubmitted version being written, if any. */
export const workingVersion = (a: LearningAttempt) => {
  const last = a.versions[a.versions.length - 1];
  return last && !last.submittedAt ? last : undefined;
};

export const submittedVersions = (a: LearningAttempt) => a.versions.filter((v) => v.submittedAt);

export const newAttemptId = () => uid('att');

/** Save working text under `attemptId`, creating the attempt or a new working version as needed. */
export function saveWorking(s: AppState, exerciseId: string, attemptId: string, text: string): AppState {
  const t = now();
  const existing = s.attempts.find((a) => a.id === attemptId);
  if (!existing) {
    const a: LearningAttempt = {
      id: attemptId,
      exerciseId,
      versions: [{ id: uid('v'), text, savedAt: t }],
      status: 'in_progress',
      startedAt: t,
      updatedAt: t,
    };
    return { ...s, attempts: [...s.attempts, a] };
  }
  const w = workingVersion(existing);
  const versions = w
    ? existing.versions.map((v) => (v.id === w.id ? { ...v, text, savedAt: t } : v))
    : [...existing.versions, { id: uid('v'), text, savedAt: t }];
  const updated = { ...existing, versions, status: 'in_progress' as const, updatedAt: t };
  return { ...s, attempts: s.attempts.map((a) => (a.id === existing.id ? updated : a)) };
}

export function attachFeedback(s: AppState, attemptId: string, feedback: Feedback): AppState {
  const t = now();
  return {
    ...s,
    attempts: s.attempts.map((a) => {
      if (a.id !== attemptId) return a;
      const w = workingVersion(a);
      if (!w) return a;
      return {
        ...a,
        status: 'feedback',
        updatedAt: t,
        versions: a.versions.map((v) => (v.id === w.id ? { ...v, submittedAt: t, feedback } : v)),
      };
    }),
  };
}

export type LessonStatus = 'new' | 'in_progress' | 'feedback' | 'complete';

export function lessonStatus(s: AppState, lesson: Lesson): LessonStatus {
  const attempts = s.attempts.filter((a) => lesson.exerciseIds.includes(a.exerciseId));
  if (attempts.some((a) => a.status === 'complete')) return 'complete';
  if (attempts.some((a) => a.status === 'feedback')) return 'feedback';
  if (attempts.length) return 'in_progress';
  return 'new';
}

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  new: 'Not started',
  in_progress: 'In progress',
  feedback: 'Feedback received',
  complete: 'Practised',
};

export function lessonForExercise(exerciseId: string): Lesson | undefined {
  const ex = EXERCISES.find((e) => e.id === exerciseId);
  return ex ? LESSONS.find((l) => l.id === ex.lessonId) : undefined;
}
