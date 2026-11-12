// Sample exercise feedback (FR-03). Rules it follows:
// - at least one observed strength, named first
// - each opportunity = observation (what's on the page) + explanation (why it matters) + a question
// - observation is kept separate from interpretation; taste is never stated as fact
// - no score, no grade, no permanent label
// - feedback style from the profile changes how many opportunities are offered

import type { Exercise } from '../content/curriculum';
import { DIMENSION_LABEL } from '../lib/labels';
import type { Dimension, Feedback, FeedbackItem, FeedbackStyle } from '../lib/types';
import { analyze, quote, sentenceWith, type TextSignals } from './analysis';

interface Candidate {
  strength?: FeedbackItem;
  opportunity?: FeedbackItem;
}

function forDimension(d: Dimension, s: TextSignals, ex: Exercise): Candidate {
  const c: Candidate = {};
  switch (d) {
    case 'observation': {
      if (s.sensory.length >= 2) {
        c.strength = {
          dimension: d,
          observation: `You ground the piece in physical detail — for example: “${quote(sentenceWith(s, s.sensory))}”`,
          explanation: 'Concrete, sensory nouns let a reader see the moment for themselves instead of being told what to think about it.',
        };
      }
      if (s.general.length >= 2 || s.sensory.length < 2) {
        const words = s.general.slice(0, 3).map((w) => `“${w}”`).join(', ');
        c.opportunity = {
          dimension: d,
          observation: s.general.length >= 2
            ? `A few words are general rather than specific (${words}).`
            : 'There are only a few physical, sensory details on the page so far.',
          explanation: 'General words ask the reader to do the imagining. One precise detail often carries more feeling than several general ones — though how much detail suits the piece is your call.',
          question: 'Which single moment here could you anchor with an object, sound, or texture only you would remember?',
        };
      }
      break;
    }
    case 'language': {
      if (s.intensifiers <= 1 && s.words >= 40) {
        c.strength = {
          dimension: d,
          observation: 'Your word choice is economical: almost no intensifiers like “very” or “really”.',
          explanation: 'Letting nouns and verbs carry the weight usually reads as more confident.',
        };
      } else if (s.intensifiers >= 2) {
        c.opportunity = {
          dimension: d,
          observation: `Intensifiers (very, really, so…) appear ${s.intensifiers} times.`,
          explanation: 'Intensifiers can signal that the underlying word isn’t quite doing the job yet.',
          question: 'Try removing each one. Does the sentence get weaker — or does it suggest a sharper word?',
        };
      }
      break;
    }
    case 'structure': {
      if (ex.id === 'ex-silent-scene' && !s.scriptFormat) {
        c.opportunity = {
          dimension: d,
          observation: 'There’s no scene heading (e.g. “INT. KITCHEN – NIGHT”) yet.',
          explanation: 'A heading tells the reader exactly where the camera is, which frees the action lines to focus on behaviour.',
          question: 'Where and when is this happening? Could that choice itself say something about the character?',
        };
      } else if (s.habitual.length && (ex.id === 'ex-one-afternoon')) {
        c.opportunity = {
          dimension: d,
          observation: `Phrases like “${s.habitual[0]}” keep part of the piece in summary.`,
          explanation: 'Summary tells the reader what usually happened; a scene shows what happened once. Both are useful — the exercise is practising the second.',
          question: 'Which specific day could you drop the reader into, and what was different about it?',
        };
      }
      if (s.turnInSecondHalf) {
        c.strength = {
          dimension: d,
          observation: `There’s a shift in the second half: “${quote(s.turnInSecondHalf)}”`,
          explanation: 'A scene feels alive when the situation at the end isn’t the one we started with.',
        };
      } else if (!c.opportunity) {
        c.opportunity = {
          dimension: d,
          observation: 'It’s hard to point to a single moment where something changes.',
          explanation: 'That may be intentional — stillness can be the point. If not, a visible turn gives the reader something to hold on to.',
          question: 'What is different at the end that wasn’t true at the start? Could one line or action make that change visible?',
        };
      }
      break;
    }
    case 'emotion': {
      if (s.statedEmotion.length) {
        c.opportunity = {
          dimension: d,
          observation: `A feeling is named directly: “${quote(s.statedEmotion[0])}”`,
          explanation: 'Naming an emotion tells the reader what to feel; showing what someone does with it lets them feel it. Sometimes naming is exactly right — it depends on the effect you want.',
          question: 'What would this person do — or carefully not do — that shows this without the word?',
        };
      } else if (s.dialogueLines > 0 || s.sentences.length >= 4) {
        c.strength = {
          dimension: d,
          observation: 'Feeling comes through behaviour and situation rather than being named.',
          explanation: 'That leaves room for the reader to arrive at the emotion themselves, which usually makes it land harder.',
        };
      }
      break;
    }
    case 'voice': {
      const short = s.shortSentences[0];
      if (s.sentenceSpread >= 5 && short) {
        c.strength = {
          dimension: d,
          observation: `Your rhythm varies — longer sentences set up short ones like “${quote(short, 60)}”`,
          explanation: 'Contrast in sentence length creates emphasis without needing to say “this matters”.',
        };
      } else if (s.sentences.length >= 4) {
        c.opportunity = {
          dimension: d,
          observation: `Most sentences are a similar length (around ${Math.round(s.avgSentence)} words).`,
          explanation: 'Even rhythm can be calming or flat depending on what you want; varying it is one way to put weight on a moment.',
          question: 'Read it aloud. Where would a very short sentence land the hardest?',
        };
      }
      if (ex.id === 'ex-subtext' && s.dialogueLines === 0) {
        c.opportunity = {
          dimension: d,
          observation: 'There isn’t any dialogue on the page yet.',
          explanation: 'This exercise practises meaning beneath spoken lines, so the conversation itself is the material.',
          question: 'What’s the small, safe thing these two people would argue about instead?',
        };
      }
      break;
    }
    case 'ideas': {
      const items = s.listItems;
      if (items >= 5) {
        c.strength = {
          dimension: d,
          observation: `You generated ${items} distinct ways in before choosing one.`,
          explanation: 'Generating several angles before committing makes it more likely the one you pick is yours, not just the first that came.',
        };
      } else {
        c.opportunity = {
          dimension: d,
          observation: items ? `There are ${items} angles listed so far.` : 'The angles aren’t listed separately yet, so they’re hard to compare.',
          explanation: 'The surprising angle often shows up after the obvious ones are out of the way.',
          question: 'Try one from an unexpected position: an object in the room, a bystander, or the moment just after.',
        };
      }
      break;
    }
    case 'revision': {
      if (s.purposeLine) {
        c.strength = {
          dimension: d,
          observation: `You named what the piece is for before revising: “${quote(s.purposeLine)}”`,
          explanation: 'A stated purpose turns revision into choices rather than polishing.',
        };
      } else {
        c.opportunity = {
          dimension: d,
          observation: 'There isn’t a sentence yet saying what the piece is for.',
          explanation: 'Without it, revision tends to become line-editing. With it, cuts get easier.',
          question: 'Finish this: “This piece is for ___.” Does every paragraph serve that?',
        };
      }
      if (!s.hasDivider && ex.id === 'ex-revise-intent') {
        c.opportunity ??= {
          dimension: d,
          observation: 'I can’t find both versions separated by a line of dashes (---).',
          explanation: 'Seeing both side by side is what makes the change visible to you.',
          question: 'Could you paste the original above the revision, with --- between them?',
        };
      }
      break;
    }
  }
  return c;
}

