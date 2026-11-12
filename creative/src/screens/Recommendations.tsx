// Recommendation card: why this, plus accept / not now / dismiss (FR-07). Dismissing never reduces
// progress or triggers guilt messaging.

import { useState } from 'react';
import { now } from '../lib/id';
import { navigate } from '../lib/router';
import { BASIS_LABEL, recommend } from '../lib/recommend';
import { useStore } from '../lib/store';
import type { RecommendationStatus } from '../lib/types';

const DISMISS_REASONS = ['Not interested right now', 'Already know this', 'Not relevant to my work', 'Other'];

export function RecommendationCard({ scope }: { scope: 'home' | 'academy' }) {
  const { state, update } = useStore();
  const [why, setWhy] = useState(scope === 'home');
  const [dismissing, setDismissing] = useState(false);
  const [flash, setFlash] = useState('');
  const [rec, alt] = recommend(state, { limit: 2 });

  if (!rec) {
    return (
      <div className="card soft" data-space="academy">
        <strong>No suggestion right now.</strong>
        <p className="small" style={{ margin: 0 }}>You've practised or set aside everything on offer. Browse the paths any time, or work in your Studio.</p>
      </div>
    );
  }

  const decide = (status: RecommendationStatus, reason?: string) => {
    update((s) => ({ ...s, recommendations: { ...s.recommendations, [rec.key]: { status, at: now(), reason } } }));
    setDismissing(false);
    if (status === 'deferred') setFlash('Okay — it may come back in a few days.');
    if (status === 'dismissed') setFlash('Okay — it won\'t be suggested again.');
  };

  return (
    <div className="card accent" data-space="academy" aria-live="polite">
      <div className="row between">
        <span className="pill academy">Suggested · {BASIS_LABEL[rec.basis]}</span>
        <span className="small muted">📖 Academy</span>
      </div>
      <h3 style={{ marginTop: 8 }}>{rec.title}</h3>
      <p className="small" style={{ marginBottom: 8 }}>{rec.summary}</p>

      <button className="btn ghost small" style={{ paddingLeft: 0 }} aria-expanded={why} onClick={() => setWhy(!why)}>
        {why ? '▾' : '▸'} Why this?
      </button>
      {why && (
        <ul className="small" style={{ margin: '4px 0 10px', paddingLeft: 18 }}>
          {rec.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {dismissing ? (
        <div className="row">
          <span className="small muted">Optional — why?</span>
          {DISMISS_REASONS.map((r) => <button key={r} className="btn small" onClick={() => decide('dismissed', r)}>{r}</button>)}
          <button className="btn small ghost" onClick={() => decide('dismissed')}>Skip</button>
        </div>
      ) : (
        <div className="row">
          <button className="btn primary" onClick={() => { decide('accepted'); navigate(rec.href.slice(1)); }}>{rec.actionLabel}</button>
          <button className="btn" onClick={() => decide('deferred')}>Not now</button>
          <button className="btn ghost" onClick={() => setDismissing(true)}>Dismiss</button>
        </div>
      )}
      {flash && <p className="small muted" style={{ margin: '8px 0 0' }}>{flash}{alt ? ' Here’s another option.' : ''}</p>}
    </div>
  );
}
