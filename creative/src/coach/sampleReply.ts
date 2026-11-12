// Sample conversational replies for the four modes (PRD §9 mode contracts):
//   Instructor — explain, demonstrate with a clearly marked example, invite practice
//   Mentor     — ask focused questions, reflect the user's stated aims; don't prescribe
//   Editor     — cite passage/pattern, explain effect, offer options; never silently rewrite
//   Partner    — brainstorm possibilities; label them as possibilities, not decisions

import { EXERCISES, LESSONS, type Lesson } from '../content/curriculum';
import { DIMENSION_LABEL, PROJECT_TYPE_LABEL } from '../lib/labels';
import { observationText } from '../lib/profile';
import type { Dimension } from '../lib/types';
import { analyze, quote, sentenceWith } from './analysis';
import type { CoachReply, CoachRequest, ResolvedContext } from './service';

const TOPICS: { words: RegExp; lessonId: string }[] = [
  { words: /subtext|dialogue|line|said|says|talk/i, lessonId: 'subtext' },
  { words: /ending|\bend\b|climax|scene|change|turn|stakes|want/i, lessonId: 'scene-intention' },
  { words: /camera|screen|visual|film|show|action line/i, lessonId: 'show-on-screen' },
  { words: /detail|specific|vivid|describe|description/i, lessonId: 'specific-detail' },
  { words: /memory|remember|past|childhood|personal/i, lessonId: 'memory-scene' },
  { words: /idea|angle|start|stuck|blank|topic/i, lessonId: 'finding-angle' },
  { words: /voice|rhythm|sentence|flow|sound/i, lessonId: 'rhythm' },
  { words: /revis|edit|rewrite|cut|draft/i, lessonId: 're-seeing' },
];

function pickLesson(ctx: ResolvedContext, message: string): Lesson {
  if (ctx.lesson) return ctx.lesson;
  const t = TOPICS.find((x) => x.words.test(message));
  return LESSONS.find((l) => l.id === t?.lessonId) ?? LESSONS[0];
}

function workText(ctx: ResolvedContext, message: string): { text: string; source: string } | undefined {
  if (ctx.draft?.text.trim()) return { text: ctx.draft.text, source: `your draft “${ctx.draft.title}”` };
  if (ctx.attemptText?.trim()) return { text: ctx.attemptText, source: 'your exercise attempt' };
  if (message.trim().split(/\s+/).length >= 40) return { text: message, source: 'the passage you pasted' };
  return undefined;
}

const growthHint = (ctx: ResolvedContext): string | undefined => {
  const o = ctx.observations?.find((x) => x.polarity === 'opportunity');
  return o ? `${DIMENSION_LABEL[o.dimension].toLowerCase()} (${observationText(o)})` : undefined;
};

