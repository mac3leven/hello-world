import { addDays, formatTime, formatTimeStr, friendlyDayLabel, startOfDay, toDate } from '../lib/dates';
import { buildPlan, findConflicts, leaveBy } from '../lib/planner';
import type { AppState, FamilyEvent } from '../lib/types';
import { CATEGORY_LABEL, Empty, MemberChip } from './common';
import { ExportButtons } from './ExportButtons';

interface Props {
  state: AppState;
  onEdit: (e: FamilyEvent) => void;
  onTogglePrep: (eventId: string, prepId: string) => void;
  onAdd: () => void;
}

const DAYS_AHEAD = 14;

export function Home({ state, onEdit, onTogglePrep, onAdd }: Props) {
  const today = startOfDay(new Date());
  const horizon = addDays(today, DAYS_AHEAD);

  const upcoming = state.events
    .filter((e) => { const d = toDate(e.date); return d >= today && d < horizon; })
    .sort((a, b) => (a.date + (a.startTime ?? '')).localeCompare(b.date + (b.startTime ?? '')));
  // Prep tasks due in the next few days (or overdue) that aren't checked off yet.
  const todos = buildPlan(state).filter((t) => t.kind === 'prep' && !t.done && t.start < addDays(today, 3) && t.end >= addDays(today, -7));
  const conflicts = findConflicts(state).filter((c) => toDate(c.a.date) >= today);

  if (!state.events.length) {
    return (
      <Empty icon="🗂️" title="Nothing on the calendar yet">
        <p>Snap a photo of a school newsletter or upload a team schedule. I'll pull out the dates for you.</p>
        <button className="btn primary big" onClick={onAdd}>Add a schedule</button>
      </Empty>
    );
  }

  const byDay = new Map<string, FamilyEvent[]>();
  for (const e of upcoming) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const member = (id: string) => state.members.find((m) => m.id === id);

  return (
    <div className="stack">
      {conflicts.length > 0 && (
        <section className="card warn">
          <h3>⚠️ Heads up: schedule clash</h3>
          <ul>
            {conflicts.map((c) => (
              <li key={c.a.id + c.b.id}>
                <strong>{c.a.title}</strong> and <strong>{c.b.title}</strong> on {friendlyDayLabel(toDate(c.a.date))}: {c.reason}.
              </li>
            ))}
          </ul>
        </section>
      )}

      {todos.length > 0 && (
        <section className="card">
          <h3>✅ To do soon</h3>
          <ul className="checklist">
            {todos.map((t) => {
              const ev = state.events.find((e) => e.id === t.eventId)!;
              return (
                <li key={t.id}>
                  <label>
                    <input type="checkbox" checked={!!t.done} onChange={() => onTogglePrep(t.eventId, t.prepItemId!)} />
                    <span>{t.title}</span>
                    <small>for {ev.title} · {friendlyDayLabel(t.start)}</small>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Next two weeks</h2>
          <ExportButtons state={state} />
        </div>
        {byDay.size === 0 && <p className="muted">Nothing in the next two weeks. Enjoy the quiet! 🌤️</p>}
        {[...byDay.entries()].map(([date, events]) => (
          <div key={date} className="day">
            <h3 className="day-label">{friendlyDayLabel(toDate(date))}</h3>
            {events.map((e) => {
              const leave = leaveBy(state, e);
              const driver = e.driverId ? member(e.driverId) : undefined;
              return (
                <button key={e.id} className="card event-card" onClick={() => onEdit(e)}>
                  <div className="event-time">
                    <strong>{formatTimeStr(e.startTime)}</strong>
                    {e.endTime && <span className="muted">to {formatTimeStr(e.endTime)}</span>}
                  </div>
                  <div className="event-body">
                    <div className="event-title">{e.title}</div>
                    <div className="muted small">
                      {CATEGORY_LABEL[e.category]}{e.location ? ` · 📍 ${e.location}` : ''}
                    </div>
                    <div className="chips">
                      {e.memberIds.map((id) => member(id)).filter(Boolean).map((m) => <MemberChip key={m!.id} member={m!} small />)}
                    </div>
                    {e.prep.length > 0 && (
                      <div className="small muted">🎒 {e.prep.map((p) => (p.done ? '✓ ' : '') + p.text).join(' · ')}</div>
                    )}
                  </div>
                  {leave && (
                    <div className="leave-by">
                      <span>Leave by</span>
                      <strong>{formatTime(leave)}</strong>
                      {driver && <span className="small">🚗 {driver.name}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}
