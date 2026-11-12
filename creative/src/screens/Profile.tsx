// P1 Creative Profile + P2 Evidence. Your statements are kept apart from coach observations (FR-05).

import { useState } from 'react';
import { Choices, ConfirmButton, Empty, PageHeader } from '../components/ui';
import { exerciseById } from '../content/curriculum';
import { now } from '../lib/id';
import {
  CONFIDENCE_LABEL, DIMENSION_LABEL, DIMENSIONS, FEEDBACK_STYLE_LABEL, formatDate, GOAL_OPTIONS, INTEREST_OPTIONS, MODE_LABEL,
} from '../lib/labels';
import { observationText, syncSelfReports, updateObservation } from '../lib/profile';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import type { Confidence, CreativeProfile, EvidenceRef, SkillObservation } from '../lib/types';

function Meter({ c }: { c: Confidence }) {
  const n = c === 'consistent' ? 3 : c === 'emerging' ? 2 : 1;
  return (
    <span className="meter" title={CONFIDENCE_LABEL[c]} aria-label={CONFIDENCE_LABEL[c]}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= n ? 'on' : ''} />)}
    </span>
  );
}

function ObservationRow({ o }: { o: SkillObservation }) {
  const { update } = useStore();
  return (
    <li>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="row" style={{ marginBottom: 4 }}>
            <span className={`pill ${o.kind === 'self_report' ? '' : 'profile'}`}>{o.kind === 'self_report' ? 'You said' : 'Coach noticed'}</span>
            <span className="small muted">{DIMENSION_LABEL[o.dimension]}</span>
            {o.kind === 'inferred' && <Meter c={o.confidence} />}
            {o.doNotUse && <span className="pill">Not used</span>}
          </div>
          <div>{observationText(o)}</div>
        </div>
        <div className="row">
          <a className="btn small" href={`#/profile/observation/${o.id}`}>{o.kind === 'inferred' ? 'Why?' : 'Edit'}</a>
          {o.kind === 'inferred' && (
            <button className="btn small ghost" onClick={() => update((s) => updateObservation(s, o.id, { dismissedAt: now() }))}>Dismiss</button>
          )}
        </div>
      </div>
    </li>
  );
}

function ObservationGroup({ title, hint, items }: { title: string; hint: string; items: SkillObservation[] }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="small muted">{hint}</p>
      {items.length ? <ul className="list">{items.map((o) => <ObservationRow key={o.id} o={o} />)}</ul> : <Empty>Nothing here yet.</Empty>}
    </section>
  );
}

function PreferencesEditor({ onDone }: { onDone: () => void }) {
  const { state, update } = useStore();
  const p = state.profile;
  const set = (patch: Partial<CreativeProfile>) =>
    update((s) => syncSelfReports({ ...s, profile: { ...s.profile, ...patch, updatedAt: now() } }));
  return (
    <div className="card stack">
      <div><h3>Goals</h3><Choices options={[...new Set([...GOAL_OPTIONS, ...p.goals])]} value={p.goals} onChange={(goals) => set({ goals })} /></div>
      <div><h3>Interests</h3><Choices options={INTEREST_OPTIONS} value={p.interests} onChange={(interests) => set({ interests })} /></div>
      <div><h3>Feels like a strength</h3><Choices options={DIMENSIONS} labels={DIMENSION_LABEL} value={p.strengths} onChange={(strengths) => set({ strengths })} /></div>
      <div><h3>Would like to grow</h3><Choices options={DIMENSIONS} labels={DIMENSION_LABEL} value={p.frictions} onChange={(frictions) => set({ frictions })} /></div>
      <div>
        <h3>Feedback style</h3>
        <Choices options={['direct', 'gentle', 'questions'] as const} labels={FEEDBACK_STYLE_LABEL} value={[p.feedbackStyle]}
          onChange={(v) => { const n = v.find((x) => x !== p.feedbackStyle); if (n) set({ feedbackStyle: n }); }} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn primary" onClick={onDone}>Done</button></div>
    </div>
  );
}