/** First line of actual story: skips screenplay scene headings and character cues. */
export function firstStoryLine(text: string): string | undefined {
  if (!analyze(text).scriptFormat) return analyze(text).sentences[0];
  return text.split('\n').map((l) => l.trim()).find((l) => l && !/^(INT|EXT|INT\/EXT)[.\s]/.test(l) && !/^[A-Z][A-Z .'-]{1,30}$/.test(l));
}

function instructor(req: CoachRequest): CoachReply {
  const lesson = pickLesson(req.context, req.message);
  const principle = lesson.body.find((b) => b.type === 'principle');
  const examples = lesson.body.filter((b): b is Extract<typeof b, { type: 'example' }> => b.type === 'example');
  const ex = EXERCISES.find((e) => e.lessonId === lesson.id);
  const parts = [
    `Let's look at ${lesson.title.toLowerCase()}.`,
    lesson.body.find((b) => b.type === 'p')?.text ?? lesson.intention,
    principle ? `The principle: ${principle.text}` : '',
    examples.length
      ? `Example (illustrative — not your work):\n${examples.map((e) => `• ${e.label}: ${e.text}${e.note ? `\n  ↳ ${e.note}` : ''}`).join('\n')}`
      : '',
    'This is one approach, not a rule — plenty of good writing breaks it on purpose.',
    ex ? `Want to try it? “${ex.title}”: ${ex.prompt}` : 'Want to try applying it to something you are working on?',
  ];
  return { text: parts.filter(Boolean).join('\n\n') };
}

const MENTOR_QUESTIONS: Record<Dimension | 'general', string[]> = {
  general: [
    'What do you want someone to feel in the last moment of this?',
    'What made you want to write this in the first place — the image, the person, or the question?',
    'If you could only keep one moment, which would it be?',
  ],
  structure: ['What is different at the end that wasn’t true at the start?', 'Where does the piece turn — and is that where you want the weight?'],
  emotion: ['What is the feeling underneath this — and does a character know it yet?', 'Who in this would rather not say what they feel, and why?'],
  observation: ['Which detail here would only you have noticed?', 'What would a camera see first if it walked into this scene?'],
  voice: ['If you read this aloud, where do you hear yourself most?', 'Whose voice is telling this — and how close to the events are they?'],
  ideas: ['What angle on this hasn’t been written yet?', 'What’s the smallest, strangest object in this story?'],
  language: ['Which sentence are you proudest of, and why?', 'Is there a word here you chose because it was safe?'],
  revision: ['What is this piece for, in one sentence?', 'What would you cut if you had to lose a third of it?'],
};

function mentor(req: CoachRequest): CoachReply {
  const { context: ctx, message, history } = req;
  const opening: string[] = [];
  if (ctx.project?.intent) opening.push(`You described ${ctx.project.title} as: “${ctx.project.intent.trim().replace(/[.!?]$/, '')}.”`);
  if (ctx.project?.goal) opening.push(`Your goal for it: ${ctx.project.goal}.`);
  if (!ctx.project && ctx.profile?.goals.length) opening.push(`You said you want to: ${ctx.profile.goals.join(', ').toLowerCase()}.`);
  if (message.trim()) opening.push(`You're asking about: “${quote(message, 120)}”.`);

  const topic = TOPICS.find((t) => t.words.test(message));
  const dim = (topic && LESSONS.find((l) => l.id === topic.lessonId)?.dimensions[0]) ?? 'general';
  const pool = [...MENTOR_QUESTIONS[dim], ...MENTOR_QUESTIONS.general];
  const turn = history.filter((h) => h.role === 'coach' && h.mode === 'mentor').length;
  const qs = [pool[turn % pool.length], pool[(turn + 1) % pool.length]];
  if (ctx.draft?.text.trim()) {
    const first = firstStoryLine(ctx.draft.text);
    if (first) qs.push(`Your draft opens with “${quote(first, 80)}”. Is that where the story really starts for you?`);
  }
  return {
    text: [
      opening.join(' '),
      'A few questions to think with — no need to answer all of them:',
      qs.map((q, i) => `${i + 1}. ${q}`).join('\n'),
      'Tell me what you’re leaning toward and I’ll keep asking from there.',
    ].filter(Boolean).join('\n\n'),
  };
}

function editor(req: CoachRequest): CoachReply {
  const work = workText(req.context, req.message);
  if (!work) {
    return {
      text: 'To give specific editing notes I need something to point at. Open me from a draft or an exercise attempt, or paste a passage (40+ words) here.\n\nI’ll cite exact lines, explain the effect, and offer options — I won’t rewrite your work unless you ask.',
    };
  }
  const s = analyze(work.text);
  const notes: string[] = [];
  if (s.statedEmotion[0]) {
    notes.push(`• “${quote(s.statedEmotion[0], 90)}”\n  Effect: naming the feeling tells the reader what to feel.\n  Options: (a) replace it with what the character does; (b) cut it and see if the scene still carries it; (c) keep it, if bluntness is the point.`);
  }
  if (s.general.length >= 2) {
    const line = sentenceWith(s, s.general);
    notes.push(`• “${quote(line, 90)}”\n  Pattern: general words (${s.general.slice(0, 3).join(', ')}).\n  Effect: the reader has to supply the picture.\n  Options: (a) one precise object or sound; (b) cut the line if the next one already does the work.`);
  }
  // Short lines are normal in screenplay format, so rhythm notes only apply to prose.
  if (!s.scriptFormat && s.sentences.length >= 4 && s.sentenceSpread < 4) {
    notes.push(`• Pattern: most sentences run about ${Math.round(s.avgSentence)} words.\n  Effect: an even rhythm — calm, or flat, depending on what you want.\n  Options: (a) break one sentence short at the moment that matters most; (b) let one run long to build pressure.`);
  }
  if (s.intensifiers >= 2) {
    notes.push(`• Pattern: ${s.intensifiers} intensifiers (very/really/so).\n  Options: remove each and see whether a sharper verb or noun wants to replace it.`);
  }
  if (!notes.length) {
    const strong = sentenceWith(s, s.sensory) ?? s.sentences[0];
    notes.push(`• I don’t see an obvious craft problem on a first read. The line doing the most work for me is “${quote(strong, 90)}”.\n  Question: is the rest of the piece pulling in the same direction as that line?`);
  }
  const wantsRewrite = /rewrite|re-write|reword|another version|show me/i.test(req.message);
  return {
    text: [`Notes on ${work.source}:`, notes.slice(0, 3).join('\n\n'), 'These are options, not corrections — your call on each.'].join('\n\n'),
    proposal: wantsRewrite && req.context.draft && s.statedEmotion[0]
      ? { target: 'draft', text: `[One possible alternative to “${quote(s.statedEmotion[0], 60)}”]\nShe turned the cup a quarter turn on the rail, then back.` }
      : undefined,
  };
}

function partner(req: CoachRequest): CoachReply {
  const { context: ctx, message } = req;
  const subject = ctx.project?.intent || (message.trim() ? message.trim() : '') || ctx.lesson?.title || 'your next piece';
  const kind = ctx.project ? PROJECT_TYPE_LABEL[ctx.project.type].toLowerCase() : 'piece';
  const isScript = ctx.project?.type === 'script' || ctx.project?.type === 'cinematic';
  const ideas = [
    `Start later: open at the moment just after the most important thing has happened.`,
    `Tell it through an object that passes between the characters.`,
    isScript ? 'Write the scene with no dialogue at all, then add back only the lines it can’t live without.' : 'Write it from the point of view of someone at the edge of the story.',
    'Flip the want: what if the main character is trying to avoid the thing you assumed they want?',
    'Set a constraint: one location, under five minutes of story time.',
  ];
  const hint = growthHint(ctx);
  return {
    text: [
      `Some possibilities for ${kind === 'piece' ? 'this' : `your ${kind}`} — “${quote(subject, 80)}”. These are directions to explore, not decisions:`,
      ideas.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      hint ? `If you want a stretch, one of these could also work your growth area: ${hint}.` : '',
      'Which one pulls at you? I can riff on any of them.',
    ].filter(Boolean).join('\n\n'),
    proposal: { target: 'ideas', text: ideas.slice(0, 3).join('\n') },
  };
}

export function sampleReply(req: CoachRequest): CoachReply {
  switch (req.mode) {
    case 'instructor': return instructor(req);
    case 'mentor': return mentor(req);
    case 'editor': return editor(req);
    case 'partner': return partner(req);
  }
}
