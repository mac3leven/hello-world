// G1 Settings & privacy: context permissions, export, delete (PRD §9).

import { useRef, useState } from 'react';
import { PermissionToggles } from '../components/Permissions';
import { PageHeader } from '../components/ui';
import { now } from '../lib/id';
import { navigate } from '../lib/router';
import { withSampleWork } from '../lib/seed';
import { emptyState, exportJson, normalize, useStore } from '../lib/store';

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const isSample = (s: string) => s.startsWith('[Sample]');

export function SettingsScreen() {
  const { state, update, replace } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState('');
  const hasSample = state.projects.some((p) => isSample(p.title)) || state.ideas.some((i) => isSample(i.text));

  const importFile = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      const data = normalize(parsed.data ?? parsed);
      if (!confirm('Replace everything in this browser with the imported file?')) return;
      replace(data);
      setMessage('Imported. Your data has been replaced with the file contents.');
    } catch {
      setMessage("That file couldn't be read. Choose a file exported from this app.");
    }
  };

  const removeSample = () => update((s) => {
    const projectIds = new Set(s.projects.filter((p) => isSample(p.title)).map((p) => p.id));
    const draftIds = new Set(s.drafts.filter((d) => projectIds.has(d.projectId)).map((d) => d.id));
    return {
      ...s,
      projects: s.projects.filter((p) => !projectIds.has(p.id)),
      drafts: s.drafts.filter((d) => !draftIds.has(d.id)),
      revisions: s.revisions.filter((r) => !draftIds.has(r.draftId)),
      ideas: s.ideas.filter((i) => !isSample(i.text)),
      links: s.links.filter((l) => !projectIds.has(l.projectId)),
    };
  });

  return (
    <>
      <PageHeader space="neutral" title="Settings & privacy" />
      {message && <div className="notice" role="status">{message}</div>}

      <h2 className="section">Your name</h2>
      <div className="card">
        <input type="text" aria-label="Your name" value={state.user.name} onChange={(e) => update((s) => ({ ...s, user: { ...s.user, name: e.target.value } }))} />
      </div>

      <h2 className="section">What the coach may use</h2>
      <div className="card">
        <PermissionToggles
          value={state.profile.permissions}
          onChange={(permissions) => update((s) => ({ ...s, profile: { ...s.profile, permissions, updatedAt: now() } }))}
        />
      </div>
      <p className="small muted">
        Your work is never used to train AI models. The coach in this version is a <strong>sample coach</strong>:
        it runs entirely in your browser and sends nothing anywhere.
      </p>

      <h2 className="section">Where your data lives</h2>
      <div className="card">
        <p>Everything is saved in this browser on this device. There's no account or cloud copy yet, so another device won't see it.
          Export a file to keep a backup or move your work.</p>
        <div className="row">
          <button className="btn primary" onClick={() => download(`creative-development-${now().slice(0, 10)}.json`, exportJson(state))}>Export everything (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import from file…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
        </div>
      </div>

      <h2 className="section">Sample work</h2>
      <div className="card row between">
        <span className="small">A sample script project and ideas, marked [Sample], for trying out the Studio.</span>
        {hasSample
          ? <button className="btn" onClick={removeSample}>Remove sample work</button>
          : <button className="btn" onClick={() => update(withSampleWork)}>Add sample work</button>}
      </div>

      <h2 className="section">Reminders</h2>
      <div className="card small muted">Not available yet. When added, reminders will be opt-in and never guilt-based.</div>

      <h2 className="section">Forget and delete</h2>
      <div className="card stack">
        <div className="row between">
          <span>Forget all coach conversations <span className="small muted">({state.conversations.length})</span></span>
          <button className="btn danger" disabled={!state.conversations.length}
            onClick={() => { if (confirm('Delete all coach conversations? Your drafts and profile stay.')) update((s) => ({ ...s, conversations: [] })); }}>
            Forget conversations
          </button>
        </div>
        <div className="row between">
          <span>Forget everything the coach has noticed <span className="small muted">({state.observations.filter((o) => o.kind === 'inferred').length})</span></span>
          <button className="btn danger" disabled={!state.observations.some((o) => o.kind === 'inferred')}
            onClick={() => { if (confirm('Remove all coach observations from your profile? What you told us stays.')) update((s) => ({ ...s, observations: s.observations.filter((o) => o.kind !== 'inferred') })); }}>
            Forget observations
          </button>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
        <div>
          <strong>Delete all my data</strong>
          <p className="small muted">Removes your profile, Academy practice, Studio projects and drafts, and coach history from this browser immediately.
            Nothing is kept anywhere else. Export first if you want a copy.</p>
          <label className="field">
            <span className="small">Type DELETE to confirm</span>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </label>
          <button className="btn danger" disabled={confirmText !== 'DELETE'} onClick={() => { replace(emptyState()); setConfirmText(''); navigate('/welcome', { replace: true }); }}>
            Delete everything
          </button>
        </div>
      </div>
    </>
  );
}
