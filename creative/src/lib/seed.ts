// Optional sample workspace so the Studio can be explored before you have your own work.
// Loaded only when the user chooses "Explore with sample work"; every record is marked [Sample].

import { uid } from './id';
import type { AppState } from './types';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export function withSampleWork(s: AppState): AppState {
  const projectId = uid('proj');
  const draftId = uid('draft');
  const v1 = `INT. FERRY DECK – NIGHT

Wind. The lights of the mainland shrink behind them.

NORA (40s) holds a paper cup she hasn't drunk from. Her father, WALT (70s), studies the wake.

WALT
They used to run this every hour.

NORA
I know, Dad.

He doesn't hear her. Or pretends not to.`;
  const v2 = `${v1}

Nora sets the cup on the rail. It slides with the roll of the ship. Neither of them reaches for it.

WALT
Your mother hated the crossing. Said the water was too dark to trust.

NORA
She said that about everything.

A beat. Walt almost smiles.`;

  return {
    ...s,
    ideas: [
      { id: uid('idea'), text: '[Sample] A lighthouse keeper who keeps a log of every ship that DIDN\'T pass.', tags: ['short film'], createdAt: daysAgo(6) },
      { id: uid('idea'), text: '[Sample] Overheard on the bus: "I only lie to people I love." Who says that, and to whom?', tags: ['dialogue'], createdAt: daysAgo(3) },
      { id: uid('idea'), text: '[Sample] The ferry at night — Dad watching the wake like he\'s waiting for something to surface.', tags: [], createdAt: daysAgo(9), projectId },
      ...s.ideas,
    ],
    projects: [
      {
        id: projectId,
        title: '[Sample] The Night Ferry',
        type: 'script',
        intent: 'A short film about a daughter and her ageing father on a ferry crossing, saying everything except the thing that matters.',
        goal: 'Finish a 10-page first draft',
        status: 'drafting',
        notes: [
          { id: uid('note'), text: 'Keep the mother offscreen. She exists only in what they avoid saying.', createdAt: daysAgo(8) },
        ],
        createdAt: daysAgo(9),
        updatedAt: daysAgo(1),
      },
      ...s.projects,
    ],
    drafts: [
      { id: draftId, projectId, title: 'Opening scene', text: v2, createdAt: daysAgo(8), updatedAt: daysAgo(1) },
      ...s.drafts,
    ],
    revisions: [
      { id: uid('rev'), draftId, text: v1, source: 'manual', note: 'First pass of the deck scene', createdAt: daysAgo(8) },
      { id: uid('rev'), draftId, text: v2, source: 'auto', createdAt: daysAgo(1) },
      ...s.revisions,
    ],
  };
}
