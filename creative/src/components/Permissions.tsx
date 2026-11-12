import type { ContextPermissions } from '../lib/types';

const ROWS: { key: keyof ContextPermissions; title: string; body: string }[] = [
  {
    key: 'academyHistory',
    title: 'Use my Academy practice',
    body: 'The coach can look at your past exercises and feedback to suggest what to practise next.',
  },
  {
    key: 'profile',
    title: 'Use my Creative Profile',
    body: 'The coach can use your goals, preferences, and the strengths you and it have noted.',
  },
  {
    key: 'studioForPersonalization',
    title: 'Learn from my Studio work',
    body: 'Off by default. When on, the coach may look across your Studio drafts to personalise lessons and profile notes. When off, it only sees a draft you open it on, and says so.',
  },
];

export function PermissionToggles({ value, onChange }: { value: ContextPermissions; onChange: (v: ContextPermissions) => void }) {
  return (
    <div>
      {ROWS.map((r) => (
        <label key={r.key} className="toggle">
          <input type="checkbox" checked={value[r.key]} onChange={(e) => onChange({ ...value, [r.key]: e.target.checked })} />
          <span>
            <strong>{r.title}</strong>
            <br />
            <span className="small muted">{r.body}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
