import type { CoachMode, Confidence, Dimension, FeedbackStyle, ProjectStatus, ProjectType } from './types';

export const DIMENSIONS: Dimension[] = ['observation', 'ideas', 'language', 'structure', 'emotion', 'voice', 'revision'];

export const DIMENSION_LABEL: Record<Dimension, string> = {
  observation: 'Observation & detail',
  ideas: 'Ideas & angles',
  language: 'Language & precision',
  structure: 'Story progression & structure',
  emotion: 'Emotional connection & meaning',
  voice: 'Voice & rhythm',
  revision: 'Editing & revision',
};

export const MODE_LABEL: Record<CoachMode, string> = {
  instructor: 'Instructor',
  mentor: 'Mentor',
  editor: 'Editor',
  partner: 'Creative Partner',
};

export const MODE_BLURB: Record<CoachMode, string> = {
  instructor: 'Explains a principle, shows a marked example, then invites practice.',
  mentor: 'Asks focused questions about your intention and choices.',
  editor: 'Points to specific passages, explains the effect, offers options.',
  partner: 'Brainstorms possibilities, variations, and experiments.',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  tentative: 'Tentative — one piece of evidence',
  emerging: 'Emerging — seen a few times',
  consistent: 'Consistent — seen across several pieces',
};

export const FEEDBACK_STYLE_LABEL: Record<FeedbackStyle, string> = {
  direct: 'Direct and specific',
  gentle: 'Gentle, one thing at a time',
  questions: 'Mostly questions',
};

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  short_story: 'Short story',
  script: 'Script / screenplay',
  personal_essay: 'Personal story / essay',
  cinematic: 'Cinematic story / treatment',
  other: 'Other writing',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  seed: 'Seed',
  drafting: 'Drafting',
  revising: 'Revising',
  resting: 'Resting',
  finished: 'Finished',
};

export const GOAL_OPTIONS = [
  'Write a short film',
  'Finish a short story',
  'Tell a true personal story',
  'Write a feature screenplay',
  'Build a daily writing practice',
  'Develop a cinematic project',
];

export const INTEREST_OPTIONS = [
  'Scriptwriting',
  'Personal storytelling',
  'Short fiction',
  'Cinematic storytelling',
  'Dialogue',
  'Memoir',
  'Visual storytelling',
];

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