const MAX_OPPORTUNITIES: Record<FeedbackStyle, number> = { direct: 2, gentle: 1, questions: 2 };

export function buildFeedback(ex: Exercise, text: string, opts: { style?: FeedbackStyle; previousText?: string } = {}): Feedback {
  const s = analyze(text);
  const style = opts.style ?? 'direct';
  const candidates = ex.dimensions.map((d) => forDimension(d, s, ex));

  const strengths = candidates.flatMap((c) => (c.strength ? [c.strength] : [])).slice(0, 2);
  if (!strengths.length) {
    // Always name something real that worked (FR-03), without inflating it.
    strengths.push({
      dimension: ex.dimensions[0],
      observation: s.words >= ex.targetWords[0]
        ? `You stayed with the prompt through a complete ${s.words}-word draft.`
        : `You got a first ${s.words}-word pass onto the page.`,
      explanation: 'A complete attempt — even a rough one — is what makes revision possible.',
      general: true,
    });
  }
  const opportunities = candidates.flatMap((c) => (c.opportunity ? [c.opportunity] : [])).slice(0, MAX_OPPORTUNITIES[style]);

  const notes: string[] = [];
  if (opts.previousText !== undefined) {
    const before = analyze(opts.previousText);
    const delta = s.words - before.words;
    notes.push(`Compared with your last attempt: ${delta === 0 ? 'same length' : `${Math.abs(delta)} words ${delta > 0 ? 'longer' : 'shorter'}`}` +
      (s.sensory.length > before.sensory.length ? `, with more physical detail (${s.sensory.length - before.sensory.length} new sensory words)` : '') +
      (s.statedEmotion.length < before.statedEmotion.length ? ', and fewer named emotions' : '') + '.');
  }
  if (s.words < ex.targetWords[0]) notes.push(`It’s shorter than the suggested ${ex.targetWords[0]}–${ex.targetWords[1]} words — fine for a first pass.`);
  if (style === 'questions') notes.push('You asked for mostly questions, so each opportunity ends with one to consider rather than a fix.');
  notes.push(`This feedback looked at ${ex.dimensions.map((d) => DIMENSION_LABEL[d].toLowerCase()).join(' and ')}, the focus of this exercise. It’s one reader’s view — keep what helps.`);

  return { mode: 'editor', strengths, opportunities, note: notes.join(' '), createdAt: new Date().toISOString(), sample: true };
}
