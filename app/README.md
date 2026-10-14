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
npm test           # unit tests (parser, planner, questions, calendar export)
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

## Privacy and security

- **Local-first.** Everything is stored in this browser's `localStorage`. No account, no server, no tracking.
- Document contents leave the device only when you use the AI reader, and then only to `api.anthropic.com`.
- The API key is stored only on this device and is **left out of backup files** on purpose.
- **Known trade-off:** the key sits in browser storage, so anything running on the page could read it.
  That's fine for a personal tool. Before sharing this with other families, move the API call behind a small backend
  (see roadmap) so the key never reaches the browser.

## Code map

```
src/lib/
  types.ts           data model (members, places, events, prep items, plan tasks)
  planner.ts         events → plan tasks with dependencies, leave-by times, conflict detection
  questions.ts       what to ask the family (drive times, get-ready times, who/when)
  simpleParser.ts    offline date/time/location extraction from text
  aiExtract.ts       Claude-powered extraction from PDFs, images, and text (loaded only when used)
  calendarExport.ts  .ics (with "start getting ready" alarms), Google Calendar links, Notion CSV
  store.ts           localStorage persistence
src/components/      Home, AddStuff, Timeline, Family, Onboarding, EventEditor
```

## Roadmap ideas

1. **Live calendar sync.** Two-way Google Calendar (OAuth) and Apple via CalDAV, plus a subscribable feed URL so updates show up automatically instead of being re-imported.
2. **Notion API sync** to a family database, instead of a CSV import.
3. **Shared family space.** A small backend (e.g. Supabase or Cloudflare Workers + D1) so both parents see the same plan, with the AI call proxied server-side.
4. **Real drive times** from a maps API, adjusted for time of day.
5. **Email forwarding.** Forward the school email to a family address and it lands in *Add*.
6. **Recurring events and templates**, like a "game day" checklist reused every Saturday.
7. **Workload view.** Who's driving how much this week, so it stays balanced between parents.
8. **PWA/mobile app** with push notifications for "start getting ready" reminders.
