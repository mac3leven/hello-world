// The one coach. Every screen talks to `coach` through this interface, so the sample implementation
// can be replaced by a real model later (e.g. Claude via a small server function) without UI changes.
//
// To add real Claude responses later:
//   1. Implement CoachService in e.g. `claude.ts`, calling your own server endpoint (keep the API key server-side).
//   2. Send only the context in `CoachRequest.context` — it has already been filtered by the user's permissions.
//   3. Return proposals as `proposal` text; the UI only inserts them into a draft when the user accepts.
//   4. Switch the export at the bottom of this file.

import type { Exercise, Lesson } from '../content/curriculum';
import type { CoachMode, CreativeProfile, Feedback, SkillObservation, StudioProject } from '../lib/types';
import { sampleCoach } from './sample';

export interface FeedbackRequest {
  exercise: Exercise;
  text: string;
  previousText?: string;
  /** Present only when the user allows the coach to use their profile. */
  profile?: Pick<CreativeProfile, 'feedbackStyle' | 'goals'>;
}

/** Context the coach may see for one reply, already filtered by permissions. */
export interface ResolvedContext {
  /** Human-readable labels shown in the context chip and under each reply. */
  labels: string[];
  lesson?: Lesson;
  exercise?: Exercise;
  attemptText?: string;
  project?: StudioProject;
  draft?: { id: string; title: string; text: string };
  profile?: Pick<CreativeProfile, 'goals' | 'interests' | 'feedbackStyle'>;
  observations?: SkillObservation[];
}

export interface CoachRequest {
  mode: CoachMode;
  message: string;
  context: ResolvedContext;
  /** Earlier turns in this conversation (same coach identity across modes). */
  history: { role: 'user' | 'coach'; text: string; mode: CoachMode }[];
}

export interface CoachReply {
  text: string;
  /** Optional text the user may choose to add to the draft in context, or save to the idea inbox. */
  proposal?: { text: string; target: 'draft' | 'ideas' };
}

export interface CoachService {
  /** True while responses come from the built-in sample coach rather than a model. */
  readonly isSample: boolean;
  feedback(req: FeedbackRequest): Promise<Feedback>;
  reply(req: CoachRequest): Promise<CoachReply>;
}

export const coach: CoachService = sampleCoach;
