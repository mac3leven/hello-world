import { useRef, useState } from 'react';
import { fileToDocument, type DocumentInput } from '../lib/documents';
import { toDate, formatDay } from '../lib/dates';
import { normalizePlace, uid } from '../lib/id';
import { matchMembers, questionsFor, type Question } from '../lib/questions';
import { parseText } from '../lib/simpleParser';
import type { AppState, DraftEvent, FamilyEvent } from '../lib/types';
import { CATEGORY_LABEL, Field, MemberPicker } from './common';

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  /** Cloud mode: the AI reader runs on the family's server, no key needed on this device. */
  cloud: boolean;
  onDone: () => void;
}

type Row = DraftEvent & { include: boolean; memberIds: string[] };

export function AddStuff({ state, update, cloud, onDone }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [source, setSource] = useState('');
  const [travel, setTravel] = useState<Record<string, number>>({});
  const [ready, setReady] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const hasKey = cloud || !!state.settings.apiKey;
  const needsAi = !!file && file.type !== 'text/plain' && !file.name.endsWith('.txt');

  async function read() {
    setError(null);
    setBusy(true);
    // The local AI reader (and the Anthropic SDK) only loads when it's needed.
    let ai: typeof import('../lib/aiLocal') | undefined;
    try {
      const doc: DocumentInput | null = file ? await fileToDocument(file) : text.trim() ? { kind: 'text', name: 'Pasted text', text } : null;
      if (!doc) return;
      let drafts: DraftEvent[];
      if (cloud) {
        const { extractCloud } = await import('../lib/cloud');
        drafts = await extractCloud(doc);
      } else if (hasKey) {
        ai = await import('../lib/aiLocal');
        drafts = await ai.extractLocal(state.settings.apiKey!, doc, state.members);
      } else if (doc.kind === 'text') {
        drafts = parseText(doc.text);
      } else {
        throw new Error('Reading PDFs and photos needs the AI reader. Add an API key under Family → Settings, or paste the text instead.');
      }
      if (!drafts.length) throw new Error("I couldn't find any dates in that. Try another document, or add the event by hand.");
      setSource(doc.name);
      setRows(drafts.map((d) => ({ ...d, include: true, memberIds: matchMembers([...d.who, d.title], state.members) })));
    } catch (err) {
      setError(ai ? ai.friendlyError(err) : err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  if (!rows) {
    return (
      <div className="stack narrow">
        <h2>Add a schedule</h2>
        <p className="muted">
          Upload a school newsletter, sports schedule, or party invite, or just paste the text. I'll find the dates, and
          you check them before anything is saved.
        </p>

        <button className="card drop" onClick={() => fileRef.current?.click()} type="button">
          <span className="drop-icon" aria-hidden>📄</span>
          {file ? <strong>{file.name}</strong> : <span><strong>Choose a file</strong> or take a photo</span>}
          <span className="small muted">PDF, photo, or text file</span>
        </button>
        <input ref={fileRef} type="file" hidden accept="application/pdf,image/*,.txt,text/plain"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setText(''); }} />

        <div className="or"><span>or paste text</span></div>
        <textarea rows={7} value={text} placeholder={'Oct 24 - Picture Day, wear school colors\n10/26 6:00 PM Soccer vs Tigers @ Riverside Park\nNov 3 No school - teacher planning day'}
          onChange={(e) => { setText(e.target.value); setFile(null); }} />

        {needsAi && !hasKey && (
          <p className="card info small">
            🔑 Reading PDFs and photos uses AI. Add an Anthropic API key under <strong>Family → Settings</strong> to turn it on.
          </p>
        )}
        {error && <p className="card warn small" role="alert">{error}</p>}

        <button className="btn primary big" disabled={busy || (!file && !text.trim())} onClick={read}>
          {busy ? 'Reading… (this can take a minute)' : hasKey ? '✨ Read it with AI' : 'Find the dates'}
        </button>
        {hasKey && (
          <p className="small muted">
            {cloud ? "The document is sent to your family's server and read by Claude. It isn't stored." : 'The document is sent to Anthropic to be read. Nothing else leaves this device.'}
          </p>
        )}
      </div>
    );
  }

  const included = rows.filter((r) => r.include);
  const assigned = Object.fromEntries(rows.map((r, i) => [i, r.memberIds]));
  const draftsForQuestions = rows.map((r) => (r.include ? r : { ...r, location: undefined, startTime: undefined, category: 'other' as const }));
  const questions = questionsFor(state, draftsForQuestions, assigned).filter((q) => q.kind !== 'who' || rows[q.draftIndex].include);

  function save() {
    update((s) => {
      const members = s.members.map((m) => (ready[m.id] !== undefined ? { ...m, getReadyMinutes: ready[m.id] } : m));
      const places = [...s.places];
      for (const [key, minutes] of Object.entries(travel)) {
        const name = rows!.find((r) => r.location && normalizePlace(r.location) === key)?.location ?? key;
        places.push({ id: uid('pl'), name, travelMinutes: minutes });
      }
      const events: FamilyEvent[] = included.map((r) => ({
        id: uid('e'),
        title: r.title,
        date: r.date,
        startTime: r.startTime,
        endTime: r.endTime,
        location: r.location,
        category: r.category,
        memberIds: r.memberIds,
        driverId: s.members.find((m) => m.role === 'parent')?.id,
        notes: r.notes,
        prep: r.prep.map((p) => ({ id: uid('p'), text: p.text, daysBefore: p.daysBefore })),
        source,
      }));
      return { ...s, members, places, events: [...s.events, ...events] };
    });
    onDone();
  }

  return (
    <div className="stack narrow">
      <div className="section-head">
        <h2>I found {rows.length} {rows.length === 1 ? 'thing' : 'things'}</h2>
        <button className="btn" onClick={() => setRows(null)}>← Start over</button>
      </div>
      <p className="muted">Uncheck anything you don't need and fix anything I got wrong.</p>

      {questions.length > 0 && (
        <section className="card questions">
          <h3>💬 A few quick questions</h3>
          <p className="small muted">These help me work out when you need to leave. I'll remember the answers.</p>
          {questions.map((q) => (
            <QuestionView key={q.key} q={q} rows={rows} state={state} setRow={setRow}
              travel={travel} setTravel={setTravel} ready={ready} setReady={setReady} />
          ))}
        </section>
      )}

      <ul className="review">
        {rows.map((r, i) => (
          <li key={i} className={`card review-row${r.include ? '' : ' off'}`}>
            <label className="review-check">
              <input type="checkbox" checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} />
              <span className="sr-only">Include</span>
            </label>
            <div className="review-body">
              <input className="title-input" value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} aria-label="Title" />
              <div className="small muted">
                {formatDay(toDate(r.date))} · {CATEGORY_LABEL[r.category]}
                {r.location ? ` · 📍 ${r.location}` : ''}
              </div>
              <div className="row tight">
                <input type="date" value={r.date} onChange={(e) => setRow(i, { date: e.target.value })} aria-label="Date" />
                <input type="time" value={r.startTime ?? ''} onChange={(e) => setRow(i, { startTime: e.target.value || undefined })} aria-label="Start time" />
                <input type="time" value={r.endTime ?? ''} onChange={(e) => setRow(i, { endTime: e.target.value || undefined })} aria-label="End time" />
              </div>
              {state.members.length > 0 && <MemberPicker members={state.members} value={r.memberIds} onChange={(v) => setRow(i, { memberIds: v })} />}
              {r.prep.length > 0 && <div className="small">🎒 {r.prep.map((p) => p.text).join(' · ')}</div>}
              {r.notes && <div className="small muted">{r.notes}</div>}
            </div>
          </li>
        ))}
      </ul>

      <button className="btn primary big" disabled={!included.length} onClick={save}>
        Add {included.length} to our plan
      </button>
    </div>
  );
}

