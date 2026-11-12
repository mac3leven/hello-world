import type { ReactNode } from 'react';
import { useStore, type SaveStatus } from '../lib/store';

export type Space = 'academy' | 'studio' | 'coach' | 'profile' | 'neutral';

const SPACE_LABEL: Record<Space, { name: string; sub: string } | null> = {
  academy: { name: 'Academy', sub: 'Learning & practice' },
  studio: { name: 'Studio', sub: 'Your independent work' },
  coach: { name: 'Coach', sub: 'One coach, four modes' },
  profile: { name: 'Creative Profile', sub: 'How you are developing' },
  neutral: null,
};

/** Page header: tells you which space you are in, so Academy and Studio never blur. */
export function PageHeader({ space, title, crumbs, actions, children }: {
  space: Space;
  title: string;
  crumbs?: { href?: string; label: string }[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const s = SPACE_LABEL[space];
  return (
    <header style={{ marginBottom: 18 }}>
      {crumbs && crumbs.length > 0 && (
        <nav className="crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={i}>
              {c.href ? <a href={c.href}>{c.label}</a> : c.label}
              {i < crumbs.length - 1 && ' /'}
            </span>
          ))}
        </nav>
      )}
      {s && (
        <div className="space-banner">
          {s.name} <span className="sub">· {s.sub}</span>
        </div>
      )}
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {actions && <div className="row">{actions}</div>}
      </div>
      {children && <div style={{ marginTop: 8 }}>{children}</div>}
    </header>
  );
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved on this device',
  saving: 'Saving…',
  error: 'Could not save — storage may be full',
};

export function SaveState() {
  const { saveStatus } = useStore();
  return <span className={`save-state ${saveStatus}`} role="status" aria-live="polite">{SAVE_LABEL[saveStatus]}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Choices<T extends string>({ options, value, onChange, labels }: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  labels?: Record<T, string>;
}) {
  return (
    <div className="choice-grid" role="group">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className="choice"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
          >
            {labels ? labels[o] : o}
          </button>
        );
      })}
    </div>
  );
}
