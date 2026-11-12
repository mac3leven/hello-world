// Starter curriculum (sample editorial content — PRD §15 #4). Structured and versioned so lessons can
// be revised without code changes later (e.g. moved to JSON/CMS). Paths are non-linear: order is a
// suggestion, never a lock (PRD §8).

import type { Dimension } from '../lib/types';

export type LessonBlock =
  | { type: 'p'; text: string }
  | { type: 'principle'; text: string }
  /** Clearly marked examples (Instructor contract: demonstrate with marked examples). */
  | { type: 'example'; label: string; text: string; note?: string };

export interface Exercise {
  id: string;
  lessonId: string;
  title: string;
  prompt: string;
  intention: string;
  dimensions: Dimension[];
  targetWords: [number, number];
  /** Craft signals the feedback looks for; used by the sample coach and later by a model. */
  evaluationGuidance: string[];
  version: number;
}

export interface Lesson {
  id: string;
  pathId: string;
  title: string;
  intention: string;
  effortMinutes: number;
  dimensions: Dimension[];
  body: LessonBlock[];
  exerciseIds: string[];
  version: number;
}

export interface LearningPath {
  id: string;
  title: string;
  domain: 'writing';
  focus: string;
  objective: string;
  sequence: 'suggested';
  lessonIds: string[];
  version: number;
  published: boolean;
}

export const PATHS: LearningPath[] = [
  {
    id: 'seeing',
    title: 'Seeing First',
    domain: 'writing',
    focus: 'Personal storytelling',
    objective: 'Turn lived moments into specific, felt detail that a reader can step inside.',
    sequence: 'suggested',
    lessonIds: ['specific-detail', 'memory-scene', 'finding-angle'],
    version: 1,
    published: true,
  },
  {
    id: 'scenes',
    title: 'Scenes That Move',
    domain: 'writing',
    focus: 'Scriptwriting & cinematic storytelling',
    objective: 'Build scenes where something changes, told through what a camera can see and hear.',
    sequence: 'suggested',
    lessonIds: ['scene-intention', 'show-on-screen', 'subtext'],
    version: 1,
    published: true,
  },
  {
    id: 'voice-revision',
    title: 'Voice & Revision',
    domain: 'writing',
    focus: 'All forms',
    objective: 'Hear your own rhythm on the page and revise by re-seeing, not just fixing.',
    sequence: 'suggested',
    lessonIds: ['rhythm', 're-seeing'],
    version: 1,
    published: true,
  },
];

