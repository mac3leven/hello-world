# Family Huddle roadmap

Decisions so far:

- **Users:** both parents share one plan.
- **Calendar:** Apple Calendar first.
- **Documents come from:** emails (Gmail), paper flyers, team apps and websites, and PDFs.
- **Videography:** its own workspace, linked to the family plan for clash checks.
- **Format:** installable web app (Home Screen on iPhone).

## ✅ Phase 0: MVP (local, single device)

Document reading (built-in parser plus the optional AI reader), follow-up questions, a dependency-based plan,
leave-by times, clash detection, a Gantt timeline, and .ics/.csv export.

## ✅ Phase 1: Shared family space

- Email sign-in; optional Sign in with Apple.
- Create a family, invite your partner with a single-use code, live sync between devices.
- Supabase backend with row-level security, tested in `supabase/tests`.
- AI reader moved server-side (`extract` edge function): no API key on phones, daily cost cap.
- Installable on iPhone (manifest, icons, offline service worker), plus security headers.

See [SETUP.md](SETUP.md) to switch it on.

## Phase 2: Apple Calendar and reminders

- A private calendar feed (`webcal://…`) to subscribe to once per iPhone. New and changed events appear automatically.
  - Apple decides how often to refresh, so expect some delay.
  - The feed address works like a password. Add a "reset link" button and keep it unguessable.
  - Include "leave by" alarms; optionally a second feed of prep to-dos.
- Web push for "start getting ready" reminders. On iOS this works once the app is on the Home Screen (iOS 16.4+).

## Phase 3: Document inbox

- **Gmail:** a Gmail filter auto-forwards school/coach emails to a private family address. An inbound-email webhook reads them and drops them into *Add* for review.
  We chose this over reading the inbox directly: Gmail's read permission requires Google's security review, and the app gets only the emails you choose.
- **Team apps** (TeamSnap, GameChanger, school portals): subscribe to their calendar feeds and keep them in sync automatically.
- **Paper flyers:** a camera button. Photos go through the same AI reader.
- **PDF attachments:** handled through email forwarding or upload.

## Phase 4: Videography workspace

- Clients, shoots, and deliverables using the same plan engine: shot list → shoot → edit → client review → deliver.
- Kept separate from the family view; your partner sees "Busy" blocks only.
- Clash detection across both, e.g. a shoot booked over a soccer game.

## Later ideas

- Real drive times from a maps API (time-of-day aware).
- Recurring events and templates ("game day" checklist).
- Workload view: who's driving how much this week.
