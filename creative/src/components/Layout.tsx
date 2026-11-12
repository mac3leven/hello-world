import type { ReactNode } from 'react';
import { coachHref, type Route } from '../lib/router';
import { useStore } from '../lib/store';
import type { Space } from './ui';

const NAV: { href: string; label: string; icon: string; match: (r: Route) => boolean; space: Space }[] = [
  { href: '#/', label: 'Home', icon: '🏠', space: 'neutral', match: (r) => r.name === 'home' || r.name === 'progress' },
  { href: '#/academy', label: 'Academy', icon: '📖', space: 'academy', match: (r) => ['academy', 'path', 'lesson', 'exercise', 'feedback'].includes(r.name) },
  { href: '#/studio', label: 'Studio', icon: '✍️', space: 'studio', match: (r) => ['studio', 'ideas', 'new-project', 'project', 'draft', 'history'].includes(r.name) },
  { href: '#/profile', label: 'Profile', icon: '👤', space: 'profile', match: (r) => r.name === 'profile' || r.name === 'evidence' },
];

export function spaceForRoute(r: Route): Space {
  if (r.name === 'coach') return 'coach';
  return NAV.find((n) => n.match(r))?.space ?? 'neutral';
}

/** Desktop: persistent left rail. Mobile: bottom tabs + a Coach button on every workspace (PRD §10). */
export function Layout({ route, children, wide }: { route: Route; children: ReactNode; wide?: boolean }) {
  const space = spaceForRoute(route);
  const { externalChange } = useStore();
  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <a className="brand" href="#/">✍️ Creative Development</a>
        {NAV.map((n) => (
          <a key={n.href} className="nav" href={n.href} aria-current={n.match(route) ? 'page' : undefined}>
            <span className="nav-dot" style={{ background: n.space === 'neutral' ? undefined : `var(--${n.space})` }} />
            {n.label === 'Profile' ? 'Creative Profile' : n.label}
          </a>
        ))}
        <a className="nav" href={coachHref()} aria-current={route.name === 'coach' ? 'page' : undefined}>
          <span className="nav-dot" style={{ background: 'var(--coach)' }} />
          Coach
        </a>
        <a className="nav" href="#/progress" aria-current={route.name === 'progress' ? 'page' : undefined}>
          <span className="nav-dot" />
          Progress
        </a>
        <div className="grow" />
        <a className="nav" href="#/settings" aria-current={route.name === 'settings' ? 'page' : undefined}>
          <span className="nav-dot" />
          Settings &amp; privacy
        </a>
      </nav>

      <div data-space={space}>
        <div className="mobile-top">
          <a className="brand" href="#/">✍️ Creative</a>
          <a className="btn ghost small" href="#/settings" aria-label="Settings and privacy">⚙︎ Settings</a>
        </div>
        <main className={`content${wide ? ' wide' : ''}`}>
          {externalChange && (
            <div className="notice row between" role="alert">
              <span>This app was changed in another tab or window. Reload to see the latest — edits made here before reloading may replace them.</span>
              <button className="btn small" onClick={() => location.reload()}>Reload</button>
            </div>
          )}
          {children}
        </main>
      </div>

      {route.name !== 'coach' && <a className="coach-fab" href={coachHref()}>💬 Coach</a>}

      <nav className="tabbar" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} aria-current={n.match(route) ? 'page' : undefined}>
            <span className="icon" aria-hidden>{n.icon}</span>
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
