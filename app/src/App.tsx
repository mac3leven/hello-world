import { useState } from 'react';
import { AddStuff } from './components/AddStuff';
import { EventEditor, newEvent } from './components/EventEditor';
import { Family } from './components/Family';
import { Home } from './components/Home';
import { Onboarding } from './components/Onboarding';
import { Timeline } from './components/Timeline';
import type { Family as FamilyInfo } from './lib/cloud';
import type { SyncStatus } from './lib/useCloudState';
import type { AppState, FamilyEvent } from './lib/types';

export interface CloudInfo {
  family: FamilyInfo;
  email: string;
  status: SyncStatus;
  signOut: () => void;
}

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  /** Present in cloud mode (shared family space). */
  cloud?: CloudInfo;
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  loading: 'Syncing…',
  saving: 'Saving…',
  saved: '✓ Synced',
  offline: '⚠︎ Offline, will retry',
};

type Tab = 'home' | 'add' | 'plan' | 'family';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'add', icon: '➕', label: 'Add' },
  { id: 'plan', icon: '📊', label: 'Plan' },
  { id: 'family', icon: '👨‍👩‍👦‍👦', label: 'Family' },
];

export default function App({ state, update, cloud }: Props) {
  const [tab, setTab] = useState<Tab>('home');
  const [editing, setEditing] = useState<FamilyEvent | null>(null);

  if (!state.onboarded) {
    if (cloud?.status === 'loading') return <main className="page"><p className="muted center">Loading your family…</p></main>;
    return <main className="page"><Onboarding state={state} update={update} cloud={!!cloud} /></main>;
  }

  const isNew = editing && !state.events.some((e) => e.id === editing.id);

  return (
    <>
      <header className="topbar">
        <span className="brand">
          🏡 {cloud?.family.name ?? 'Family Huddle'}
          {cloud && <span className={`sync sync-${cloud.status}`} role="status">{STATUS_LABEL[cloud.status]}</span>}
        </span>
        <button className="btn primary" onClick={() => setEditing(newEvent())}>+ Event</button>
      </header>

      <main className="page">
        {tab === 'home' && (
          <Home
            state={state}
            onAdd={() => setTab('add')}
            onEdit={setEditing}
            onTogglePrep={(eventId, prepId) => update((s) => ({
              ...s,
              events: s.events.map((e) => e.id !== eventId ? e : { ...e, prep: e.prep.map((p) => (p.id === prepId ? { ...p, done: !p.done } : p)) }),
            }))}
          />
        )}
        {tab === 'add' && <AddStuff state={state} update={update} cloud={!!cloud} onDone={() => setTab('home')} />}
        {tab === 'plan' && <Timeline state={state} onEdit={setEditing} />}
        {tab === 'family' && <Family state={state} update={update} cloud={cloud} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {editing && (
        <EventEditor
          key={editing.id}
          state={state}
          event={editing}
          onClose={() => setEditing(null)}
          onSave={(e) => {
            update((s) => ({ ...s, events: isNew ? [...s.events, e] : s.events.map((x) => (x.id === e.id ? e : x)) }));
            setEditing(null);
          }}
          onDelete={isNew ? undefined : () => {
            update((s) => ({ ...s, events: s.events.filter((x) => x.id !== editing.id) }));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