export function ProfileScreen() {
  const { state, update } = useStore();
  const [editing, setEditing] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const p = state.profile;
  const active = state.observations.filter((o) => !o.dismissedAt);
  const dismissed = state.observations.filter((o) => o.dismissedAt);
  const recent = [...state.observations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  return (
    <>
      <PageHeader space="profile" title={state.user.name ? `${state.user.name}'s Creative Profile` : 'Creative Profile'}>
        <p className="muted" style={{ margin: 0 }}>
          A living picture, not a grade. It describes evidence and opportunities, and you can correct any of it.
        </p>
      </PageHeader>

      <section className="section-head"><h2>What you've told us</h2>{!editing && <button className="btn small" onClick={() => setEditing(true)}>Edit</button>}</section>
      {editing ? <PreferencesEditor onDone={() => setEditing(false)} /> : (
        <div className="card">
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr', gap: '8px 16px' }}>
            <dt className="muted">Goals</dt><dd style={{ margin: 0 }}>{p.goals.length ? p.goals.join(' · ') : <span className="muted">None yet</span>}</dd>
            <dt className="muted">Interests</dt><dd style={{ margin: 0 }}>{p.interests.length ? p.interests.join(' · ') : <span className="muted">None yet</span>}</dd>
            <dt className="muted">Feedback</dt><dd style={{ margin: 0 }}>{FEEDBACK_STYLE_LABEL[p.feedbackStyle]}</dd>
            <dt className="muted">Sessions</dt><dd style={{ margin: 0 }}>About {p.sessionMinutes} minutes</dd>
            <dt className="muted">Coach starts as</dt><dd style={{ margin: 0 }}>{MODE_LABEL[p.preferredMode]}</dd>
          </dl>
        </div>
      )}

      <div className="grid two" style={{ marginTop: 20 }}>
        <ObservationGroup
          title="Strengths to build from"
          hint="What you said, and what the coach has noticed in your work. Strengths are a starting point."
          items={active.filter((o) => o.polarity === 'strength')}
        />
        <ObservationGroup
          title="Growth opportunities"
          hint="Optional next challenges — never a diagnosis."
          items={active.filter((o) => o.polarity === 'opportunity')}
        />
      </div>

      {active.every((o) => o.kind !== 'inferred') && (
        <p className="small muted">The coach hasn't noted anything yet. Observations appear after Academy feedback{p.permissions.studioForPersonalization ? ' or Studio coaching' : ''}, each with the evidence behind it.</p>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="section">Recent changes</h2>
          <ul className="list card">
            {recent.map((o) => (
              <li key={o.id} className="small">
                <span className="muted">{formatDate(o.updatedAt)}</span> — {o.dismissedAt ? 'Dismissed' : o.kind === 'self_report' ? 'You noted' : 'Coach noted'}: {DIMENSION_LABEL[o.dimension].toLowerCase()}
              </li>
            ))}
          </ul>
        </>
      )}

      {dismissed.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button className="btn ghost small" onClick={() => setShowDismissed(!showDismissed)}>
            {showDismissed ? 'Hide' : 'Show'} dismissed ({dismissed.length})
          </button>
          {showDismissed && (
            <ul className="list card">
              {dismissed.map((o) => (
                <li key={o.id} className="row between">
                  <span className="muted">{observationText(o)}</span>
                  <button className="btn small" onClick={() => update((s) => updateObservation(s, o.id, { dismissedAt: undefined }))}>Restore</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function EvidenceItem({ e }: { e: EvidenceRef }) {
  const { state } = useStore();
  let link: string | undefined;
  let note: string | undefined;
  if (e.kind === 'attempt' || e.kind === 'feedback') {
    const a = state.attempts.find((x) => x.id === e.id);
    if (a) link = `#/academy/attempt/${a.id}`;
    else note = 'That practice attempt has since been deleted.';
  }
  if (e.kind === 'draft') {
    // Evidence links respect context permissions (P2).
    if (!state.profile.permissions.studioForPersonalization) note = 'From Studio work. Hidden while "Learn from my Studio work" is off.';
    else if (state.drafts.some((d) => d.id === e.id)) link = `#/studio/draft/${e.id}`;
  }
  return (
    <li>
      <div className="row between">
        <span>{e.label}</span>
        <span className="small muted">{formatDate(e.at)}</span>
      </div>
      {link && <a className="small" href={link}>Open source →</a>}
      {note && <div className="small muted">{note}</div>}
    </li>
  );
}

export function EvidenceScreen({ id }: { id: string }) {
  const { state, update } = useStore();
  const o = state.observations.find((x) => x.id === id);
  const [draft, setDraft] = useState(o?.correction ?? '');
  if (!o) return <><PageHeader space="profile" title="Observation not found" /><a className="btn" href="#/profile">Back to profile</a></>;

  const set = (patch: Partial<SkillObservation>) => update((s) => updateObservation(s, o.id, patch));
  const firstAttempt = o.evidence.find((e) => e.kind === 'attempt');
  const exercise = firstAttempt ? state.attempts.find((a) => a.id === firstAttempt.id) : undefined;

  return (
    <>
      <PageHeader space="profile" title={DIMENSION_LABEL[o.dimension]} crumbs={[{ href: '#/profile', label: 'Creative Profile' }, { label: 'Observation' }]} />
      <div className="card accent">
        <div className="row" style={{ marginBottom: 6 }}>
          <span className={`pill ${o.kind === 'inferred' ? 'profile' : ''}`}>{o.kind === 'self_report' ? 'You said' : 'Coach noticed'}</span>
          <span className="pill">{o.polarity === 'strength' ? 'Strength' : 'Growth opportunity'}</span>
          {o.dismissedAt && <span className="pill">Dismissed</span>}
        </div>
        <p className="writing" style={{ fontSize: '1.15rem' }}>{observationText(o)}</p>
        {o.correction && <p className="small muted">Originally: “{o.text}”</p>}
        {o.kind === 'inferred' && (
          <p className="small muted" style={{ margin: 0 }}>
            <Meter c={o.confidence} /> {CONFIDENCE_LABEL[o.confidence]}. This is a hypothesis from a few examples, not an assessment.
          </p>
        )}
      </div>

      <h2 className="section">Why this was {o.kind === 'inferred' ? 'suggested' : 'recorded'}</h2>
      <ul className="list card">{o.evidence.map((e, i) => <EvidenceItem key={i} e={e} />)}</ul>
      {exercise && <p className="small muted">First seen in “{exerciseById(exercise.exerciseId)?.title}”.</p>}

      <h2 className="section">Correct it</h2>
      <div className="card">
        <label className="field">
          <span>Say it in your own words</span>
          <small>Your wording replaces the coach's everywhere it's shown.</small>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={o.text} />
        </label>
        <div className="row">
          <button className="btn primary" onClick={() => set({ correction: draft.trim() || undefined })}>Save wording</button>
          {o.correction && <button className="btn ghost" onClick={() => { setDraft(''); set({ correction: undefined }); }}>Revert to original</button>}
        </div>
        <label className="toggle" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={!!o.doNotUse} onChange={(e) => set({ doNotUse: e.target.checked })} />
          <span><strong>Don't use this</strong><br /><span className="small muted">Keep it on record, but the coach and recommendations will ignore it.</span></span>
        </label>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        {o.dismissedAt
          ? <button className="btn" onClick={() => set({ dismissedAt: undefined })}>Restore</button>
          : <button className="btn" onClick={() => { set({ dismissedAt: now() }); navigate('/profile'); }}>Dismiss</button>}
        <ConfirmButton
          question="Remove this observation and its evidence trail? Your original work is not affected."
          confirmLabel="Remove"
          onConfirm={() => {
            update((s) => ({
              ...s,
              observations: s.observations.filter((x) => x.id !== o.id),
              // Removing a self-report also removes it from your stated strengths/opportunities.
              profile: o.kind === 'self_report'
                ? { ...s.profile, strengths: o.polarity === 'strength' ? s.profile.strengths.filter((d) => d !== o.dimension) : s.profile.strengths, frictions: o.polarity === 'opportunity' ? s.profile.frictions.filter((d) => d !== o.dimension) : s.profile.frictions }
                : s.profile,
            }));
            navigate('/profile');
          }}
        >
          Remove permanently
        </ConfirmButton>
      </div>
    </>
  );
}
