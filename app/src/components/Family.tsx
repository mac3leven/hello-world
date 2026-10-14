import { useEffect, useState } from 'react';
import type { CloudInfo } from '../App';
import { createInvite, inviteLink, listAccounts, type FamilyAccount } from '../lib/cloud';
import { download } from '../lib/calendarExport';
import { uid } from '../lib/id';
import { DEFAULT_GET_READY } from '../lib/planner';
import { exportBackup, initialState, MEMBER_COLORS } from '../lib/store';
import type { AppState, FamilyMember, MemberRole } from '../lib/types';
import { Field } from './common';

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  cloud?: CloudInfo;
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

function SharedAccess({ cloud }: { cloud: CloudInfo }) {
  const [accounts, setAccounts] = useState<FamilyAccount[]>([]);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { listAccounts(cloud.family.id).then(setAccounts, (e: Error) => setError(e.message)); }, [cloud.family.id]);

  async function makeInvite() {
    setError(null);
    try {
      setInvite(await createInvite());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function share() {
    if (!invite) return;
    const url = inviteLink(invite.code);
    const text = `Join our family plan on Family Huddle. Invite code: ${invite.code}`;
    if (navigator.share) {
      await navigator.share({ title: 'Family Huddle invite', text, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
    }
  }

  return (
    <section className="card">
      <h2>🔐 Who can see our plan</h2>
      <ul className="list">
        {accounts.map((a) => (
          <li key={a.userId} className="member-row">
            <span>{a.email ?? 'Family member'}</span>
            <span className="muted small">{a.role === 'owner' ? 'Started the family' : 'Parent'}{a.email === cloud.email ? ' · you' : ''}</span>
          </li>
        ))}
      </ul>
      {invite ? (
        <div className="card info">
          <p className="small">Send this to your partner. It works once and expires {new Date(invite.expiresAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}.</p>
          <p className="invite-code">{invite.code}</p>
          <button className="btn primary" onClick={share}>{copied ? '✓ Copied' : 'Share invite'}</button>
        </div>
      ) : (
        <button className="btn primary" onClick={makeInvite}>+ Invite your partner</button>
      )}
      {error && <p className="card warn small" role="alert">{error}</p>}
      <p className="small muted">Signed in as {cloud.email}. <button className="link" onClick={cloud.signOut}>Sign out</button></p>
    </section>
  );
}

export function Family({ state, update, cloud }: Props) {
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

      {cloud && <SharedAccess cloud={cloud} />}

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
        {cloud ? (
          <p className="small muted">✨ The AI reader is on. It runs on your family's server, so there's no key to manage on this device.</p>
        ) : (
          <Field label="AI reader: Anthropic API key (optional)"
            hint="Lets the app read PDFs, photos, and messy documents. Stored only in this browser and sent only to Anthropic. Get one at console.anthropic.com.">
            <div className="row tight">
              <input type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={state.settings.apiKey ?? ''} placeholder="sk-ant-…"
                onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, apiKey: e.target.value.trim() || undefined } }))} />
              <button className="btn" type="button" onClick={() => setShowKey((v) => !v)}>{showKey ? 'Hide' : 'Show'}</button>
            </div>
          </Field>
        )}
      </section>

      <section className="card">
        <h2>💾 Your data</h2>
        <p className="small muted">
          {cloud
            ? 'Your plan is saved to your family space and synced to every signed-in device. A backup file is a handy extra copy.'
            : 'Everything lives on this device. Make a backup to move it to another device. Backups never include your API key.'}
        </p>
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
          <button className="btn danger" onClick={() => confirm(cloud ? 'Delete all events, people, and places for everyone in the family?' : 'Delete all events, family members, and settings on this device?') && update((s) => ({ ...initialState, onboarded: !!cloud, settings: { ...initialState.settings, apiKey: s.settings.apiKey } }))}>Erase everything</button>
        </div>
      </section>
    </div>
  );
}
