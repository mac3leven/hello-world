import type { ReactNode } from 'react';
import type { EventCategory, FamilyMember } from '../lib/types';

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  school: '🏫 School',
  sports: '⚽ Sports',
  activity: '🎨 Activity',
  appointment: '🩺 Appointment',
  work: '💼 Work',
  other: '📌 Other',
};

export function MemberChip({ member, small }: { member: FamilyMember; small?: boolean }) {
  return (
    <span className={`chip${small ? ' chip-small' : ''}`} style={{ '--chip': member.color } as React.CSSProperties}>
      {member.name}
    </span>
  );
}

/** Toggle buttons for picking family members. */
export function MemberPicker({ members, value, onChange }: { members: FamilyMember[]; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="picker" role="group">
      {members.map((m) => {
        const on = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            className={`chip chip-toggle${on ? ' on' : ''}`}
            style={{ '--chip': m.color } as React.CSSProperties}
            onClick={() => onChange(on ? value.filter((v) => v !== m.id) : [...value, m.id])}
          >
            {m.name}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
