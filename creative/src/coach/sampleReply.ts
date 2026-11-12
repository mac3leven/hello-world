// Sample conversational replies. Expanded in the Coach step.
import { MODE_LABEL } from '../lib/labels';
import type { CoachReply, CoachRequest } from './service';

export function sampleReply(req: CoachRequest): CoachReply {
  return { text: `(${MODE_LABEL[req.mode]}) I'm a sample coach. Full replies arrive in a later step.` };
}
