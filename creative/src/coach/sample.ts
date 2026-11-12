// Built-in sample coach: deterministic, offline, no keys. Clearly labelled as a sample in the UI.

import type { CoachReply, CoachRequest, CoachService, FeedbackRequest } from './service';
import { buildFeedback } from './sampleFeedback';
import { sampleReply } from './sampleReply';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const sampleCoach: CoachService = {
  isSample: true,
  async feedback(req: FeedbackRequest) {
    await pause(500);
    return buildFeedback(req.exercise, req.text, { style: req.profile?.feedbackStyle, previousText: req.previousText });
  },
  async reply(req: CoachRequest): Promise<CoachReply> {
    await pause(400);
    return sampleReply(req);
  },
};
