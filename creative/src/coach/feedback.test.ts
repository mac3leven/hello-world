import { describe, expect, it } from 'vitest';
import { exerciseById } from '../content/curriculum';
import { analyze } from './analysis';
import { buildFeedback } from './sampleFeedback';

const room = exerciseById('ex-kitchen')!;
const subtext = exerciseById('ex-subtext')!;

describe('sample feedback', () => {
  it('always names a strength first and never grades', () => {
    const f = buildFeedback(room, 'It was a nice room. It was very nice and had things in it.');
    expect(f.strengths.length).toBeGreaterThan(0);
    expect(JSON.stringify(f)).not.toMatch(/\b(score|grade|\d+\/10|out of)\b/i);
    expect(f.sample).toBe(true);
  });

  it('gives every opportunity an explanation and a question', () => {
    const f = buildFeedback(room, 'It was a nice room. It was very nice and had things in it. I felt so sad there.');
    expect(f.opportunities.length).toBeGreaterThan(0);
    for (const o of f.opportunities) {
      expect(o.explanation.length).toBeGreaterThan(10);
      expect(o.question).toMatch(/\?$/);
    }
  });

  it('cites the writer’s own passage for a strength', () => {
    const text = 'My grandmother kept twist-ties in a coffee can by the stove. The radio hummed. Dust on the window.';
    const f = buildFeedback(room, text);
    expect(f.strengths[0].observation).toContain('coffee can');
  });

  it('offers fewer opportunities for a gentle feedback style', () => {
    const text = 'It was a really nice room. It was very nice and had things in it. Everything was beautiful.';
    expect(buildFeedback(room, text, { style: 'gentle' }).opportunities.length).toBeLessThanOrEqual(1);
  });

  it('notes changes from the previous attempt', () => {
    const f = buildFeedback(room, 'The stove. The coffee can. Cold tin under my fingers.', { previousText: 'A nice room.' });
    expect(f.note).toMatch(/Compared with your last attempt/);
  });

  it('flags missing dialogue for the subtext exercise', () => {
    const f = buildFeedback(subtext, 'They stood in the kitchen. Nobody spoke. The tap dripped.');
    expect(f.opportunities.some((o) => /dialogue/.test(o.observation))).toBe(true);
  });

  it('does not treat a general "you finished" strength as craft evidence', () => {
    const f = buildFeedback(room, 'A room.');
    expect(f.strengths[0].general).toBe(true);
  });

  it('recognises a turn like "before Maya could ask"', () => {
    const s = analyze('Maya came to ask. The café was quiet. She waited. "I quit today," Jess said, before Maya could ask.');
    expect(s.turnInSecondHalf).toMatch(/before Maya could ask/);
  });

  it('detects screenplay dialogue and headings', () => {
    const s = analyze('INT. FERRY DECK – NIGHT\n\nWALT\nThey used to run this every hour.\n\nNORA\nI know, Dad.');
    expect(s.scriptFormat).toBe(true);
    expect(s.dialogueLines).toBeGreaterThanOrEqual(2);
  });
});
