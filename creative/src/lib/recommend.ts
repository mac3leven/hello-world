// Adaptive recommendations (FR-07, §8). Rule-based and explainable:
// - every suggestion carries "why this" reasons that cite the inputs used
// - can build from a strength as well as target a growth area
// - user interest/goals outrank inferred sequencing; nothing is locked
// - inactivity is neutral: no streaks, no "you're behind"
// - Studio work is only used when the user has opted in

import { LESSONS, PATHS, type Lesson } from '../content/curriculum';
import { lessonStatus } from './academy';
import { DIMENSION_LABEL } from './labels';
import { observationText, usableObservations } from './profile';
import type { AppState, RecommendationDecision } from './types';

export interface Recommendation {
  key: string;
  lessonId: string;
  title: string;
  summary: string;
  href: string;
  actionLabel: string;
  basis: 'continue' | 'strength' | 'growth' | 'interest' | 'start';
  reasons: string[];
  score: number;
}

const DEFER_MS = 3 * 86_400_000;

/** Goals and interests → learning paths (keyword match on what the user said they want to make). */
const PATH_HINTS: { pathId: string; words: RegExp }[] = [
  { pathId: 'scenes', words: /film|screen|script|cinematic|scene|dialogue|visual/i },
  { pathId: 'seeing', words: /personal|memoir|true|essay|story|observ/i },
  { pathId: 'voice-revision', words: /practice|daily|voice|finish|revis/i },
];

function isHidden(d: RecommendationDecision | undefined, at: number): boolean {
  if (!d) return false;
  if (d.status === 'dismissed' || d.status === 'accepted') return true;
  return d.status === 'deferred' && at - Date.parse(d.at) < DEFER_MS;
}

export function recommend(s: AppState, opts: { at?: number; limit?: number } = {}): Recommendation[] {
  const at = opts.at ?? Date.now();
  const p = s.profile;
  const usable = p.permissions.profile ? usableObservations(s) : [];
  const strengths = usable.filter((o) => o.polarity === 'strength');
  const growth = usable.filter((o) => o.polarity === 'opportunity');
  const said = [...p.goals, ...p.interests];

  // Studio-informed hints only with explicit opt-in (PRD §9, §15 #5–6).
  const studioTypes = p.permissions.studioForPersonalization
    ? [...new Set(s.projects.filter((x) => x.status !== 'finished').map((x) => x.type))]
    : [];

  const out: Recommendation[] = [];
  for (const lesson of LESSONS) {
    const status = lessonStatus(s, lesson);
    if (status === 'complete') continue;
    const key = `lesson:${lesson.id}`;
    if (isHidden(s.recommendations[key], at)) continue;

    const reasons: string[] = [];
    let score = 0;
    let basis: Recommendation['basis'] = 'start';

    if (status === 'in_progress' || status === 'feedback') {
      score += 6;
      basis = 'continue';
      reasons.push(status === 'feedback' ? 'You have feedback waiting on this exercise.' : 'You started this exercise and your draft is saved.');
    }

    for (const g of said) {
      if (PATH_HINTS.some((h) => h.pathId === lesson.pathId && h.words.test(g))) {
        score += 3;
        reasons.push(`Connects to what you said you want: “${g}”.`);
        if (basis === 'start') basis = 'interest';
        break;
      }
    }

    const strong = strengths.find((o) => lesson.dimensions.includes(o.dimension));
    if (strong) {
      score += 2;
      if (basis === 'start' || basis === 'interest') basis = 'strength';
      reasons.push(strong.kind === 'self_report'
        ? `Builds on a strength you named: ${DIMENSION_LABEL[strong.dimension].toLowerCase()}.`
        : `Builds on a strength seen in your practice: ${DIMENSION_LABEL[strong.dimension].toLowerCase()}.`);
    }

    const grow = growth.find((o) => lesson.dimensions.includes(o.dimension));
    if (grow) {
      score += grow.kind === 'self_report' ? 3 : 2;
      if (basis !== 'continue') basis = 'growth';
      reasons.push(grow.kind === 'self_report'
        ? `You said you'd like to grow in ${DIMENSION_LABEL[grow.dimension].toLowerCase()}.`
        : `Your recent feedback suggested a next step here: “${observationText(grow)}”`);
    }

    if (studioTypes.length && ((lesson.pathId === 'scenes' && studioTypes.some((t) => t === 'script' || t === 'cinematic'))
      || (lesson.pathId === 'seeing' && studioTypes.includes('personal_essay')))) {
      score += 1;
      reasons.push('Relates to the kind of project you have in your Studio (you allowed Studio work to be used).');
    }

    // Gentle tie-break: shorter lessons first when sessions are short; earlier in a path first.
    if (lesson.effortMinutes <= p.sessionMinutes) score += 0.5;
    const path = PATHS.find((x) => x.id === lesson.pathId)!;
    score -= path.lessonIds.indexOf(lesson.id) * 0.1;

    if (!reasons.length) {
      reasons.push(said.length || p.strengths.length || p.frictions.length
        ? 'A short, self-contained lesson that works for any kind of writing.'
        : 'You skipped setup, so this is a general starting point. Add goals in your Creative Profile for more specific suggestions.');
    }

    out.push({
      key,
      lessonId: lesson.id,
      title: lesson.title,
      summary: lesson.intention,
      href: basis === 'continue' ? continueHref(s, lesson) : `#/academy/lesson/${lesson.id}`,
      actionLabel: basis === 'continue' ? 'Continue' : `Start · ~${lesson.effortMinutes} min`,
      basis,
      reasons,
      score,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, opts.limit ?? 3);
}

function continueHref(s: AppState, lesson: Lesson): string {
  const a = s.attempts.filter((x) => lesson.exerciseIds.includes(x.exerciseId)).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt))[0];
  if (!a) return `#/academy/lesson/${lesson.id}`;
  return a.status === 'feedback' ? `#/academy/attempt/${a.id}` : `#/academy/exercise/${a.exerciseId}`;
}

export const BASIS_LABEL: Record<Recommendation['basis'], string> = {
  continue: 'Pick up again',
  strength: 'Builds on a strength',
  growth: 'A next challenge',
  interest: 'Matches your goals',
  start: 'A good place to start',
};
