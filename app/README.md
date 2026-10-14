# 🏡 Family Huddle

Project management for families. Give it a school newsletter, team schedule, or party invite.
It pulls out the dates, asks a few quick questions, and gives you:

- **A calendar** you can send to Apple Calendar, Google Calendar, Outlook (`.ics`), or Notion (`.csv`).
- **A project plan** where every event is broken into dependent steps:
  `to-dos (buy cleats, pack bag) → get ready → drive → EVENT → drive home`
- **"Leave by" times** worked out backwards from the start time, the drive, and how long each person takes to get out the door.
- **Clash detection**, like resource over-allocation in a PM tool: the same kid or the same driver needed in two places at once.

## Run it

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (parser, planner, questions, sync, calendar export)
supabase/tests/run-local.sh  # database security tests (needs local Postgres)
npm run build      # static site in dist/, can be hosted anywhere (Netlify, GitHub Pages, Cloudflare Pages)
```

## How it works

| Screen | What it does |
| --- | --- |
| **Home** | Next two weeks grouped by day, "Leave by" times, to-dos due soon, clash warnings, export. |
| **Add** | Upload a PDF/photo or paste text → review what was found → answer quick questions → save. |
| **Plan** | Gantt timeline (week or day zoom) with dependencies. Tap a row for the step-by-step. |
| **Family** | People and get-ready times, places and drive times, settings, backup/restore. |

**Reading documents.** There are two readers:

1. **Built-in reader** (no setup). Handles pasted text with dates like `Oct 24`, `10/24`, `6-7:30pm`, `@ Riverside Park`.
2. **AI reader** (optional). Add an Anthropic API key under *Family → Settings* to read PDFs, phone photos of flyers,
   and messy newsletters. It expands recurring schedules ("every Tuesday in October"), picks out deadlines, and turns
   "bring/wear/buy" lines into to-dos with sensible lead times. Uses `claude-opus-5-5` with structured output.

**Learning as it goes.** The app asks once how long the drive is to a new place and how long each person takes to get ready.
Those answers are saved and reused, so it asks fewer questions over time.

## Two modes

- **Local mode** (default): no account, everything stays in this browser. The optional AI reader uses your own API key from the browser.
- **Shared family space** (cloud mode): both parents sign in and see the same plan, synced live. The AI reader runs on the server,
  so no key is ever on a phone. Turn it on by following [SETUP.md](SETUP.md), which also explains the security model.

Either way it can be added to the iPhone Home Screen and works offline.

## Code map

```
src/lib/
  types.ts           data model (members, places, events, prep items, plan tasks)
  planner.ts         events → plan tasks with dependencies, leave-by times, conflict detection
  questions.ts       what to ask the family (drive times, get-ready times, who/when)
  simpleParser.ts    offline date/time/location extraction from text
  aiLocal.ts         local mode: Claude extraction from the browser (loaded only when used)
  cloud.ts           cloud mode: Supabase client, invites, server-side extraction
  sync.ts            app state ⇄ database rows, change detection
  useCloudState.ts   live sync hook (optimistic edits, offline retry, realtime updates)
  calendarExport.ts  .ics (with "start getting ready" alarms), Google Calendar links, Notion CSV
  store.ts           local-mode persistence
src/components/      Home, AddStuff, Timeline, Family, Onboarding, EventEditor, CloudGate (sign-in/join)
supabase/
  migrations/        tables, row-level security, invite RPCs
  functions/extract  edge function that reads documents with Claude
  functions/_shared  extraction prompt + schema shared by browser and server
  tests/             security tests for the database (run-local.sh)
public/              manifest, icons, service worker, security headers
```

## Roadmap

See [ROADMAP.md](ROADMAP.md). Next up: an Apple Calendar subscription feed and "get ready" push reminders.