interface QProps {
  q: Question;
  rows: Row[];
  state: AppState;
  setRow: (i: number, patch: Partial<Row>) => void;
  travel: Record<string, number>;
  setTravel: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ready: Record<string, number>;
  setReady: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

function QuestionView({ q, rows, state, setRow, travel, setTravel, ready, setReady }: QProps) {
  switch (q.kind) {
    case 'travel': {
      const key = q.key.slice('travel:'.length);
      return (
        <Field label={q.prompt}>
          <Options options={q.options} value={travel[key]} onPick={(n) => setTravel((t) => ({ ...t, [key]: n }))} />
        </Field>
      );
    }
    case 'get-ready':
      return (
        <Field label={q.prompt}>
          <Options options={q.options} value={ready[q.memberId]} onPick={(n) => setReady((r) => ({ ...r, [q.memberId]: n }))} />
        </Field>
      );
    case 'who':
      return (
        <Field label={q.prompt}>
          <MemberPicker members={state.members} value={rows[q.draftIndex].memberIds} onChange={(v) => setRow(q.draftIndex, { memberIds: v })} />
        </Field>
      );
    case 'start-time':
      return (
        <Field label={q.prompt}>
          <input type="time" value={rows[q.draftIndex].startTime ?? ''} onChange={(e) => setRow(q.draftIndex, { startTime: e.target.value || undefined })} />
        </Field>
      );
  }
}

function Options({ options, value, onPick }: { options: number[]; value?: number; onPick: (n: number) => void }) {
  return (
    <div className="picker">
      {options.map((n) => (
        <button key={n} type="button" aria-pressed={value === n} className={`chip chip-toggle${value === n ? ' on' : ''}`} onClick={() => onPick(n)}>
          {n < 60 ? `${n} min` : `${n / 60} hr`}
        </button>
      ))}
    </div>
  );
}
