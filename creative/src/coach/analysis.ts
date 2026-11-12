// Lightweight, deterministic text signals used by the sample coach. They let feedback cite real
// passages from the user's writing (Editor contract) without any AI service.

const SENSORY = /\b(smell|smelled|scent|sound|sounds|hum|hummed|creak|creaked|click|whisper|whispered|cold|warm|wet|dry|rough|smooth|sticky|bitter|sweet|salt|salty|sour|light|dark|shadow|glow|rust|dust|steam|smoke|wind|rain|snow|wood|metal|glass|paper|plastic|cotton|wool|red|blue|green|yellow|orange|white|black|grey|gray|brown|gold|silver|tin|coffee|bread|kitchen|stove|window|door|radio|engine|wake|rail|cup|table|chair|floor|wall|ceiling|hands?|fingers?|shoes?)\b/gi;
const GENERAL = /\b(nice|beautiful|amazing|interesting|good|bad|things?|stuff|very|really|so much|kind of|sort of|somehow|everything|something)\b/gi;
const INTENSIFIERS = /\b(very|really|so|extremely|totally|incredibly|super|quite)\b/gi;
const STATED_EMOTION = /\b(felt|feel|feels|feeling|was|were|am|is|got)\s+(so\s+|very\s+|really\s+)?(sad|angry|happy|nervous|scared|afraid|hurt|lonely|anxious|upset|excited|jealous|ashamed|guilty|abandoned|furious|heartbroken)\b/gi;
const HABITUAL = /\b(used to|would always|we always|i always|every (summer|day|week|year|time|morning|night|sunday))\b/gi;
const TURN = /\b(but|until|then|suddenly|instead|realis(?:e|ed)|realiz(?:e|ed)|finally|for the first time|now|before \w+ could)\b/gi;

export interface TextSignals {
  words: number;
  sentences: string[];
  sentenceLengths: number[];
  avgSentence: number;
  sentenceSpread: number;
  shortSentences: string[];
  longSentences: string[];
  sensory: string[];
  general: string[];
  intensifiers: number;
  statedEmotion: string[];
  habitual: string[];
  turnInSecondHalf?: string;
  dialogueLines: number;
  scriptFormat: boolean;
  listItems: number;
  hasDivider: boolean;
  purposeLine?: string;
}

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.toLowerCase()))];
const wc = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' \n ')
    .split(/(?<=[.!?…])\s+|\n/)
    .map((s) => s.trim())
    .filter((s) => /[a-z]/i.test(s));
}

export function analyze(text: string): TextSignals {
  const sentences = splitSentences(text);
  const lengths = sentences.map(wc);
  const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const spread = lengths.length ? Math.sqrt(lengths.reduce((a, l) => a + (l - avg) ** 2, 0) / lengths.length) : 0;
  const half = Math.floor(sentences.length / 2);
  const turnInSecondHalf = sentences.slice(Math.max(1, half)).find((s) => new RegExp(TURN.source, 'i').test(s));
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const quoted = (text.match(/["“][^"”]{2,}["”]/g) ?? []).length;
  // Screenplay dialogue: a CHARACTER NAME line followed by a line of speech.
  const scriptDialogue = lines.filter((l, i) => /^[A-Z][A-Z .'-]{1,30}(\s*\(.*\))?$/.test(l) && !/^(INT|EXT)\b/.test(l) && i + 1 < lines.length).length;

  return {
    words: wc(text),
    sentences,
    sentenceLengths: lengths,
    avgSentence: avg,
    sentenceSpread: spread,
    shortSentences: sentences.filter((s) => wc(s) <= 4),
    longSentences: sentences.filter((s) => wc(s) >= 25),
    sensory: uniq(text.match(SENSORY) ?? []),
    general: uniq(text.match(GENERAL) ?? []),
    intensifiers: (text.match(INTENSIFIERS) ?? []).length,
    statedEmotion: sentences.filter((s) => new RegExp(STATED_EMOTION.source, 'i').test(s)),
    habitual: uniq(text.match(HABITUAL) ?? []),
    turnInSecondHalf,
    dialogueLines: quoted + scriptDialogue,
    scriptFormat: /^\s*(INT|EXT|INT\/EXT)[.\s]/m.test(text),
    listItems: lines.filter((l) => /^([-*•]|\d+[.)])\s+/.test(l)).length,
    hasDivider: /^\s*-{3,}\s*$/m.test(text),
    purposeLine: lines.find((l) => /\b(this piece is for|this is for|the piece is for)\b/i.test(l)),
  };
}

/** Pick a sentence to quote, trimmed for display. */
export function quote(s: string | undefined, max = 110): string {
  if (!s) return '';
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function sentenceWith(signals: TextSignals, words: string[]): string | undefined {
  const set = words.map((w) => w.toLowerCase());
  return signals.sentences.find((s) => set.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s)));
}
