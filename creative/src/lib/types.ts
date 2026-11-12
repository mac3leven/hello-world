// Logical data model (PRD §11). Academy records (attempts) and Studio records (ideas, projects,
// drafts, revisions) are stored separately; ProjectLearningLink is the only bridge between them.

export type Dimension =
  | 'observation'
  | 'ideas'
  | 'language'
  | 'structure'
  | 'emotion'
  | 'voice'
  | 'revision';

export type CoachMode = 'instructor' | 'mentor' | 'editor' | 'partner';

export type FeedbackStyle = 'direct' | 'gentle' | 'questions';
export type Experience = 'starting' | 'some' | 'experienced';

/** What the coach may use. Studio work for personalization is opt-in (PRD §15 #5–6). */
export interface ContextPermissions {
  academyHistory: boolean;
  profile: boolean;
  studioForPersonalization: boolean;
}

export interface CreativeProfile {
  goals: string[];
  interests: string[];
  strengths: Dimension[];
  frictions: Dimension[];
  experience?: Experience;
  feedbackStyle: FeedbackStyle;
  sessionMinutes: number;
  preferredMode: CoachMode;
  permissions: ContextPermissions;
  updatedAt: string;
}

export type EvidenceKind = 'onboarding' | 'attempt' | 'feedback' | 'draft' | 'user';

export interface EvidenceRef {
  kind: EvidenceKind;
  /** Record id (attempt id, draft id…) when the evidence points at stored work. */
  id?: string;
  label: string;
  at: string;
}

export type Confidence = 'tentative' | 'emerging' | 'consistent';

export interface SkillObservation {
  id: string;
  dimension: Dimension;
  /** 'strength' builds from what works; 'opportunity' is an optional next challenge. */
  polarity: 'strength' | 'opportunity';
  text: string;
  kind: 'self_report' | 'inferred';
  evidence: EvidenceRef[];
  confidence: Confidence;
  createdAt: string;
  updatedAt: string;
  /** The user's own rewording, shown instead of `text`. */
  correction?: string;
  dismissedAt?: string;
  /** Kept for the record but never used for recommendations or coaching. */
  doNotUse?: boolean;
}

// ---------- Academy (learning content is static; attempts are the user's) ----------

export interface FeedbackItem {
  dimension: Dimension;
  observation: string;
  /** Why it matters / interpretation, kept separate from the observation (FR-03). */
  explanation: string;
  /** Opportunities end with an actionable question or mini-exercise. */
  question?: string;
  /** A general encouragement (e.g. "you finished a draft"), not evidence about this craft dimension. */
  general?: boolean;
}

export interface Feedback {
  mode: CoachMode;
  strengths: FeedbackItem[];
  opportunities: FeedbackItem[];
  note: string;
  createdAt: string;
  /** True while feedback comes from the sample coach rather than a model. */
  sample: boolean;
}

export interface AttemptVersion {
  id: string;
  text: string;
  savedAt: string;
  submittedAt?: string;
  feedback?: Feedback;
}

export type AttemptStatus = 'in_progress' | 'feedback' | 'complete';

export interface LearningAttempt {
  id: string;
  exerciseId: string;
  versions: AttemptVersion[];
  status: AttemptStatus;
  reflection?: string;
  startedAt: string;
  updatedAt: string;
}

// ---------- Studio ----------

export interface StudioIdea {
  id: string;
  text: string;
  tags: string[];
  createdAt: string;
  projectId?: string;
  archivedAt?: string;
}

export type ProjectType = 'short_story' | 'script' | 'personal_essay' | 'cinematic' | 'other';
export type ProjectStatus = 'seed' | 'drafting' | 'revising' | 'resting' | 'finished';

export interface ProjectNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface StudioProject {
  id: string;
  title: string;
  type: ProjectType;
  intent: string;
  goal?: string;
  status: ProjectStatus;
  notes: ProjectNote[];
  createdAt: string;
  updatedAt: string;
}

export interface Draft {
  id: string;
  projectId: string;
  title: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type RevisionSource = 'manual' | 'auto' | 'restore' | 'coach_accepted';

export interface DraftRevision {
  id: string;
  draftId: string;
  text: string;
  note?: string;
  source: RevisionSource;
  createdAt: string;
}

/** Reference only: Academy work stays in the Academy; nothing is copied or moved. */
export interface ProjectLearningLink {
  id: string;
  projectId: string;
  lessonId: string;
  exerciseId?: string;
  attemptId?: string;
  note: string;
  createdAt: string;
}

// ---------- Coach ----------

export type CoachContextType = 'none' | 'lesson' | 'exercise' | 'attempt' | 'project' | 'draft';

export interface CoachContext {
  type: CoachContextType;
  id?: string;
}

export interface Proposal {
  /** Text the user may add to the draft in context, or save as ideas. Only ever applied by the user. */
  text: string;
  target: 'draft' | 'ideas';
  status: 'pending' | 'accepted' | 'rejected';
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  mode: CoachMode;
  text: string;
  /** Context labels this reply was allowed to use (shown under the reply). */
  usedContext?: string[];
  proposal?: Proposal;
  rating?: 'helpful' | 'not_helpful';
  createdAt: string;
}

export interface CoachConversation {
  id: string;
  mode: CoachMode;
  context: CoachContext;
  permissionSnapshot: ContextPermissions;
  messages: CoachMessage[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Recommendations, progress ----------

export type RecommendationStatus = 'accepted' | 'dismissed' | 'deferred';

export interface RecommendationDecision {
  status: RecommendationStatus;
  at: string;
  reason?: string;
}

export interface Reflection {
  id: string;
  text: string;
  createdAt: string;
}

export interface AppState {
  schemaVersion: 1;
  user: { name: string; createdAt: string; onboarded: boolean };
  profile: CreativeProfile;
  observations: SkillObservation[];
  attempts: LearningAttempt[];
  ideas: StudioIdea[];
  projects: StudioProject[];
  drafts: Draft[];
  revisions: DraftRevision[];
  links: ProjectLearningLink[];
  conversations: CoachConversation[];
  /** Keyed by recommendation key (target type + id). */
  recommendations: Record<string, RecommendationDecision>;
  reflections: Reflection[];
}
