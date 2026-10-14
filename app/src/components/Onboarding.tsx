import type { AppState } from '../lib/types';
import { MemberChip } from './common';
import { MemberForm } from './Family';

export function Onboarding({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  return (
    <div className="onboarding stack narrow">
      <div className="hero">
        <div className="hero-icon" aria-hidden>🏡</div>
        <h1>Welcome to Family Huddle</h1>
        <p>
          Hand me the school newsletters, team schedules, and party invites. I'll put the dates on your calendar
          and work out when everyone needs to get moving.
        </p>
      </div>

      <section className="card">
        <h2>First, who's in the family?</h2>
        <p className="small muted">Add yourself, your partner, and the kids. You can change this later.</p>
        {state.members.length > 0 && (
          <div className="chips">{state.members.map((m) => <MemberChip key={m.id} member={m} />)}</div>
        )}
        <MemberForm count={state.members.length} onAdd={(m) => update((s) => ({ ...s, members: [...s.members, m] }))} />
      </section>

      <button className="btn primary big" disabled={!state.members.length} onClick={() => update((s) => ({ ...s, onboarded: true }))}>
        Let's go →
      </button>
      <p className="small muted center">🔒 Your family's info stays on this device.</p>
    </div>
  );
}
