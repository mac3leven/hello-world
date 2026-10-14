import { useState } from 'react';
import { download } from '../lib/calendarExport';
import { uid } from '../lib/id';
import { DEFAULT_GET_READY } from '../lib/planner';
import { exportBackup, initialState, MEMBER_COLORS } from '../lib/store';
import type { AppState, FamilyMember, MemberRole } from '../lib/types';
import { Field } from './common';

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
}

export function MemberForm({ onAdd, count }: { onAdd: (m: FamilyMember) => void; count: number }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('child');
  const [age, setAge] = useState('');
  return (
    <form className="row tight member-form" onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) return;
      onAdd({ id: uid('m'), name: name.trim(), role, age: age ? Number(age) : undefined, color: MEMBER_COLORS[count % MEMBER_COLORS.length] });
      setName(''); setAge('');
    }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" />
      <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} aria-label="Role">
        <option value="child">Kid</option>
        <option value="parent">Grown-up</option>
      </select>
      <input type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" aria-label="Age" className="age-input" />
      <button className="btn primary" type="submit">Add</button>
    </form>
  );
}

export function Family({ state, update }: Props) {
  const [showKey, setShowKey] = useState(false);
  const setMember = (id: string, patch: Partial<FamilyMember>) =>
    update((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

  return (
    <div className="stack narrow">
      <section className="card">
        <h2>👨‍👩‍👦‍👦 Our family</h2>
        <ul className="list">
          {state.members.map((m) => (
            <li key={m.id} className="member-row">
              <input type="color" value={m.color} onChange={(e) => setMember(m.id, { color: e.target.value })} aria-label={`${m.name}'s color`} />
              <input value={m.name} onChange={(e) => setMember(m.id, { name: e.target.value })} aria-label="Name" />
              <span className="muted small">{m.role === 'child' ? `Kid${m.age !== undefined ? `, ${m.age}` : ''}` : 'Grown-up'}</span>
              <label className="small inline">
                Ready in
                <input type="number" min={0} max={120} value={m.getReadyMinutes ?? ''} placeholder={String(DEFAULT_GET_READY)}
                  onChange={(e) => setMember(m.id, { getReadyMinutes: e.target.value === '' ? undefined : Number(e.target.value) })} />
                min
              </label>
              <button className="icon-btn" aria-label={`Remove ${m.name}`}
                onClick={() => confirm(`Remove ${m.name}?`) && update((s) => ({ ...s, members: s.members.filter((x) => x.id !== m.id) }))}>✕</button>
            </li>
          ))}
        </ul>
        <MemberForm count={state.members.length} onAdd={(m) => update((s) => ({ ...s, members: [...s.members, m] }))} />
      </section>

      <section className="card">
        <h2>📍 Places we go</h2>
        <p className="small muted">Drive times from home. I add these when you answer questions about new places.</p>
        {state.places.length === 0 && <p className="muted small">None yet.</p>}
        <ul className="list">
          {state.places.map((p) => (
            <li key={p.id} className="member-row">
              <input value={p.name} aria-label="Place name"
                onChange={(e) => update((s) => ({ ...s, places: s.places.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))} />
              <label className="small inline">
                <input type="number" min={0} max={300} value={p.travelMinutes}
                  onChange={(e) => update((s) => ({ ...s, places: s.places.map((x) => (x.id === p.id ? { ...x, travelMinutes: Number(e.target.value) } : x)) }))} />
                min drive
              </label>
              <button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => update((s) => ({ ...s, places: s.places.filter((x) => x.id !== p.id) }))}>✕</button>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={() => update((s) => ({ ...s, places: [...s.places, { id: uid('pl'), name: 'New place', travelMinutes: 15 }] }))}>+ Add place</button>
      </section>

      <section className="card">
        <h2>⚙️ Settings</h2>
        <div className="row">
          <Field label="Cushion before arriving" hint="Parking, finding the field, bathroom stop">
            <select value={state.settings.bufferMinutes} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, bufferMinutes: Number(e.target.value) } }))}>
              {[0, 5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n} min</option>)}
            </select>
          </Field>
          <Field label="Remind me about to-dos at">
            <input type="time" value={state.settings.prepReminderTime} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, prepReminderTime: e.target.value || '19:00' } }))} />
          </Field>
        </div>
        <Field label="AI reader: Anthropic API key (optional)"
          hint="Lets the app read PDFs, photos, and messy documents. Stored only in this browser and sent only to Anthropic. Get one at console.anthropic.com.">
          <div className="row tight">
            <input type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={state.settings.apiKey ?? ''} placeholder="sk-ant-…"
              onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, apiKey: e.target.value.trim() || undefined } }))} />
            <button className="btn" type="button" onClick={() => setShowKey((v) => !v)}>{showKey ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
      </section>

      <section className="card">
        <h2>💾 Your data</h2>
        <p className="small muted">Everything lives on this device. Make a backup to move it to another device. Backups never include your API key.</p>
        <div className="row tight wrap">
          <button className="btn" onClick={() => download('family-huddle-backup.json', exportBackup(state), 'application/json')}>Download backup</button>
          <label className="btn">
            Restore backup
            <input type="file" hidden accept="application/json" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const data = JSON.parse(await f.text()) as AppState;
                if (!Array.isArray(data.events) || !Array.isArray(data.members)) throw new Error();
                update((s) => ({ ...initialState, ...data, settings: { ...initialState.settings, ...data.settings, apiKey: s.settings.apiKey } }));
              } catch {
                alert("That doesn't look like a Family Huddle backup.");
              }
            }} />
          </label>
          <button className="btn danger" onClick={() => confirm('Delete all events, family members, and settings on this device?') && update(() => initialState)}>Erase everything</button>
        </div>
      </section>
    </div>
  );
}
