// H1 Progress & milestones: descriptive, reflective, never competitive (no points, ranks, or streaks).

import { useState } from 'react';
import { Empty, PageHeader } from '../components/ui';
import { now, uid } from '../lib/id';
import { DIMENSION_LABEL, formatDate, PROJECT_STATUS_LABEL, wordCount } from '../lib/labels';
import { milestones, recentLearning } from '../lib/progress';
import { useStore } from '../lib/store';

export function ProgressScreen() {
  const { state, update } = useStore();
  const [note, setNote] = useState('');
  const all = milestones(state);
  const reached = all.filter((m) => m.achievedAt).sort((a, b) => b.achievedAt!.localeCompare(a.achievedAt!));
  const ahead = all.filter((m) => !m.achievedAt).slice(0, 3);
  const learning = recentLearning(state);
  const profileChanges = [...state.observations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <>
      <PageHeader space="neutral" title="Progress & milestones">
        <p className="muted" style={{ margin: 0 }}>A record of what you’ve made and practised. Take breaks whenever you like — nothing here counts down.</p>
      </PageHeader>

      <div className="grid two" style={{ alignItems: 'start' }}>
        <section>
          <h2 className="section">Milestones</h2>
          {reached.length === 0 ? <Empty>Milestones appear as you work — capturing an idea, practising with feedback, revising.</Empty> : (
            <ul className="list card">
              {reached.map((m) => (
                <li key={m.kind}>
                  <div className="row between"><strong>✦ {m.title}</strong><span className="small muted">{formatDate(m.achievedAt!)}</span></div>
                  <div className="small muted">{m.description}</div>
                </li>
              ))}
            </ul>
          )}
          {ahead.length > 0 && (
            <>
              <p className="small muted" style={{ marginBottom: 6 }}>Possible next milestones, if they suit you:</p>
              <ul className="small muted" style={{ marginTop: 0, paddingLeft: 18 }}>{ahead.map((m) => <li key={m.kind}>{m.title}</li>)}</ul>
            </>
          )}

          <h2 className="section">Reflections</h2>
          <form className="card" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; update((s) => ({ ...s, reflections: [{ id: uid('refl'), text: note.trim(), createdAt: now() }, ...s.reflections] })); setNote(''); }}>
            <label className="field" style={{ marginBottom: 8 }}>
              <span>How is your writing going?</span>
              <small>Clarity, confidence, what’s changed, what you finished. Only you see this.</small>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 70 }} />
            </label>
            <button className="btn" type="submit" disabled={!note.trim()}>Save reflection</button>
          </form>
          {state.reflections.length > 0 && (
            <ul className="list card">
              {state.reflections.map((r) => (
                <li key={r.id} className="row between" style={{ alignItems: 'flex-start' }}>
                  <span style={{ flex: 1 }}><span className="small muted">{formatDate(r.createdAt)}</span><br />{r.text}</span>
                  <button className="btn small ghost" aria-label="Delete reflection" onClick={() => update((s) => ({ ...s, reflections: s.reflections.filter((x) => x.id !== r.id) }))}>×</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="section">Practice history</h2>
          {learning.length === 0 ? <Empty>No Academy practice yet.</Empty> : (
            <ul className="list card" data-space="academy">
              {learning.map(({ attempt, exercise, submissions }) => (
                <li key={attempt.id}>
                  <a href={submissions ? `#/academy/attempt/${attempt.id}` : `#/academy/exercise/${attempt.exerciseId}`}>{exercise?.title}</a>
                  <div className="small muted">
                    {submissions === 0 ? 'Draft saved' : submissions === 1 ? 'Feedback received' : `${submissions - 1} revision${submissions > 2 ? 's' : ''} after feedback`}
                    {attempt.status === 'complete' && ' · finished'} · {formatDate(attempt.updatedAt)}
                  </div>
                  {attempt.reflection && <div className="small">“{attempt.reflection}”</div>}
                </li>
              ))}
            </ul>
          )}

          <h2 className="section">Studio work</h2>
          {state.projects.length === 0 ? <Empty>No projects yet.</Empty> : (
            <ul className="list card" data-space="studio">
              {state.projects.map((p) => {
                const drafts = state.drafts.filter((d) => d.projectId === p.id);
                return (
                  <li key={p.id} className="row between">
                    <a href={`#/studio/project/${p.id}`}>{p.title}</a>
                    <span className="small muted">{PROJECT_STATUS_LABEL[p.status]} · {drafts.reduce((n, d) => n + wordCount(d.text), 0)} words</span>
                  </li>
                );
              })}
            </ul>
          )}

          <h2 className="section">Profile changes</h2>
          {profileChanges.length === 0 ? <Empty>Nothing yet.</Empty> : (
            <ul className="list card" data-space="profile">
              {profileChanges.map((o) => (
                <li key={o.id} className="small">
                  <span className="muted">{formatDate(o.updatedAt)}</span> — <a href={`#/profile/observation/${o.id}`}>{DIMENSION_LABEL[o.dimension]}</a>: {o.kind === 'inferred' ? 'coach noted' : 'you noted'} a {o.polarity === 'strength' ? 'strength' : 'growth opportunity'}{o.dismissedAt ? ' (dismissed)' : ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
