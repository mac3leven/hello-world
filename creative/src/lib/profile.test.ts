import { describe, expect, it } from 'vitest';
import { addInferred, confidenceFor, syncSelfReports, updateObservation, usableObservations } from './profile';
import { emptyState } from './store';

const ev = (id: string) => ({ kind: 'attempt' as const, id, label: `Attempt ${id}`, at: '2026-01-01T00:00:00Z' });

describe('profile', () => {
  it('builds self-reports from setup answers and keeps user corrections', () => {
    let s = emptyState();
    s = { ...s, profile: { ...s.profile, strengths: ['observation'], frictions: ['structure'] } };
    s = syncSelfReports(s);
    expect(s.observations.map((o) => [o.kind, o.dimension, o.polarity])).toEqual([
      ['self_report', 'observation', 'strength'],
      ['self_report', 'structure', 'opportunity'],
    ]);
    const id = s.observations[0].id;
    s = updateObservation(s, id, { correction: 'Mostly in personal essays' });
    s = syncSelfReports(s);
    expect(s.observations.find((o) => o.id === id)?.correction).toBe('Mostly in personal essays');
  });

  it('never lets an inferred observation replace a self-report', () => {
    let s = emptyState();
    s = syncSelfReports({ ...s, profile: { ...s.profile, strengths: ['voice'] } });
    s = addInferred(s, { dimension: 'voice', polarity: 'strength', text: 'Distinct rhythm.', evidence: ev('a1') });
    expect(s.observations.filter((o) => o.dimension === 'voice')).toHaveLength(2);
  });

  it('grows confidence gradually and ignores duplicate evidence', () => {
    let s = emptyState();
    for (const id of ['a1', 'a1', 'a2', 'a3', 'a4']) {
      s = addInferred(s, { dimension: 'observation', polarity: 'strength', text: 'Concrete detail.', evidence: ev(id) });
    }
    const o = s.observations[0];
    expect(o.evidence).toHaveLength(4);
    expect(o.confidence).toBe('consistent');
    expect(confidenceFor(1)).toBe('tentative');
    expect(confidenceFor(2)).toBe('emerging');
  });

  it('excludes dismissed and do-not-use observations, and does not resurface dismissed ones', () => {
    let s = addInferred(emptyState(), { dimension: 'ideas', polarity: 'strength', text: 'x', evidence: ev('a1') });
    const id = s.observations[0].id;
    s = updateObservation(s, id, { dismissedAt: '2026-01-02T00:00:00Z' });
    s = addInferred(s, { dimension: 'ideas', polarity: 'strength', text: 'x', evidence: ev('a2') });
    expect(s.observations).toHaveLength(1);
    expect(s.observations[0].dismissedAt).toBeTruthy();
    expect(usableObservations(s)).toHaveLength(0);
  });
});