export const LESSONS: Lesson[] = [
  {
    id: 'specific-detail',
    pathId: 'seeing',
    title: 'The detail only you would notice',
    intention: 'Replace general description with one precise, surprising detail that carries feeling.',
    effortMinutes: 10,
    dimensions: ['observation', 'language'],
    version: 1,
    exerciseIds: ['ex-kitchen'],
    body: [
      { type: 'p', text: 'Readers believe a story when it contains something they could not have invented themselves. General words — "a messy room", "a nice day" — ask the reader to do the imagining. A specific detail does the imagining for them and quietly tells them who is looking.' },
      { type: 'principle', text: 'Choose the detail that reveals the observer, not just the object.' },
      { type: 'example', label: 'General', text: 'My grandmother\'s kitchen was old and cluttered.' },
      { type: 'example', label: 'Specific', text: 'My grandmother kept the twist-ties from every loaf of bread in a coffee can by the stove, sorted by colour.', note: 'One detail suggests thrift, order, a whole history — and that someone was watching closely enough to notice.' },
      { type: 'p', text: 'You do not need many of these. One well-chosen detail per paragraph is often enough. The rest can stay plain.' },
    ],
  },
  {
    id: 'memory-scene',
    pathId: 'seeing',
    title: 'A memory, told as a scene',
    intention: 'Move a remembered moment from summary ("we used to…") into a single scene happening in time.',
    effortMinutes: 15,
    dimensions: ['observation', 'emotion', 'structure'],
    version: 1,
    exerciseIds: ['ex-one-afternoon'],
    body: [
      { type: 'p', text: 'Personal stories often begin as summary: "Every summer we drove to the lake." Summary is useful for moving through time, but feeling lives in scene — one specific afternoon, with weather, voices, and a moment where something shifts.' },
      { type: 'principle', text: 'Summary tells the reader what usually happened. Scene shows them what happened once.' },
      { type: 'example', label: 'Summary', text: 'My dad and I never talked much on those drives.' },
      { type: 'example', label: 'Scene', text: 'Somewhere past the gas station he turned the radio off. I waited for him to say something. He cleared his throat twice, then turned it back on.', note: 'The silence is now an event the reader experiences, not a fact they are told.' },
    ],
  },
  {
    id: 'finding-angle',
    pathId: 'seeing',
    title: 'Finding the angle',
    intention: 'Find the unexpected way into a familiar subject before you start drafting.',
    effortMinutes: 10,
    dimensions: ['ideas'],
    version: 1,
    exerciseIds: ['ex-five-ways'],
    body: [
      { type: 'p', text: 'Most subjects have been written about before. What has not been written is your angle: the particular question, object, or moment through which you approach it.' },
      { type: 'principle', text: 'A subject is what the story is about. An angle is where the camera stands.' },
      { type: 'example', label: 'Subject', text: 'Moving away from home.' },
      { type: 'example', label: 'Angles', text: 'The last load of laundry in the old house. • The neighbour who never learned your name. • Teaching your mother to video call.', note: 'Each angle gives you a scene to start in, not a topic to explain.' },
    ],
  },
  {
    id: 'scene-intention',
    pathId: 'scenes',
    title: 'Every scene changes something',
    intention: 'Write scenes where a character wants something and the situation is different at the end.',
    effortMinutes: 15,
    dimensions: ['structure', 'emotion'],
    version: 1,
    exerciseIds: ['ex-turn'],
    body: [
      { type: 'p', text: 'A scene is not a place where things happen; it is a unit of change. Someone enters wanting something, meets resistance, and leaves with the situation altered — better, worse, or newly complicated.' },
      { type: 'principle', text: 'Ask of every scene: what is different at the end that was not true at the start?' },
      { type: 'example', label: 'Static', text: 'Two friends have coffee and talk about their weeks.' },
      { type: 'example', label: 'Turning', text: 'Maya meets her friend to ask for a loan. Before she can, her friend announces she has just quit her job.', note: 'Same café, same coffee — but now Maya has to decide whether to ask at all.' },
    ],
  },
  {
    id: 'show-on-screen',
    pathId: 'scenes',
    title: 'Write what the camera sees',
    intention: 'Express inner states through action, image, and sound that could be filmed.',
    effortMinutes: 15,
    dimensions: ['observation', 'structure'],
    version: 1,
    exerciseIds: ['ex-silent-scene'],
    body: [
      { type: 'p', text: 'A screenplay can only contain what an audience can see and hear. "She feels abandoned" cannot be filmed. A half-set table for two, and her clearing the second plate without looking at it, can.' },
      { type: 'principle', text: 'Externalise the internal: find the behaviour or image that carries the feeling.' },
      { type: 'example', label: 'Unfilmable', text: 'JON is nervous about the interview.' },
      { type: 'example', label: 'Filmable', text: 'INT. LOBBY – DAY\nJON re-ties a shoe that was already tied. Checks his reflection in the elevator doors. They open. He doesn\'t move.', note: 'Action lines in present tense, specific behaviour, one telling beat.' },
    ],
  },
  {
    id: 'subtext',
    pathId: 'scenes',
    title: 'What they don\'t say',
    intention: 'Let dialogue carry meaning beneath the literal words.',
    effortMinutes: 15,
    dimensions: ['voice', 'emotion'],
    version: 1,
    exerciseIds: ['ex-subtext'],
    body: [
      { type: 'p', text: 'People rarely say exactly what they mean, especially when it matters. Dialogue that states feelings directly ("I\'m angry because you forgot") often feels flat. Dialogue that circles the feeling lets the audience do the work — and feel it more.' },
      { type: 'principle', text: 'Characters talk about the dishes when they are fighting about the marriage.' },
      { type: 'example', label: 'On the nose', text: '"I\'m hurt that you didn\'t come to my show."' },
      { type: 'example', label: 'With subtext', text: '"They saved you a seat. Front row. It was empty the whole time, so — good seat, I guess."', note: 'The hurt is unmistakable, and never named.' },
    ],
  },
  {
    id: 'rhythm',
    pathId: 'voice-revision',
    title: 'Hearing your rhythm',
    intention: 'Notice sentence length and sound, and use variation on purpose.',
    effortMinutes: 10,
    dimensions: ['voice', 'language'],
    version: 1,
    exerciseIds: ['ex-rhythm'],
    body: [
      { type: 'p', text: 'Voice is partly vocabulary and partly music. Long sentences can carry a reader through a flood of thought or motion; short ones stop them. Used together, they create emphasis.' },
      { type: 'principle', text: 'Read it aloud. Where you run out of breath, or where you stumble, the rhythm is telling you something.' },
      { type: 'example', label: 'Varied rhythm', text: 'We drove all night through towns whose names we never learned, past diners closing and gas stations opening, the radio fading in and out of stations that all seemed to play the same song. Then the sea. Just like that.', note: 'A long build, then two short beats land the arrival.' },
    ],
  },
  {
    id: 're-seeing',
    pathId: 'voice-revision',
    title: 'Revision is re-seeing',
    intention: 'Revise by clarifying intention first, then making choices that serve it.',
    effortMinutes: 15,
    dimensions: ['revision', 'structure'],
    version: 1,
    exerciseIds: ['ex-revise-intent'],
    body: [
      { type: 'p', text: 'Editing fixes sentences. Revision asks what the piece is trying to do, and whether each part helps. It often means cutting a favourite line or starting the piece later than you did.' },
      { type: 'principle', text: 'Before changing a word, write one sentence about what this piece is for.' },
      { type: 'example', label: 'Revision question', text: 'If a reader remembered only one moment from this, which should it be — and is it currently the strongest moment on the page?' },
    ],
  },
];

