// A1–A5 Academy: learning content and practice. Academy work stays in the Academy; the only bridge to
// the Studio is an explicit, user-created reference link (FR-02, FR-04, §11 data rules).

import { useEffect, useRef, useState } from 'react';
import { coach } from '../coach/service';
import { Empty, PageHeader, SaveState } from '../components/ui';
import { exerciseById, lessonById, lessonsForPath, pathById, PATHS, type Exercise } from '../content/curriculum';
import {
  attachFeedback, LESSON_STATUS_LABEL, latestAttempt, lessonForExercise, lessonStatus, newAttemptId, saveWorking, submittedVersions, workingVersion,
} from '../lib/academy';
import { now, uid } from '../lib/id';
import { DIMENSION_LABEL, formatDateTime, MODE_LABEL, wordCount } from '../lib/labels';
import { addInferred } from '../lib/profile';
import { coachHref, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import type { AppState, Feedback, FeedbackItem, LearningAttempt } from '../lib/types';
import { RecommendationCard } from './Recommendations';

const academyCrumb = { href: '#/academy', label: 'Academy' };

// ---------- A1 Academy home ----------

export function AcademyHome() {
  const { state } = useStore();
  const resume = [...state.attempts]
    .filter((a) => a.status !== 'complete')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const resumeEx = resume && exerciseById(resume.exerciseId);

  return (
    <>
      <PageHeader space="academy" title="Academy">
        <p className="muted" style={{ margin: 0 }}>Short lessons and focused practice in writing and storytelling. Start anywhere — the order is only a suggestion.</p>
      </PageHeader>

      {resume && resumeEx && (
        <a className="card accent" href={resume.status === 'feedback' ? `#/academy/attempt/${resume.id}` : `#/academy/exercise/${resumeEx.id}`}>
          <div className="small muted">Pick up where you left off</div>
          <h3 style={{ margin: '2px 0' }}>{resumeEx.title}</h3>
          <div className="small muted">{resume.status === 'feedback' ? 'Feedback is ready to read or revise' : 'Draft saved'} · {formatDateTime(resume.updatedAt)}</div>
        </a>
      )}

      <RecommendationCard scope="academy" />

      <div className="section-head"><h2>Learning paths</h2></div>
      <div className="grid three">
        {PATHS.map((p) => {
          const lessons = lessonsForPath(p.id);
          const practised = lessons.filter((l) => lessonStatus(state, l) !== 'new').length;
          return (
            <a key={p.id} className="card" href={`#/academy/path/${p.id}`}>
              <span className="pill academy">{p.focus}</span>
              <h3 style={{ marginTop: 8 }}>{p.title}</h3>
              <p className="small muted">{p.objective}</p>
              <div className="small">{lessons.length} lessons{practised ? ` · ${practised} started` : ''}</div>
            </a>
          );
        })}
      </div>
    </>
  );
}

// ---------- A2 Learning path ----------

export function PathScreen({ pathId }: { pathId: string }) {
  const { state } = useStore();
  const path = pathById(pathId);
  if (!path) return <NotFound what="learning path" />;
  const lessons = lessonsForPath(path.id);
  return (
    <>
      <PageHeader space="academy" title={path.title} crumbs={[academyCrumb, { label: path.title }]}>
        <p style={{ margin: 0 }}>{path.objective}</p>
        <p className="small muted" style={{ margin: '4px 0 0' }}>{path.focus} · Suggested order below. Nothing is locked — start with whatever interests you.</p>
      </PageHeader>
      <ol className="list card" style={{ paddingLeft: 0 }}>
        {lessons.map((l, i) => {
          const st = lessonStatus(state, l);
          return (
            <li key={l.id}>
              <a href={`#/academy/lesson/${l.id}`} className="row between" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span>
                  <span className="muted small">{i + 1}.</span> <strong>{l.title}</strong>
                  <br /><span className="small muted">{l.intention}</span>
                </span>
                <span className="row">
                  <span className="small muted">~{l.effortMinutes} min</span>
                  <span className={`pill ${st === 'new' ? '' : 'academy'}`}>{LESSON_STATUS_LABEL[st]}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ---------- A3 Lesson ----------

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const { state } = useStore();
  const lesson = lessonById(lessonId);
  if (!lesson) return <NotFound what="lesson" />;
  const path = pathById(lesson.pathId)!;
  const ex = exerciseById(lesson.exerciseIds[0]);
  const attempt = ex && latestAttempt(state, ex.id);

  return (
    <>
      <PageHeader space="academy" title={lesson.title} crumbs={[academyCrumb, { href: `#/academy/path/${path.id}`, label: path.title }, { label: 'Lesson' }]}>
        <div className="row">
          <span className="pill academy">~{lesson.effortMinutes} min</span>
          {lesson.dimensions.map((d) => <span key={d} className="pill">{DIMENSION_LABEL[d]}</span>)}
        </div>
      </PageHeader>

      <div className="card soft"><strong>What you'll practise:</strong> {lesson.intention}</div>

      <article className="lesson-body" style={{ margin: '20px 0' }}>
        {lesson.body.map((b, i) => {
          if (b.type === 'p') return <p key={i}>{b.text}</p>;
          if (b.type === 'principle') return <p key={i} className="principle">{b.text}</p>;
          return (
            <div key={i} className="example">
              <span className="label">Example · {b.label}</span>
              {b.text}
              {b.note && <div className="note">{b.note}</div>}
            </div>
          );
        })}
      </article>

      {ex && (
        <div className="card accent">
          <div className="small muted">Practice · Academy exercise</div>
          <h3>{ex.title}</h3>
          <p className="small">{ex.prompt}</p>
          <div className="row">
            <a className="btn primary" href={attempt?.status === 'feedback' ? `#/academy/attempt/${attempt.id}` : `#/academy/exercise/${ex.id}`}>
              {attempt ? (attempt.status === 'feedback' ? 'See your feedback' : 'Continue practising') : 'Start the exercise'}
            </a>
            <a className="btn" href={coachHref({ mode: 'instructor', ctx: 'lesson', id: lesson.id })}>Ask the Instructor</a>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- A4 Exercise ----------

function recordEvidence(s: AppState, attempt: LearningAttempt, ex: Exercise, f: Feedback): AppState {
  // Academy feedback becomes profile evidence only while the user allows Academy history to be used.
  if (!s.profile.permissions.academyHistory) return s;
  const at = now();
  const evidence = { kind: 'attempt' as const, id: attempt.id, label: `Feedback on “${ex.title}”`, at };
  let next = s;
  for (const item of f.strengths.filter((x) => !x.general)) next = addInferred(next, { dimension: item.dimension, polarity: 'strength', text: strengthSummary(item), evidence });
  for (const item of f.opportunities.slice(0, 1)) next = addInferred(next, { dimension: item.dimension, polarity: 'opportunity', text: opportunitySummary(item), evidence });
  return next;
}

function strengthSummary(item: FeedbackItem): string {
  return `${DIMENSION_LABEL[item.dimension]} is showing up as a strength in your Academy practice. See the evidence for the specific passages.`;
}

function opportunitySummary(item: FeedbackItem): string {
  return `A possible next challenge in ${DIMENSION_LABEL[item.dimension].toLowerCase()}: ${item.question ?? item.explanation}`;
}

export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const { state, update } = useStore();
  const ex = exerciseById(exerciseId);
  const existing = ex ? latestAttempt(state, ex.id) : undefined;
  // Resume an in-progress attempt; a finished/reviewed one starts fresh only when the user asks.
  const resumable = existing && existing.status === 'in_progress' ? existing : undefined;
  // Id is chosen up front so autosave and submit always write to the same attempt.
  const [attemptId] = useState<string>(() => resumable?.id ?? newAttemptId());
  const [text, setText] = useState(() => (resumable && workingVersion(resumable)?.text) || '');
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);

  // Autosave the response (FR-02: pause and return without losing work).
  useEffect(() => {
    if (!ex || !dirty.current) return;
    const t = setTimeout(() => {
      if (!dirty.current) return; // already saved by submit
      update((s) => saveWorking(s, ex.id, attemptId, text));
      dirty.current = false;
    }, 600);
    return () => clearTimeout(t);
  }, [text, ex, attemptId, update]);

  if (!ex) return <NotFound what="exercise" />;
  const lesson = lessonForExercise(ex.id)!;
  const path = pathById(lesson.pathId)!;
  const words = wordCount(text);
  const prior = existing && existing.status !== 'in_progress' ? existing : undefined;

  const submit = async () => {
    setSubmitting(true);
    dirty.current = false;
    const id = attemptId;
    update((s) => saveWorking(s, ex.id, id, text));
    const feedback = await coach.feedback({ exercise: ex, text, profile: state.profile.permissions.profile ? state.profile : undefined });
    update((s) => {
      const withFb = attachFeedback(s, id, feedback);
      const a = withFb.attempts.find((x) => x.id === id)!;
      return recordEvidence(withFb, a, ex, feedback);
    });
    navigate(`/academy/attempt/${id}`);
  };

  return (
    <>
      <PageHeader space="academy" title={ex.title} crumbs={[academyCrumb, { href: `#/academy/path/${path.id}`, label: path.title }, { href: `#/academy/lesson/${lesson.id}`, label: lesson.title }, { label: 'Exercise' }]} />

      {prior && (
        <div className="notice">
          You've already practised this. <a href={`#/academy/attempt/${prior.id}`}>See that attempt and its feedback</a>, or write a fresh one below.
        </div>
      )}

      <div className="card soft">
        <p style={{ marginBottom: 6 }}><strong>Prompt.</strong> {ex.prompt}</p>
        <p className="small" style={{ margin: 0 }}><strong>Intention:</strong> {ex.intention}</p>
      </div>

      <p className="small muted">
        📖 This is Academy practice. Submitting sends it for Academy feedback only — it stays here and isn't added to your Studio.
      </p>

      <div className="card">
        <textarea
          className="writing"
          style={{ minHeight: 280, border: 0, padding: 0 }}
          aria-label="Your response"
          placeholder="Start writing…"
          value={text}
          onChange={(e) => { dirty.current = true; setText(e.target.value); }}
        />
      </div>
      <div className="row between">
        <span className="small muted">{words} words · suggested {ex.targetWords[0]}–{ex.targetWords[1]}</span>
        <SaveState />
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={words < 5 || submitting} onClick={() => void submit()}>
          {submitting ? 'Reading your work…' : 'Submit for feedback'}
        </button>
        <a className="btn" href={`#/academy/lesson/${lesson.id}`}>Back to lesson</a>
        <a className="btn ghost" href={coachHref({ mode: 'instructor', ctx: 'exercise', id: ex.id })}>Ask the Instructor</a>
      </div>
    </>
  );
}

// ---------- A5 Feedback & revision ----------

function FeedbackView({ f }: { f: Feedback }) {
  return (
    <div className="stack">
      <div className="row">
        <span className="pill coach">💬 {MODE_LABEL[f.mode]} feedback</span>
        {f.sample && <span className="pill sample">Sample coach — not AI</span>}
      </div>
      <section>
        <h3>What's working</h3>
        {f.strengths.map((s, i) => (
          <div key={i} className="card" style={{ borderLeft: '4px solid var(--ok)' }}>
            <div className="small muted">{DIMENSION_LABEL[s.dimension]}</div>
            <p style={{ margin: '4px 0' }}><strong>Observed:</strong> {s.observation}</p>
            <p className="small" style={{ margin: 0 }}><strong>Why it matters:</strong> {s.explanation}</p>
          </div>
        ))}
      </section>
      {f.opportunities.length > 0 && (
        <section>
          <h3>Something to try</h3>
          {f.opportunities.map((o, i) => (
            <div key={i} className="card accent">
              <div className="small muted">{DIMENSION_LABEL[o.dimension]}</div>
              <p style={{ margin: '4px 0' }}><strong>Observed:</strong> {o.observation}</p>
              <p className="small" style={{ margin: '0 0 6px' }}><strong>Why it might matter:</strong> {o.explanation}</p>
              {o.question && <p style={{ margin: 0 }}><strong>Question:</strong> <em>{o.question}</em></p>}
            </div>
          ))}
        </section>
      )}
      <p className="small muted">{f.note}</p>
    </div>
  );
}

function Compare({ attempt }: { attempt: LearningAttempt }) {
  const subs = submittedVersions(attempt);
  const [a, setA] = useState(0);
  const [b, setB] = useState(subs.length - 1);
  const pick = (v: number, set: (n: number) => void) => (
    <select value={v} onChange={(e) => set(Number(e.target.value))} aria-label="Choose version">
      {subs.map((s, i) => <option key={s.id} value={i}>Attempt {i + 1} · {wordCount(s.text)} words</option>)}
    </select>
  );
  return (
    <div className="diff">
      <div>{pick(a, setA)}<div className="col" style={{ marginTop: 8 }}><pre>{subs[a]?.text}</pre></div></div>
      <div>{pick(b, setB)}<div className="col" style={{ marginTop: 8 }}><pre>{subs[b]?.text}</pre></div></div>
    </div>
  );
}

function ConnectToStudio({ attempt, onClose }: { attempt: LearningAttempt; onClose: () => void }) {
  const { state, update } = useStore();
  const ex = exerciseById(attempt.exerciseId)!;
  const projects = state.projects.filter((p) => p.status !== 'finished');
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const lesson = lessonForExercise(ex.id)!;
  const [note, setNote] = useState(`Idea from “${lesson.title}”: `);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);

  const save = () => {
    update((s) => ({
      ...s,
      links: [...s.links, { id: uid('link'), projectId, lessonId: lesson.id, exerciseId: ex.id, attemptId: attempt.id, note: note.trim(), createdAt: now() }],
    }));
    ref.current?.close();
    navigate(`/studio/project/${projectId}`);
  };

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="connect-title">
      <h2 id="connect-title">Connect to a Studio project</h2>
      <p className="small">
        This adds a <strong>reference note</strong> to the project pointing back to this lesson. Your exercise stays in the Academy —
        nothing is copied or moved, and the project isn't turned into homework.
      </p>
      {projects.length === 0 ? (
        <>
          <Empty>You don't have a Studio project yet.</Empty>
          <div className="row" style={{ marginTop: 12 }}>
            <a className="btn primary" href="#/studio/new">Start a project</a>
            <button className="btn" onClick={() => ref.current?.close()}>Not now</button>
          </div>
        </>
      ) : (
        <>
          <label className="field">
            <span>Project</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Note for the project</span>
            <small>What do you want to carry over? Only this note and a link are added.</small>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="row">
            <button className="btn primary" style={{ background: 'var(--studio)', borderColor: 'var(--studio)' }} onClick={save} disabled={!projectId}>Add link to project</button>
            <button className="btn" onClick={() => ref.current?.close()}>Cancel</button>
          </div>
        </>
      )}
    </dialog>
  );
}

export function FeedbackScreen({ attemptId }: { attemptId: string }) {
  const { state, update } = useStore();
  const attempt = state.attempts.find((a) => a.id === attemptId);
  const [revising, setRevising] = useState(false);
  const [revision, setRevision] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'feedback' | 'compare'>('feedback');
  const [connecting, setConnecting] = useState(false);
  const [reflection, setReflection] = useState(attempt?.reflection ?? '');

  if (!attempt) return <NotFound what="attempt" />;
  const ex = exerciseById(attempt.exerciseId)!;
  const lesson = lessonForExercise(ex.id)!;
  const subs = submittedVersions(attempt);
  const latest = subs[subs.length - 1];
  const links = state.links.filter((l) => l.attemptId === attempt.id);
  const noticed = state.observations.filter((o) => o.kind === 'inferred' && o.evidence.some((e) => e.id === attempt.id));

  if (!latest?.feedback) {
    return (
      <>
        <PageHeader space="academy" title={ex.title} crumbs={[academyCrumb, { label: 'Attempt' }]} />
        <Empty>This attempt hasn't been submitted yet. <a href={`#/academy/exercise/${ex.id}`}>Continue writing</a></Empty>
      </>
    );
  }

  const submitRevision = async () => {
    setBusy(true);
    update((s) => saveWorking(s, ex.id, attempt.id, revision));
    const feedback = await coach.feedback({ exercise: ex, text: revision, previousText: latest.text, profile: state.profile.permissions.profile ? state.profile : undefined });
    update((s) => {
      const withFb = attachFeedback(s, attempt.id, feedback);
      return recordEvidence(withFb, withFb.attempts.find((x) => x.id === attempt.id)!, ex, feedback);
    });
    setBusy(false);
    setRevising(false);
  };

  return (
    <>
      <PageHeader
        space="academy"
        title={ex.title}
        crumbs={[academyCrumb, { href: `#/academy/lesson/${lesson.id}`, label: lesson.title }, { label: 'Feedback & revision' }]}
      >
        <div className="row">
          <span className="pill academy">{subs.length > 1 ? `Revision ${subs.length - 1}` : 'First attempt'}</span>
          {attempt.status === 'complete' && <span className="pill academy">✓ Finished</span>}
          <span className="small muted">Submitted {formatDateTime(latest.submittedAt!)}</span>
        </div>
      </PageHeader>

      {subs.length > 1 && (
        <div className="row" role="tablist" style={{ marginBottom: 12 }}>
          <button className="choice" aria-pressed={view === 'feedback'} onClick={() => setView('feedback')}>Latest feedback</button>
          <button className="choice" aria-pressed={view === 'compare'} onClick={() => setView('compare')}>Compare attempts</button>
        </div>
      )}

      {view === 'compare' ? <Compare attempt={attempt} /> : (
        <div className="grid two" style={{ alignItems: 'start' }}>
          <div>
            <h3>Your attempt</h3>
            <div className="card"><pre className="writing" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{latest.text}</pre></div>
          </div>
          <div><FeedbackView f={latest.feedback} /></div>
        </div>
      )}

      {noticed.length > 0 && (
        <div className="card soft" data-space="profile" style={{ marginTop: 16 }}>
          <div className="small"><strong>Added to your Creative Profile as evidence:</strong></div>
          <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {noticed.map((o) => <li key={o.id}><a href={`#/profile/observation/${o.id}`}>{DIMENSION_LABEL[o.dimension]}</a> ({o.polarity === 'strength' ? 'strength' : 'next challenge'}) — you can correct or remove it.</li>)}
          </ul>
        </div>
      )}

      {revising ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Revise</h3>
          <p className="small muted">Change what you want. Your earlier attempt is kept so you can compare.</p>
          <textarea className="writing" style={{ minHeight: 240 }} value={revision} onChange={(e) => setRevision(e.target.value)} aria-label="Revision" />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" disabled={busy || wordCount(revision) < 5} onClick={() => void submitRevision()}>{busy ? 'Reading your revision…' : 'Submit revision'}</button>
            <button className="btn" onClick={() => setRevising(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="section">What next?</h2>
          <p className="small muted">All optional. Stopping here is fine — nothing is lost.</p>
          <div className="row">
            <button className="btn primary" onClick={() => { setRevision(latest.text); setRevising(true); }}>Revise</button>
            <a className="btn" href={coachHref({ mode: 'editor', ctx: 'attempt', id: attempt.id })}>Discuss with the Editor</a>
            <button className="btn" onClick={() => setConnecting(true)} style={{ color: 'var(--studio)' }}>Connect to a Studio project…</button>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <label className="field" style={{ marginBottom: 8 }}>
              <span>Reflection <span className="small muted">(optional)</span></span>
              <small>What did you notice or want to remember?</small>
              <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} style={{ minHeight: 70 }} />
            </label>
            <button
              className="btn"
              onClick={() => update((s) => ({
                ...s,
                attempts: s.attempts.map((a) => (a.id === attempt.id ? { ...a, status: 'complete', reflection: reflection.trim() || undefined, updatedAt: now() } : a)),
              }))}
            >
              {attempt.status === 'complete' ? 'Update reflection' : 'Mark as finished'}
            </button>
          </div>
        </>
      )}

      {links.length > 0 && (
        <p className="small muted" style={{ marginTop: 12 }}>
          Linked from: {links.map((l) => {
            const p = state.projects.find((x) => x.id === l.projectId);
            return p ? <a key={l.id} href={`#/studio/project/${p.id}`} style={{ marginRight: 8 }}>{p.title}</a> : null;
          })}
        </p>
      )}

      {connecting && <ConnectToStudio attempt={attempt} onClose={() => setConnecting(false)} />}
    </>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <>
      <PageHeader space="academy" title={`That ${what} wasn't found`} crumbs={[academyCrumb]} />
      <a className="btn" href="#/academy">Back to the Academy</a>
    </>
  );
}
