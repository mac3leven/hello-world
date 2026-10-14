import { useState } from 'react';
import { addDays, addMinutes, formatDay, formatTime, isoDate, startOfDay, startOfWeek } from '../lib/dates';
import { buildEventPlan } from '../lib/planner';
import type { AppState, FamilyEvent, PlanTask, PlanTaskKind } from '../lib/types';
import { Empty, MemberChip } from './common';

const KIND_LABEL: Record<PlanTaskKind, string> = {
  prep: 'To do',
  'get-ready': 'Get ready',
  travel: 'Drive',
  event: 'Event',
  return: 'Drive home',
};

type Zoom = 'week' | 'day';

function minutes(t: PlanTask) {
  return Math.round((t.end.getTime() - t.start.getTime()) / 60_000);
}

function duration(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

export function Timeline({ state, onEdit }: { state: AppState; onEdit: (e: FamilyEvent) => void }) {
  const [zoom, setZoom] = useState<Zoom>('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  if (!state.events.length) {
    return <Empty icon="📊" title="Your plan will show up here"><p>Add a schedule first, then this view shows each event broken into steps: prep, getting ready, the drive, and the event itself.</p></Empty>;
  }

  // Visible window: a full week, or 6am–10pm on one day.
  const winStart = zoom === 'week' ? startOfWeek(anchor) : addMinutes(startOfDay(anchor), 6 * 60);
  const winEnd = zoom === 'week' ? addDays(winStart, 7) : addMinutes(startOfDay(anchor), 22 * 60);
  const span = winEnd.getTime() - winStart.getTime();
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - winStart.getTime()) / span) * 100));

  const rows = state.events
    .map((e) => ({ event: e, tasks: buildEventPlan(state, e) }))
    .filter(({ tasks }) => tasks.some((t) => t.end > winStart && t.start < winEnd))
    .sort((a, b) => a.tasks[0].start.getTime() - b.tasks[0].start.getTime());

  const ticks = zoom === 'week'
    ? Array.from({ length: 7 }, (_, i) => ({ at: addDays(winStart, i), label: formatDay(addDays(winStart, i)) }))
    : Array.from({ length: 9 }, (_, i) => { const at = addMinutes(winStart, i * 120); return { at, label: formatTime(at) }; });

  const step = zoom === 'week' ? 7 : 1;
  const now = new Date();
  const selectedRow = rows.find((r) => r.event.id === selected);

  return (
    <div className="stack">
      <div className="section-head">
        <h2>Plan</h2>
        <div className="row tight">
          <div className="segmented" role="group" aria-label="Zoom">
            <button aria-pressed={zoom === 'week'} onClick={() => setZoom('week')}>Week</button>
            <button aria-pressed={zoom === 'day'} onClick={() => setZoom('day')}>Day</button>
          </div>
          <button className="btn" aria-label="Previous" onClick={() => setAnchor(addDays(anchor, -step))}>‹</button>
          <button className="btn" onClick={() => setAnchor(startOfDay(new Date()))}>Today</button>
          <button className="btn" aria-label="Next" onClick={() => setAnchor(addDays(anchor, step))}>›</button>
        </div>
      </div>
      <p className="muted small">
        {zoom === 'week' ? `Week of ${formatDay(winStart)}` : formatDay(anchor)} · Each row is one event and the steps leading up to it.
        Tap a row to see the step-by-step.
      </p>

      <div className="gantt card">
        <div className="gantt-axis">
          {ticks.map((t) => <span key={t.at.getTime()} style={{ left: `${pct(t.at)}%` }}>{t.label}</span>)}
        </div>
        <div className="gantt-body">
          <div className="gantt-overlay" aria-hidden>
            {ticks.map((t) => <div key={t.at.getTime()} className="gantt-grid" style={{ left: `${pct(t.at)}%` }} />)}
            {now > winStart && now < winEnd && <div className="gantt-now" style={{ left: `${pct(now)}%` }} />}
          </div>
          {rows.length === 0 && <p className="muted gantt-empty">Nothing planned in this window.</p>}
          {rows.map(({ event, tasks }) => (
            <button key={event.id} className={`gantt-row${selected === event.id ? ' selected' : ''}`} onClick={() => setSelected(selected === event.id ? null : event.id)}>
              <span className="gantt-label">{event.title}</span>
              <span className="gantt-track">
                {tasks.flatMap((t) => t.dependsOn.map((dep) => {
                  const from = tasks.find((x) => x.id === dep);
                  if (!from || from.end >= t.start) return null;
                  return <span key={dep + t.id} className="gantt-link" style={{ left: `${pct(from.end)}%`, width: `${pct(t.start) - pct(from.end)}%` }} />;
                }))}
                {tasks.map((t) => (
                  <span key={t.id} className={`gantt-bar kind-${t.kind}${t.done ? ' done' : ''}`}
                    style={{ left: `${pct(t.start)}%`, width: `max(6px, ${pct(t.end) - pct(t.start)}%)` }}
                    title={`${KIND_LABEL[t.kind]}: ${t.title} · ${formatDay(t.start)} ${formatTime(t.start)} (${duration(minutes(t))})`} />
                ))}
              </span>
            </button>
          ))}
        </div>
        <div className="legend small">
          {(Object.keys(KIND_LABEL) as PlanTaskKind[]).map((k) => <span key={k}><i className={`gantt-bar kind-${k}`} /> {KIND_LABEL[k]}</span>)}
          <span><i className="legend-link" /> Depends on</span>
        </div>
      </div>

      {selectedRow && <StepList state={state} event={selectedRow.event} tasks={selectedRow.tasks} onEdit={onEdit} />}
    </div>
  );
}

function StepList({ state, event, tasks, onEdit }: { state: AppState; event: FamilyEvent; tasks: PlanTask[]; onEdit: (e: FamilyEvent) => void }) {
  const members = state.members.filter((m) => event.memberIds.includes(m.id));
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h3>{event.title}</h3>
          <div className="chips">{members.map((m) => <MemberChip key={m.id} member={m} small />)}</div>
        </div>
        <button className="btn" onClick={() => onEdit(event)}>Edit</button>
      </div>
      <ol className="steps">
        {tasks.map((t) => (
          <li key={t.id} className={`kind-${t.kind}`}>
            <span className="step-when">
              {isoDate(t.start) === event.date ? formatTime(t.start) : `${formatDay(t.start)}, ${formatTime(t.start)}`}
            </span>
            <span className="step-what">
              <strong>{t.title}</strong>
              <span className="muted small">
                {KIND_LABEL[t.kind]} · {duration(minutes(t))}
                {t.dependsOn.length > 0 && ` · after ${t.dependsOn.map((d) => tasks.find((x) => x.id === d)?.title).filter(Boolean).join(', ')}`}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {!event.startTime && <p className="small muted">This is an all-day item, so there's no drive to plan. Add a start time to get “leave by” times.</p>}
      {event.startTime && event.location && (
        <p className="small muted">
          Includes a {state.settings.bufferMinutes}-minute cushion before the start. Change drive and get-ready times under Family.
        </p>
      )}
    </section>
  );
}
