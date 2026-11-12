// Creative Profile rules (PRD FR-05, §8):
// - What the user says (self_report) and what the coach notices (inferred) are separate records.
// - Inferred observations keep their evidence and grow in confidence gradually.
// - Coach observations never overwrite the user's own statements; dismissed ones are not resurfaced.

import { now, uid } from './id';
import { DIMENSION_LABEL } from './labels';
import type { AppState, Confidence, Dimension, EvidenceRef, SkillObservation } from './types';

export function confidenceFor(evidenceCount: number): Confidence {
  if (evidenceCount >= 4) return 'consistent';
  if (evidenceCount >= 2) return 'emerging';
  return 'tentative';
}

/** Rebuild self-report observations from the profile's strengths/frictions, keeping user edits. */
export function syncSelfReports(s: AppState): AppState {
  const t = now();
  const wanted: { dimension: Dimension; polarity: 'strength' | 'opportunity' }[] = [
    ...s.profile.strengths.map((d) => ({ dimension: d, polarity: 'strength' as const })),
    ...s.profile.frictions.map((d) => ({ dimension: d, polarity: 'opportunity' as const })),
  ];
  const kept = s.observations.filter((o) => o.kind !== 'self_report');
  const selfReports = wanted.map(({ dimension, polarity }) => {
    const existing = s.observations.find((o) => o.kind === 'self_report' && o.dimension === dimension && o.polarity === polarity);
    if (existing) return existing;
    return {
      id: uid('obs'),
      dimension,
      polarity,
      kind: 'self_report' as const,
      text: polarity === 'strength'
        ? `You said ${DIMENSION_LABEL[dimension].toLowerCase()} feels like a strength.`
        : `You said you'd like to grow in ${DIMENSION_LABEL[dimension].toLowerCase()}.`,
      evidence: [{ kind: 'onboarding' as const, label: 'Your answer during setup', at: t }],
      confidence: 'tentative' as const,
      createdAt: t,
      updatedAt: t,
    };
  });
  return { ...s, observations: [...selfReports, ...kept] };
}

/** Record a coach observation, or add evidence to the matching one. */
export function addInferred(
  s: AppState,
  input: { dimension: Dimension; polarity: 'strength' | 'opportunity'; text: string; evidence: EvidenceRef },
): AppState {
  const t = now();
  const existing = s.observations.find((o) => o.kind === 'inferred' && o.dimension === input.dimension && o.polarity === input.polarity);
  if (existing) {
    if (existing.evidence.some((e) => e.id && e.id === input.evidence.id)) return s;
    const evidence = [...existing.evidence, input.evidence];
    const updated: SkillObservation = {
      ...existing,
      evidence,
      confidence: confidenceFor(evidence.length),
      // Keep the wording stable once the user has seen it; the evidence list shows what's new.
      updatedAt: t,
    };
    return { ...s, observations: s.observations.map((o) => (o.id === existing.id ? updated : o)) };
  }
  const obs: SkillObservation = {
    id: uid('obs'),
    dimension: input.dimension,
    polarity: input.polarity,
    kind: 'inferred',
    text: input.text,
    evidence: [input.evidence],
    confidence: 'tentative',
    createdAt: t,
    updatedAt: t,
  };
  return { ...s, observations: [...s.observations, obs] };
}

/** Observations the coach and recommendations are allowed to use. */
export function usableObservations(s: AppState): SkillObservation[] {
  return s.observations.filter((o) => !o.dismissedAt && !o.doNotUse);
}

export const observationText = (o: SkillObservation) => o.correction?.trim() || o.text;

export function updateObservation(s: AppState, id: string, patch: Partial<SkillObservation>): AppState {
  return {
    ...s,
    observations: s.observations.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: now() } : o)),
  };
}
