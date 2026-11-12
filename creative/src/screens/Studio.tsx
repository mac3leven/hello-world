// S5–S10 Studio: independent work. Nothing here is assigned, graded, or required by the Academy.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Empty, PageHeader, SaveState } from '../components/ui';
import { exerciseById, lessonById } from '../content/curriculum';
import { now, uid } from '../lib/id';
import { formatDate, formatDateTime, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL, wordCount } from '../lib/labels';
import { coachHref, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { addDraft, createProject, deleteProject, restoreRevision, revisionsFor, saveDraftText, saveSnapshot, SOURCE_LABEL } from '../lib/studio';
import type { AppState, ProjectStatus, ProjectType, StudioIdea, StudioProject } from '../lib/types';

const studioCrumb = { href: '#/studio', label: 'Studio' };
const isScript = (p?: StudioProject) => p?.type === 'script';

// ---------- Quick capture (used on Studio home and the inbox) ----------

export function QuickCapture({ compact }: { compact?: boolean }) {
  const { update } = useStore();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const save = () => {
    const t = text.trim();
    if (!t) return;
    update((s) => ({ ...s, ideas: [{ id: uid('idea'), text: t, tags: [], createdAt: now() }, ...s.ideas] }));
    setText('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); save(); }} data-space="studio">
      <label htmlFor="capture" className={compact ? 'sr-only' : ''} style={{ fontWeight: 650, display: 'block', marginBottom: 6 }}>Capture an idea</label>
      <textarea
        id="capture"
        placeholder="A line, an image, something overheard… (tip: your keyboard's microphone works for dictation)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
        style={{ minHeight: 70 }}
      />
      <div className="row between" style={{ marginTop: 8 }}>
        <span className="small muted" role="status">{saved ? '✓ Saved to your idea inbox' : 'Goes to your idea inbox. Sort it later.'}</span>
        <button className="btn primary" type="submit" disabled={!text.trim()}>Save idea</button>
      </div>
    </form>
  );
}

// ---------- S5 Studio home ----------

export function StudioHome() {
  const { state } = useStore();
  const active = state.projects.filter((p) => p.status !== 'finished').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const finished = state.projects.filter((p) => p.status === 'finished');
  const inbox = state.ideas.filter((i) => !i.projectId && !i.archivedAt);
  const recentDrafts = [...state.drafts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).filter((d) => d.text.trim()).slice(0, 4);

  return (
    <>
      <PageHeader space="studio" title="Studio" actions={<a className="btn primary" href="#/studio/new">New project</a>}>
        <p className="muted" style={{ margin: 0 }}>Your own ideas, projects, and drafts. Nothing here is assigned or graded.</p>
      </PageHeader>

      <QuickCapture />

      <div className="grid two" style={{ alignItems: 'start' }}>
        <section>
          <div className="section-head" style={{ marginTop: 12 }}><h2>Projects</h2></div>
          {active.length === 0 ? (
            <Empty>No projects yet. <a href="#/studio/new">Start one</a>, or turn an idea from your inbox into a project.</Empty>
          ) : active.map((p) => <ProjectCard key={p.id} p={p} />)}
          {finished.length > 0 && <p className="small muted">{finished.length} finished: {finished.map((p) => <a key={p.id} href={`#/studio/project/${p.id}`} style={{ marginRight: 8 }}>{p.title}</a>)}</p>}
        </section>
        <section>
          <div className="section-head" style={{ marginTop: 12 }}><h2>Idea inbox</h2><a className="small" href="#/studio/ideas">Open inbox ({inbox.length})</a></div>
          {inbox.length === 0 ? <Empty>Captured ideas land here.</Empty> : (
            <ul className="list card">
              {inbox.slice(0, 4).map((i) => <li key={i.id} className="writing" style={{ fontSize: '1rem' }}>{i.text}</li>)}
            </ul>
          )}
          {recentDrafts.length > 0 && (
            <>
              <div className="section-head"><h2>Recent drafts</h2></div>
              <ul className="list card">
                {recentDrafts.map((d) => {
                  const p = state.projects.find((x) => x.id === d.projectId);
                  return (
                    <li key={d.id}>
                      <a href={`#/studio/draft/${d.id}`}>{p?.title} · {d.title}</a>
                      <div className="small muted">{wordCount(d.text)} words · edited {formatDateTime(d.updatedAt)}</div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function ProjectCard({ p }: { p: StudioProject }) {
  const { state } = useStore();
  const drafts = state.drafts.filter((d) => d.projectId === p.id);
  const words = drafts.reduce((n, d) => n + wordCount(d.text), 0);
  return (
    <a className="card accent" href={`#/studio/project/${p.id}`} data-space="studio">
      <div className="row between">
        <span className="pill studio">{PROJECT_TYPE_LABEL[p.type]}</span>
        <span className="small muted">{PROJECT_STATUS_LABEL[p.status]}</span>
      </div>
      <h3 style={{ marginTop: 8 }}>{p.title}</h3>
      {p.intent && <p className="small muted" style={{ marginBottom: 6 }}>{p.intent}</p>}
      <div className="small">{drafts.length} draft{drafts.length === 1 ? '' : 's'} · {words} words · edited {formatDate(p.updatedAt)}</div>
    </a>
  );
}

// ---------- S6 Idea inbox ----------

function IdeaRow({ idea }: { idea: StudioIdea }) {
  const { state, update } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(idea.text);
  const [tag, setTag] = useState('');
  const set = (patch: Partial<StudioIdea>) => update((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === idea.id ? { ...i, ...patch } : i)) }));
  const project = idea.projectId ? state.projects.find((p) => p.id === idea.projectId) : undefined;
  const projects = state.projects.filter((p) => p.status !== 'finished');

  return (
    <li>
      {editing ? (
        <div className="stack">
          <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit idea" />
          <div className="row">
            <button className="btn small primary" onClick={() => { set({ text: text.trim() || idea.text }); setEditing(false); }}>Save</button>
            <button className="btn small" onClick={() => { setText(idea.text); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className="writing" style={{ fontSize: '1.02rem', marginBottom: 6 }}>{idea.text}</p>
      )}
      <div className="row small">
        <span className="muted">{formatDate(idea.createdAt)}</span>
        {idea.tags.map((t) => (
          <button key={t} className="pill" title="Remove tag" onClick={() => set({ tags: idea.tags.filter((x) => x !== t) })}>#{t} ×</button>
        ))}
        {project && <a className="pill studio" href={`#/studio/project/${project.id}`}>→ {project.title}</a>}
      </div>
      {!editing && (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn small" onClick={() => setEditing(true)}>Edit</button>
          <form className="row" onSubmit={(e) => { e.preventDefault(); const t = tag.trim().replace(/^#/, ''); if (t && !idea.tags.includes(t)) set({ tags: [...idea.tags, t] }); setTag(''); }}>
            <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ tag" aria-label="Add tag" style={{ width: 90, padding: '5px 8px' }} />
          </form>
          {!idea.archivedAt && projects.length > 0 && (
            <select aria-label="Attach to project" value={idea.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || undefined })} style={{ width: 'auto', padding: '5px 8px' }}>
              <option value="">{idea.projectId ? 'Detach from project' : 'Attach to project…'}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          {!idea.projectId && !idea.archivedAt && <a className="btn small" href={`#/studio/new?idea=${idea.id}`}>Make it a project</a>}
          {idea.archivedAt
            ? <button className="btn small" onClick={() => set({ archivedAt: undefined })}>Unarchive</button>
            : <button className="btn small ghost" onClick={() => set({ archivedAt: now() })}>Archive</button>}
        </div>
      )}
    </li>
  );
}

export function IdeaInbox() {
  const { state } = useStore();
  const [filter, setFilter] = useState<'inbox' | 'attached' | 'archived'>('inbox');
  const ideas = state.ideas.filter((i) =>
    filter === 'archived' ? i.archivedAt : filter === 'attached' ? i.projectId && !i.archivedAt : !i.projectId && !i.archivedAt);
  return (
    <>
      <PageHeader space="studio" title="Idea inbox" crumbs={[studioCrumb, { label: 'Ideas' }]} />
      <QuickCapture compact />
      <div className="row" style={{ margin: '8px 0 12px' }}>
        {(['inbox', 'attached', 'archived'] as const).map((f) => (
          <button key={f} className="choice" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'inbox' ? 'Unsorted' : f === 'attached' ? 'In a project' : 'Archived'}
          </button>
        ))}
      </div>
      {ideas.length ? <ul className="list card">{ideas.map((i) => <IdeaRow key={i.id} idea={i} />)}</ul> : <Empty>Nothing here.</Empty>}
    </>
  );
}

// ---------- S7 New project ----------

export function NewProject({ ideaId }: { ideaId?: string }) {
  const { state, update } = useStore();
  const idea = ideaId ? state.ideas.find((i) => i.id === ideaId) : undefined;
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ProjectType>('short_story');
  const [intent, setIntent] = useState(idea?.text ?? '');
  const [goal, setGoal] = useState('');

  const create = () => {
    const draftId = uid('draft');
    update((s) => createProject(s, { title, type, intent, goal, ideaId: idea?.id }, { draftId })[0]);
    navigate(`/studio/draft/${draftId}`, { replace: true });
  };

  return (
    <>
      <PageHeader space="studio" title="New project" crumbs={[studioCrumb, { label: 'New project' }]} />
      {idea && <div className="notice">Starting from your idea: “{idea.text}”. It will be attached to this project.</div>}
      <form className="card" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <label className="field">
          <span>Working title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled is fine" autoFocus />
        </label>
        <label className="field">
          <span>Kind of writing</span>
          <select value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
            {(Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]).map((t) => <option key={t} value={t}>{PROJECT_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>What's it about, or what are you after?</span>
          <small>Your intent in a sentence or two. The coach uses this to ask better questions — only when you ask it to.</small>
          <textarea value={intent} onChange={(e) => setIntent(e.target.value)} />
        </label>
        <label className="field">
          <span>Goal <span className="muted small">(optional)</span></span>
          <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. a finished 10-page draft" />
        </label>
        <div className="row">
          <button className="btn primary" type="submit">Create and start writing</button>
          <a className="btn" href="#/studio">Cancel</a>
        </div>
      </form>
    </>
  );
}

// ---------- S8 Project detail ----------

export function ProjectScreen({ projectId }: { projectId: string }) {
  const { state, update } = useStore();
  const p = state.projects.find((x) => x.id === projectId);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  if (!p) return <NotFound what="project" />;

  const drafts = state.drafts.filter((d) => d.projectId === p.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ideas = state.ideas.filter((i) => i.projectId === p.id);
  const links = state.links.filter((l) => l.projectId === p.id);
  const set = (patch: Partial<StudioProject>) =>
    update((s) => ({ ...s, projects: s.projects.map((x) => (x.id === p.id ? { ...x, ...patch, updatedAt: now() } : x)) }));

  return (
    <>
      <PageHeader space="studio" title={p.title} crumbs={[studioCrumb, { label: 'Project' }]} actions={<button className="btn small" onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit details'}</button>}>
        <div className="row">
          <span className="pill studio">{PROJECT_TYPE_LABEL[p.type]}</span>
          <label className="small row" style={{ gap: 4 }}>
            Status
            <select value={p.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })} style={{ width: 'auto', padding: '3px 8px' }}>
              {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((st) => <option key={st} value={st}>{PROJECT_STATUS_LABEL[st]}</option>)}
            </select>
          </label>
        </div>
      </PageHeader>

      {editing ? (
        <div className="card">
          <label className="field"><span>Title</span><input type="text" value={p.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="field"><span>Kind</span>
            <select value={p.type} onChange={(e) => set({ type: e.target.value as ProjectType })}>
              {(Object.keys(PROJECT_TYPE_LABEL) as ProjectType[]).map((t) => <option key={t} value={t}>{PROJECT_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="field"><span>Intent</span><textarea value={p.intent} onChange={(e) => set({ intent: e.target.value })} /></label>
          <label className="field"><span>Goal</span><input type="text" value={p.goal ?? ''} onChange={(e) => set({ goal: e.target.value })} /></label>
          <button className="btn danger" onClick={() => {
            if (!confirm(`Delete “${p.title}” and all its drafts and history? Attached ideas go back to your inbox. This can't be undone.`)) return;
            update((s) => deleteProject(s, p.id));
            navigate('/studio', { replace: true });
          }}>Delete project</button>
        </div>
      ) : (
        <div className="card soft">
          <div className="small muted">Intent</div>
          <p className="writing" style={{ margin: 0 }}>{p.intent || <span className="muted">Not written yet.</span>}</p>
          {p.goal && <p className="small" style={{ margin: '8px 0 0' }}><strong>Goal:</strong> {p.goal}</p>}
        </div>
      )}

      <div className="row">
        <a className="btn" style={{ color: 'var(--coach)' }} href={coachHref({ mode: 'mentor', ctx: 'project', id: p.id })}>💬 Talk it through (Mentor)</a>
        <a className="btn" style={{ color: 'var(--coach)' }} href={coachHref({ mode: 'partner', ctx: 'project', id: p.id })}>💬 Brainstorm (Creative Partner)</a>
      </div>

      <div className="grid two" style={{ alignItems: 'start', marginTop: 8 }}>
        <section>
          <div className="section-head">
            <h2>Drafts</h2>
            <button className="btn small" onClick={() => {
              const id = uid('draft');
              update((s) => addDraft(s, p.id, id)[0]);
              navigate(`/studio/draft/${id}`);
            }}>+ New draft</button>
          </div>
          {drafts.length === 0 ? <Empty>No drafts yet.</Empty> : (
            <ul className="list card">
              {drafts.map((d) => (
                <li key={d.id}>
                  <a href={`#/studio/draft/${d.id}`}><strong>{d.title}</strong></a>
                  <div className="small muted">{wordCount(d.text)} words · edited {formatDateTime(d.updatedAt)} · <a href={`#/studio/draft/${d.id}/history`}>history</a></div>
                </li>
              ))}
            </ul>
          )}

          {ideas.length > 0 && (
            <>
              <div className="section-head"><h2>Ideas</h2></div>
              <ul className="list card">{ideas.map((i) => <li key={i.id} className="writing" style={{ fontSize: '1rem' }}>{i.text}</li>)}</ul>
            </>
          )}
        </section>

        <section>
          <div className="section-head"><h2>Notes</h2></div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; set({ notes: [{ id: uid('note'), text: note.trim(), createdAt: now() }, ...p.notes] }); setNote(''); }}>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" aria-label="Add a note" style={{ flex: 1 }} />
            <button className="btn" type="submit" disabled={!note.trim()}>Add</button>
          </form>
          {p.notes.length > 0 && (
            <ul className="list card" style={{ marginTop: 10 }}>
              {p.notes.map((n) => (
                <li key={n.id} className="row between" style={{ alignItems: 'flex-start' }}>
                  <span style={{ flex: 1 }}>{n.text}<br /><span className="small muted">{formatDate(n.createdAt)}</span></span>
                  <button className="btn small ghost" aria-label="Delete note" onClick={() => set({ notes: p.notes.filter((x) => x.id !== n.id) })}>×</button>
                </li>
              ))}
            </ul>
          )}

          <div className="section-head"><h2>Related learning</h2></div>
          {links.length === 0 ? (
            <p className="small muted">You can link Academy lessons here from any feedback page. Links are references only — your exercises stay in the Academy.</p>
          ) : (
            <ul className="list card" data-space="academy">
              {links.map((l) => {
                const lesson = lessonById(l.lessonId);
                const ex = l.exerciseId ? exerciseById(l.exerciseId) : undefined;
                return (
                  <li key={l.id}>
                    <div className="row between">
                      <span className="pill academy">📖 Academy reference</span>
                      <button className="btn small ghost" onClick={() => update((s) => ({ ...s, links: s.links.filter((x) => x.id !== l.id) }))}>Remove link</button>
                    </div>
                    <div style={{ marginTop: 4 }}><a href={`#/academy/lesson/${l.lessonId}`}>{lesson?.title}</a>{ex && <> · <a href={l.attemptId ? `#/academy/attempt/${l.attemptId}` : `#/academy/exercise/${ex.id}`}>{ex.title}</a></>}</div>
                    {l.note && <p className="small" style={{ margin: '4px 0 0' }}>{l.note}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// ---------- S9 Draft editor ----------

export function DraftEditor({ draftId }: { draftId: string }) {
  const { state, update } = useStore();
  const draft = state.drafts.find((d) => d.id === draftId);
  const project = draft ? state.projects.find((p) => p.id === draft.projectId) : undefined;
  const [text, setText] = useState(draft?.text ?? '');
  const [snapNote, setSnapNote] = useState('');
  const [snapped, setSnapped] = useState(false);
  const lastSaved = useRef(draft?.text ?? '');

  // External changes (restore, accepted coach suggestion) flow back into the editor.
  useEffect(() => {
    if (draft && draft.text !== lastSaved.current) {
      lastSaved.current = draft.text;
      setText(draft.text);
    }
  }, [draft]);

  // Autosave with a short debounce; visible state comes from <SaveState />.
  useEffect(() => {
    if (!draft || text === lastSaved.current) return;
    const t = setTimeout(() => {
      lastSaved.current = text;
      update((s) => saveDraftText(s, draft.id, text));
    }, 500);
    return () => clearTimeout(t);
  }, [text, draft, update]);

  if (!draft || !project) return <NotFound what="draft" />;
  const revCount = revisionsFor(state, draft.id).length;
  const pending = text !== lastSaved.current;

  return (
    <>
      <PageHeader
        space="studio"
        title={project.title}
        crumbs={[studioCrumb, { href: `#/studio/project/${project.id}`, label: project.title }, { label: draft.title }]}
      />
      <div className="row between" style={{ marginBottom: 8 }}>
        <input
          type="text"
          aria-label="Draft title"
          value={draft.title}
          onChange={(e) => update((s) => ({ ...s, drafts: s.drafts.map((d) => (d.id === draft.id ? { ...d, title: e.target.value } : d)) }))}
          style={{ maxWidth: 280, fontWeight: 650 }}
        />
        <div className="row">
          {pending ? <span className="save-state saving">Typing…</span> : <SaveState />}
        </div>
      </div>

      <div className="card" style={{ padding: '12px 20px' }}>
        <textarea
          className={`editor ${isScript(project) ? 'script' : 'writing'}`}
          aria-label="Draft text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isScript(project) ? 'INT. LOCATION – DAY\n\nStart with what we see…' : 'Start writing…'}
          spellCheck
        />
      </div>

      <div className="row between">
        <span className="small muted">{wordCount(text)} words · {revCount} saved version{revCount === 1 ? '' : 's'}</span>
        <a className="small" href={`#/studio/draft/${draft.id}/history`}>Revision history →</a>
      </div>

      <div className="grid two" style={{ marginTop: 14 }}>
        <form className="card" onSubmit={(e) => { e.preventDefault(); update((s) => saveSnapshot(saveDraftText(s, draft.id, text), draft.id, snapNote)); lastSaved.current = text; setSnapNote(''); setSnapped(true); setTimeout(() => setSnapped(false), 2000); }}>
          <h3>Save a version</h3>
          <p className="small muted">Autosave keeps your latest text and takes a snapshot every 10 minutes. Save a named version at milestones.</p>
          <div className="row">
            <input type="text" value={snapNote} onChange={(e) => setSnapNote(e.target.value)} placeholder="Optional note, e.g. 'new ending'" aria-label="Version note" style={{ flex: 1 }} />
            <button className="btn" type="submit">{snapped ? '✓ Saved' : 'Save version'}</button>
          </div>
        </form>
        <div className="card" data-space="coach">
          <h3>Ask the coach about this draft</h3>
          <p className="small muted">The coach sees this draft only when you open it from here, and the conversation shows that. Suggestions never change your draft unless you accept them.</p>
          <div className="row">
            <a className="btn" href={coachHref({ mode: 'editor', ctx: 'draft', id: draft.id })}>Editor</a>
            <a className="btn" href={coachHref({ mode: 'mentor', ctx: 'draft', id: draft.id })}>Mentor</a>
            <a className="btn" href={coachHref({ mode: 'partner', ctx: 'draft', id: draft.id })}>Partner</a>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- S10 Revision history ----------

export function RevisionHistory({ draftId }: { draftId: string }) {
  const { state, update } = useStore();
  const draft = state.drafts.find((d) => d.id === draftId);
  const project = draft ? state.projects.find((p) => p.id === draft.projectId) : undefined;
  const revisions = useMemo(() => (draft ? revisionsFor(state, draft.id) : []), [state, draft]);
  const [selected, setSelected] = useState<string | undefined>(revisions[0]?.id);
  const [restored, setRestored] = useState(false);
  if (!draft || !project) return <NotFound what="draft" />;
  const rev = revisions.find((r) => r.id === selected);

  return (
    <>
      <PageHeader
        space="studio"
        title="Revision history"
        crumbs={[studioCrumb, { href: `#/studio/project/${project.id}`, label: project.title }, { href: `#/studio/draft/${draft.id}`, label: draft.title }, { label: 'History' }]}
      >
        <p className="small muted" style={{ margin: 0 }}>Restoring never overwrites: your current text is saved as a version first, then the older one becomes the newest version.</p>
      </PageHeader>
      {restored && <div className="notice" role="status">Restored. Your previous text is kept in this list. <a href={`#/studio/draft/${draft.id}`}>Back to the draft</a></div>}

      {revisions.length === 0 ? <Empty>No saved versions yet. They appear as you write, or when you save a version.</Empty> : (
        <div className="grid history-grid">
          <ul className="list card" style={{ padding: '4px 12px', alignSelf: 'start' }}>
            {revisions.map((r) => (
              <li key={r.id}>
                <button className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', background: r.id === selected ? 'var(--surface-2)' : undefined, display: 'block' }} onClick={() => setSelected(r.id)} aria-pressed={r.id === selected}>
                  <div>{formatDateTime(r.createdAt)}</div>
                  <div className="small muted" style={{ fontWeight: 400 }}>{SOURCE_LABEL[r.source]} · {wordCount(r.text)} words</div>
                  {r.note && <div className="small" style={{ fontWeight: 400 }}>{r.note}</div>}
                </button>
              </li>
            ))}
          </ul>
          {rev && (
            <div>
              <div className="diff">
                <div><div className="small muted">Selected version</div><div className="col"><pre className={isScript(project) ? 'script' : ''}>{rev.text}</pre></div></div>
                <div><div className="small muted">Current draft</div><div className="col"><pre className={isScript(project) ? 'script' : ''}>{draft.text}</pre></div></div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn primary" disabled={rev.text === draft.text} onClick={() => { update((s: AppState) => restoreRevision(s, rev.id)); setRestored(true); }}>
                  Restore as new version
                </button>
                {rev.text === draft.text && <span className="small muted">This is the same as your current draft.</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <>
      <PageHeader space="studio" title={`That ${what} wasn't found`} crumbs={[studioCrumb]} />
      <a className="btn" href="#/studio">Back to the Studio</a>
    </>
  );
}
