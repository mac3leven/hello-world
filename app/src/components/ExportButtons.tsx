import { useState } from 'react';
import { download, toCsv, toIcs } from '../lib/calendarExport';
import type { AppState } from '../lib/types';

export function ExportButtons({ state }: { state: AppState }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="export">
      <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>📤 Send to calendar</button>
      {open && (
        <div className="card export-menu">
          <button className="btn block" onClick={() => download('family-huddle.ics', toIcs(state), 'text/calendar')}>
            🍎 Apple / Google / Outlook <small>(.ics file)</small>
          </button>
          <button className="btn block" onClick={() => download('family-huddle.csv', toCsv(state), 'text/csv')}>
            📓 Notion / Spreadsheet <small>(.csv file)</small>
          </button>
          <p className="small muted">
            <strong>iPhone:</strong> open the .ics file and tap “Add All”.{' '}
            <strong>Google:</strong> Settings → Import &amp; export → Import.{' '}
            <strong>Notion:</strong> Import → CSV. Each event also has an “Add to Google” link.
            Reminders are set for when to start getting ready.
          </p>
        </div>
      )}
    </div>
  );
}