export const EXERCISES: Exercise[] = [
  {
    id: 'ex-kitchen',
    lessonId: 'specific-detail',
    title: 'A room you know by heart',
    prompt: 'Describe a room from your past in 100–200 words. Include no more than three details, and make at least one of them something only you would have noticed.',
    intention: 'Practice choosing a single revealing detail over general description.',
    dimensions: ['observation', 'language'],
    targetWords: [100, 200],
    evaluationGuidance: ['Concrete, sensory nouns over general adjectives', 'At least one detail that implies the observer', 'Restraint: few details, well chosen'],
    version: 1,
  },
  {
    id: 'ex-one-afternoon',
    lessonId: 'memory-scene',
    title: 'One afternoon',
    prompt: 'Pick something that "always used to happen" in your life. Write one specific time it happened, as a scene, in 200–400 words. Include at least one line of dialogue or one sound.',
    intention: 'Turn habitual summary into a single, time-bound scene with a small shift.',
    dimensions: ['observation', 'emotion', 'structure'],
    targetWords: [200, 400],
    evaluationGuidance: ['Anchored in one moment, not "we used to"', 'Sensory grounding (sound, weather, objects)', 'A small shift or realisation by the end'],
    version: 1,
  },
  {
    id: 'ex-five-ways',
    lessonId: 'finding-angle',
    title: 'Five ways in',
    prompt: 'Choose a subject you want to write about. List five different angles into it — each one a specific object, moment, person, or question. Then circle (mark with *) the one that surprises you most and write two sentences on why.',
    intention: 'Generate several entry points before committing to one.',
    dimensions: ['ideas'],
    targetWords: [60, 250],
    evaluationGuidance: ['Angles are concrete and distinct from each other', 'At least one unexpected angle', 'A reason for the chosen angle'],
    version: 1,
  },
  {
    id: 'ex-turn',
    lessonId: 'scene-intention',
    title: 'The turn',
    prompt: 'Write a short scene (prose or script format, 200–400 words) where a character arrives wanting one thing and leaves with the situation changed. Before you start, write one line: "At the start ___; at the end ___."',
    intention: 'Make the change in a scene visible and deliberate.',
    dimensions: ['structure', 'emotion'],
    targetWords: [200, 400],
    evaluationGuidance: ['Clear want for the character', 'Resistance or complication', 'A different situation at the end'],
    version: 1,
  },
  {
    id: 'ex-silent-scene',
    lessonId: 'show-on-screen',
    title: 'The silent scene',
    prompt: 'Write a one-page scene in screenplay format with no dialogue. A character is feeling something they would never say out loud. Show it only through action, image, and sound.',
    intention: 'Externalise an inner state through filmable behaviour.',
    dimensions: ['observation', 'structure'],
    targetWords: [120, 300],
    evaluationGuidance: ['Scene heading and present-tense action', 'Behaviour that implies feeling', 'No stated emotions'],
    version: 1,
  },
  {
    id: 'ex-subtext',
    lessonId: 'subtext',
    title: 'Talking about the dishes',
    prompt: 'Write a two-person exchange (10–20 lines) where the characters argue about something small while the real conflict stays unspoken. Add one line at the bottom naming the real conflict — for you, not for them.',
    intention: 'Let the important thing live beneath the dialogue.',
    dimensions: ['voice', 'emotion'],
    targetWords: [100, 300],
    evaluationGuidance: ['Dialogue present', 'Real conflict implied, not stated', 'Distinct voices'],
    version: 1,
  },
  {
    id: 'ex-rhythm',
    lessonId: 'rhythm',
    title: 'One long, one short',
    prompt: 'Write a paragraph (100–200 words) about arriving somewhere. Include at least one very long sentence that builds, and at least one sentence of four words or fewer that lands.',
    intention: 'Use sentence length deliberately for emphasis.',
    dimensions: ['voice', 'language'],
    targetWords: [100, 200],
    evaluationGuidance: ['Real variation in sentence length', 'Short sentence placed for emphasis', 'Reads well aloud'],
    version: 1,
  },
  {
    id: 'ex-revise-intent',
    lessonId: 're-seeing',
    title: 'Revise toward one sentence',
    prompt: 'Paste a short passage you have written before (yours, from anywhere). First write: "This piece is for ___." Then revise the passage so every part serves that sentence. Keep both versions below, separated by a line of dashes (---).',
    intention: 'Revise from intention, not from surface errors.',
    dimensions: ['revision', 'structure'],
    targetWords: [120, 600],
    evaluationGuidance: ['States a purpose', 'Revision visibly serves it (cuts, reordering)', 'Keeps the writer\'s voice'],
    version: 1,
  },
];

export const pathById = (id: string) => PATHS.find((p) => p.id === id);
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);
export const lessonsForPath = (pathId: string) =>
  (pathById(pathId)?.lessonIds ?? []).map(lessonById).filter((l): l is Lesson => !!l);
