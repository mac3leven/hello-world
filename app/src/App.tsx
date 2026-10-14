import { useState } from 'react';
import { AddStuff } from './components/AddStuff';
import { EventEditor, newEvent } from './components/EventEditor';
import { Family } from './components/Family';
import { Home } from './components/Home';
import { Onboarding } from './components/Onboarding';
import { Timeline } from './components/Timeline';
import { useAppState } from './lib/store';
import type { FamilyEvent } from './lib/types';

type Tab = 'home' | 'add' | 'plan' | 'family';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'add', icon: '➕', label: 'Add' },
  { id: 'plan', icon: '📊', label: 'Plan' },
  { id: 'family', icon: '👨‍👩‍👦‍👦', label: 'Family' },
];

export default function App() {
  const [state, update] = useAppState();
  const [tab, setTab] = useState<Tab>('home');
  const [editing, setEditing] = useState<FamilyEvent | null>(null);

  if (!state.onboarded) {
    return <main className="page"><Onboarding state={state} update={update} /></main>;
  }

  const isNew = editing && !state.events.some((e) => e.id === editing.id);

  return (
    <>
      <header className="topbar">
        <span className="brand">🏡 Family Huddle</span>
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
        {tab === 'add' && <AddStuff state={state} update={update} onDone={() => setTab('home')} />}
        {tab === 'plan' && <Timeline state={state} onEdit={setEditing} />}
        {tab === 'family' && <Family state={state} update={update} />}
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
