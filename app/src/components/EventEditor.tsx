import { useState } from 'react';
import { uid } from '../lib/id';
import { isoDate } from '../lib/dates';
import { googleCalendarUrl } from '../lib/calendarExport';
import type { AppState, EventCategory, FamilyEvent } from '../lib/types';
import { CATEGORY_LABEL, Field, MemberPicker } from './common';

export function newEvent(): FamilyEvent {
  return { id: uid('e'), title: '', date: isoDate(new Date()), category: 'other', memberIds: [], prep: [] };
}

interface Props {
  state: AppState;
  event: FamilyEvent;
  onSave: (e: FamilyEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function EventEditor({ state, event, onSave, onDelete, onClose }: Props) {
  const [e, setE] = useState<FamilyEvent>(event);
  const [newPrep, setNewPrep] = useState('');
  const set = <K extends keyof FamilyEvent>(k: K, v: FamilyEvent[K]) => setE((x) => ({ ...x, [k]: v }));

  const addPrep = () => {
    if (!newPrep.trim()) return;
    set('prep', [...e.prep, { id: uid('p'), text: newPrep.trim(), daysBefore: 1 }]);
    setNewPrep('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal card"
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={(ev) => { ev.preventDefault(); if (e.title.trim()) onSave(e); }}
      >
        <h2>{event.title ? 'Edit event' : 'New event'}</h2>
        <Field label="What">
          <input autoFocus value={e.title} onChange={(x) => set('title', x.target.value)} placeholder="Soccer practice" required />
        </Field>
        <div className="row">
          <Field label="Date"><input type="date" value={e.date} onChange={(x) => set('date', x.target.value)} required /></Field>
          <Field label="Starts"><input type="time" value={e.startTime ?? ''} onChange={(x) => set('startTime', x.target.value || undefined)} /></Field>
          <Field label="Ends"><input type="time" value={e.endTime ?? ''} onChange={(x) => set('endTime', x.target.value || undefined)} /></Field>
        </div>
        <div className="row">
          <Field label="Where">
            <input value={e.location ?? ''} onChange={(x) => set('location', x.target.value || undefined)} placeholder="Riverside Park" list="places" />
            <datalist id="places">{state.places.map((p) => <option key={p.id} value={p.name} />)}</datalist>
          </Field>
          <Field label="Type">
            <select value={e.category} onChange={(x) => set('category', x.target.value as EventCategory)}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Who's going"><MemberPicker members={state.members} value={e.memberIds} onChange={(v) => set('memberIds', v)} /></Field>
        <Field label="Who's driving / in charge">
          <MemberPicker
            members={state.members.filter((m) => m.role === 'parent')}
            value={e.driverId ? [e.driverId] : []}
            onChange={(v) => set('driverId', v.find((id) => id !== e.driverId))}
          />
        </Field>

        <div className="field">
          <span className="field-label">To do before</span>
          <ul className="prep-edit">
            {e.prep.map((p) => (
              <li key={p.id}>
                <span>{p.text}</span>
                <select value={p.daysBefore} onChange={(x) => set('prep', e.prep.map((q) => q.id === p.id ? { ...q, daysBefore: Number(x.target.value) } : q))}>
                  {[0, 1, 2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d === 0 ? 'day of' : `${d} day${d > 1 ? 's' : ''} before`}</option>)}
                </select>
                <button type="button" className="icon-btn" aria-label="Remove" onClick={() => set('prep', e.prep.filter((q) => q.id !== p.id))}>✕</button>
              </li>
            ))}
          </ul>
          <div className="row tight">
            <input value={newPrep} onChange={(x) => setNewPrep(x.target.value)} placeholder="Pack shin guards"
              onKeyDown={(x) => { if (x.key === 'Enter') { x.preventDefault(); addPrep(); } }} />
            <button type="button" className="btn" onClick={addPrep}>Add</button>
          </div>
        </div>

        <Field label="Notes"><textarea rows={2} value={e.notes ?? ''} onChange={(x) => set('notes', x.target.value || undefined)} /></Field>

        <div className="modal-actions">
          {onDelete && <button type="button" className="btn danger" onClick={onDelete}>Delete</button>}
          {onDelete && <a className="btn" href={googleCalendarUrl(state, e)} target="_blank" rel="noreferrer">Add to Google</a>}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}
