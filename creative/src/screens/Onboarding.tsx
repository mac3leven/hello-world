// S0–S3: every question is optional; Academy and Studio are reachable without finishing (FR-01).

import { useState } from 'react';
import { PermissionToggles } from '../components/Permissions';
import { Choices } from '../components/ui';
import { now } from '../lib/id';
import { DIMENSION_LABEL, DIMENSIONS, FEEDBACK_STYLE_LABEL, GOAL_OPTIONS, INTEREST_OPTIONS, MODE_BLURB, MODE_LABEL } from '../lib/labels';
import { syncSelfReports } from '../lib/profile';
import { navigate } from '../lib/router';
import { withSampleWork } from '../lib/seed';
import { useStore } from '../lib/store';
import type { AppState, CoachMode, CreativeProfile, Experience, FeedbackStyle } from '../lib/types';

function Steps({ at }: { at: number }) {
  return (
    <div className="steps" aria-label={`Step ${at} of 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={i <= at ? 'on' : ''} />)}
    </div>
  );
}

function useProfile() {
  const { state, update } = useStore();
  const set = (patch: Partial<CreativeProfile>) =>
    update((s) => ({ ...s, profile: { ...s.profile, ...patch, updatedAt: now() } }));
  return { state, update, profile: state.profile, set };
}

function finish(update: (fn: (s: AppState) => AppState) => void, opts: { sample?: boolean } = {}) {
  update((s) => {
    let next = syncSelfReports({ ...s, user: { ...s.user, onboarded: true } });
    if (opts.sample && !next.projects.some((p) => p.title.startsWith('[Sample]'))) next = withSampleWork(next);
    return next;
  });
  navigate('/', { replace: true });
}

function Nav({ back, next, nextLabel = 'Continue', onSkip }: { back?: string; next: () => void; nextLabel?: string; onSkip: () => void }) {
  return (
    <div className="row between" style={{ marginTop: 28 }}>
      <div className="row">
        {back && <a className="btn ghost" href={back}>← Back</a>}
        <button className="btn ghost" onClick={onSkip}>Skip the rest</button>
      </div>
      <button className="btn primary" onClick={next}>{nextLabel}</button>
    </div>
  );
}

export function Welcome() {
  const { state, update } = useStore();
  const [name, setName] = useState(state.user.name);
  const saveName = () => update((s) => ({ ...s, user: { ...s.user, name: name.trim() } }));
  return (
    <>
      <p className="space-banner" style={{ color: 'var(--muted)' }}>Creative Development</p>
      <h1 style={{ fontSize: '2rem' }}>A place to learn your craft and do your own work.</h1>
      <p className="muted">For writing, scripts, personal stories, and cinematic storytelling. Private to you.</p>

      <div className="grid" style={{ margin: '24px 0' }}>
        <div className="card" data-space="academy" style={{ borderLeft: '4px solid var(--academy)' }}>
          <h3>📖 Academy</h3>
          <p className="small" style={{ margin: 0 }}>Short lessons and focused exercises with specific feedback. This is where learning lives.</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--studio)' }}>
          <h3>✍️ Studio</h3>
          <p className="small" style={{ margin: 0 }}>Your ideas, projects, and drafts. Independent work — never treated as homework.</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--profile)' }}>
          <h3>👤 Creative Profile &amp; 💬 Coach</h3>
          <p className="small" style={{ margin: 0 }}>Remembers how you're developing, with reasons you can check and correct. One coach helps in four modes — and suggests, never takes over.</p>
        </div>
      </div>

      <label className="field">
        <span>What should we call you? <span className="muted small">(optional)</span></span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} autoComplete="given-name" />
      </label>

      <p className="small muted">Everything stays in this browser. There's no account yet, and nothing you write is used to train AI.</p>

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn primary" onClick={() => { saveName(); navigate('/onboarding/goals'); }}>Set up (about 2 minutes)</button>
        <button className="btn" onClick={() => { saveName(); finish(update); }}>Skip setup</button>
        <button className="btn ghost" onClick={() => { saveName(); finish(update, { sample: true }); }}>Skip and explore with sample work</button>
      </div>
    </>
  );
}

export function GoalsStep() {
  const { profile, set, update } = useProfile();
  const [custom, setCustom] = useState('');
  const goalOptions = [...GOAL_OPTIONS, ...profile.goals.filter((g) => !GOAL_OPTIONS.includes(g))];
  const addCustom = () => {
    const g = custom.trim();
    if (g && !profile.goals.includes(g)) set({ goals: [...profile.goals, g] });
    setCustom('');
  };
  return (
    <>
      <Steps at={1} />
      <h1>What do you want to make?</h1>
      <p className="muted">Pick any that fit. You can change these any time in your Creative Profile.</p>
      <Choices options={goalOptions} value={profile.goals} onChange={(goals) => set({ goals })} />
      <form className="row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); addCustom(); }}>
        <input type="text" placeholder="Something else…" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ flex: 1 }} aria-label="Add your own goal" />
        <button className="btn" type="submit" disabled={!custom.trim()}>Add</button>
      </form>

      <h2 style={{ marginTop: 28 }}>What are you drawn to?</h2>
      <Choices options={INTEREST_OPTIONS} value={profile.interests} onChange={(interests) => set({ interests })} />

      <Nav back="#/welcome" next={() => navigate('/onboarding/strengths')} onSkip={() => finish(update)} />
    </>
  );
}

const EXPERIENCE_LABEL: Record<Experience, string> = {
  starting: "I'm just starting",
  some: "I've written a fair bit",
  experienced: "I write regularly / professionally",
};

export function StrengthsStep() {
  const { profile, set, update } = useProfile();
  return (
    <>
      <Steps at={2} />
      <h1>Where are you starting from?</h1>
      <p className="muted">Your own sense of things — not a test. The coach treats this as a starting point and you can change it later.</p>

      <h2 style={{ marginTop: 24 }}>What feels like a strength?</h2>
      <Choices options={DIMENSIONS} labels={DIMENSION_LABEL} value={profile.strengths} onChange={(strengths) => set({ strengths })} />

      <h2 style={{ marginTop: 24 }}>Where would you like to grow?</h2>
      <p className="small muted">Things that feel slow, sticky, or that you'd simply like to explore.</p>
      <Choices options={DIMENSIONS} labels={DIMENSION_LABEL} value={profile.frictions} onChange={(frictions) => set({ frictions })} />

      <h2 style={{ marginTop: 24 }}>How much have you written?</h2>
      <Choices
        options={['starting', 'some', 'experienced'] as const}
        labels={EXPERIENCE_LABEL}
        value={profile.experience ? [profile.experience] : []}
        onChange={(v) => set({ experience: v.filter((x) => x !== profile.experience)[0] })}
      />

      <Nav back="#/onboarding/goals" next={() => navigate('/onboarding/coach')} onSkip={() => finish(update)} />
    </>
  );
}

const SESSION_OPTIONS = ['10', '20', '45', '90'] as const;

export function CoachStep() {
  const { profile, set, update } = useProfile();
  return (
    <>
      <Steps at={3} />
      <h1>How should the coach work with you?</h1>

      <h2 style={{ marginTop: 20 }}>Feedback style</h2>
      <Choices
        options={['direct', 'gentle', 'questions'] as FeedbackStyle[]}
        labels={FEEDBACK_STYLE_LABEL}
        value={[profile.feedbackStyle]}
        onChange={(v) => { const n = v.find((x) => x !== profile.feedbackStyle); if (n) set({ feedbackStyle: n }); }}
      />

      <h2 style={{ marginTop: 20 }}>Usual session length</h2>
      <Choices
        options={SESSION_OPTIONS}
        labels={{ 10: '~10 min', 20: '~20 min', 45: '~45 min', 90: 'An hour or more' }}
        value={[String(profile.sessionMinutes) as (typeof SESSION_OPTIONS)[number]]}
        onChange={(v) => { const n = v.find((x) => x !== String(profile.sessionMinutes)); if (n) set({ sessionMinutes: Number(n) }); }}
      />

      <h2 style={{ marginTop: 20 }}>Coach mode to start in</h2>
      <p className="small muted">It's one coach. You can switch modes in any conversation.</p>
      <div className="grid two">
        {(Object.keys(MODE_LABEL) as CoachMode[]).map((m) => (
          <button
            key={m}
            className="card choice"
            style={{ textAlign: 'left', borderRadius: 'var(--radius)' }}
            aria-pressed={profile.preferredMode === m}
            onClick={() => set({ preferredMode: m })}
          >
            <strong>{MODE_LABEL[m]}</strong>
            <br />
            <span className="small muted">{MODE_BLURB[m]}</span>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>What the coach may use</h2>
      <div className="card">
        <PermissionToggles value={profile.permissions} onChange={(permissions) => set({ permissions })} />
      </div>
      <p className="small muted">Change these any time in Settings &amp; privacy.</p>

      <div className="row between" style={{ marginTop: 28 }}>
        <a className="btn ghost" href="#/onboarding/strengths">← Back</a>
        <button className="btn primary" onClick={() => finish(update)}>Finish setup</button>
      </div>
    </>
  );
}
