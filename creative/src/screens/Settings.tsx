// G1 Settings & privacy: context permissions, export, delete (PRD §9).

import { useRef, useState } from 'react';
import { PermissionToggles } from '../components/Permissions';
import { ConfirmButton, PageHeader } from '../components/ui';
import { now } from '../lib/id';
import { navigate } from '../lib/router';
import { withSampleWork } from '../lib/seed';
import { emptyState, exportJson, normalize, useStore } from '../lib/store';
import type { AppState } from '../lib/types';

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
  const [exportText, setExportText] = useState('');
  const [pasted, setPasted] = useState('');
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const hasSample = state.projects.some((p) => isSample(p.title)) || state.ideas.some((i) => isSample(i.text));

  const readImport = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      setPendingImport(normalize(parsed.data ?? parsed));
      setMessage('');
    } catch {
      setMessage("That couldn't be read. Use the text or file exported from this app.");
    }
  };

  const showExport = () => setExportText(exportJson(state));
  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setMessage('Copied. Paste it somewhere safe, like a note or an email to yourself.');
    } catch {
      (document.getElementById('export-text') as HTMLTextAreaElement | null)?.select();
      setMessage('Copying was blocked here. The text is selected — copy it with your keyboard or long-press.');
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
          Export to keep a backup or move your work.</p>
        <div className="row">
          <button className="btn primary" onClick={showExport}>Export everything</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import from file…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(readImport); e.target.value = ''; }} />
        </div>
        {exportText && (
          <div className="stack" style={{ marginTop: 12 }}>
            <textarea id="export-text" readOnly value={exportText} style={{ minHeight: 120, fontFamily: 'var(--mono)', fontSize: '.8rem' }} aria-label="Exported data" />
            <div className="row">
              <button className="btn primary" onClick={() => void copyExport()}>Copy to clipboard</button>
              <button className="btn" onClick={() => download(`creative-development-${now().slice(0, 10)}.json`, exportText)}>Download file</button>
              <span className="small muted">Downloads may be blocked when the app is opened inside claude.ai — copying always works.</span>
            </div>
          </div>
        )}
        <details style={{ marginTop: 12 }}>
          <summary className="small">Import by pasting exported text</summary>
          <textarea id="import-text" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste exported text here" style={{ marginTop: 8, minHeight: 90, fontFamily: 'var(--mono)', fontSize: '.8rem' }} />
          <button className="btn" style={{ marginTop: 8 }} disabled={!pasted.trim()} onClick={() => readImport(pasted)}>Check and import</button>
        </details>
        {pendingImport && (
          <div className="notice" role="alert" style={{ marginTop: 12 }}>
            <p style={{ marginTop: 0 }}>
              Ready to import: {pendingImport.projects.length} projects, {pendingImport.drafts.length} drafts, {pendingImport.attempts.length} practice attempts, {pendingImport.ideas.length} ideas.
              This <strong>replaces</strong> everything currently in this browser.
            </p>
            <div className="row">
              <button className="btn danger" onClick={() => { replace(pendingImport); setPendingImport(null); setPasted(''); setMessage('Imported. Your data now matches the file.'); }}>Replace with imported data</button>
              <button className="btn" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        )}
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
          <ConfirmButton disabled={!state.conversations.length} question="Delete all coach conversations? Your drafts and profile stay." confirmLabel="Forget all"
            onConfirm={() => update((s) => ({ ...s, conversations: [] }))}>
            Forget conversations
          </ConfirmButton>
        </div>
        <div className="row between">
          <span>Forget everything the coach has noticed <span className="small muted">({state.observations.filter((o) => o.kind === 'inferred').length})</span></span>
          <ConfirmButton disabled={!state.observations.some((o) => o.kind === 'inferred')} question="Remove all coach observations? What you told us stays." confirmLabel="Forget all"
            onConfirm={() => update((s) => ({ ...s, observations: s.observations.filter((o) => o.kind !== 'inferred') }))}>
            Forget observations
          </ConfirmButton>
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
