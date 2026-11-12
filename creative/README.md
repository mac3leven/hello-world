# ✍️ Creative Development

A personal creative development system for writing and storytelling (fiction, scripts, personal and cinematic
stories). Product spec: the Creative Development MVP PRD.

- **Academy** teaches: learning paths, lessons, exercises, feedback, revision.
- **Studio** is your independent work: idea inbox, projects, drafts, revision history.
- **Creative Profile** remembers how you're developing: your own statements kept apart from coach observations, each with evidence.
- **One Coach, four modes:** Instructor, Mentor, Editor, Creative Partner.

## Run it

```bash
cd creative
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # static site in dist/
```

## Current decisions (MVP, personal-system stage)

| Open question (PRD §15) | Decision for now |
| --- | --- |
| Single user or testers | Single user, private, no account |
| Where data lives | This browser only (`localStorage`). JSON export/import to move between devices. Cross-device sync is deferred. |
| Mobile delivery | Responsive web app: bottom tabs + Coach button on phones, left rail on desktop |
| AI | **Sample coach**: no model, no keys, no network calls. Real Claude responses can be added later behind the same `CoachService` interface. |
| Coach context | Academy history and profile: on. Studio work for personalization: **off until you opt in**. Opening the coach on a draft uses that draft and says so. |
| Voice | Use the device's built-in dictation |

## Code map

```
src/lib/types.ts         data model (PRD §11)
src/lib/store.ts         local persistence + visible save state; swap Storage for a synced backend later
src/lib/router.ts        hash router: every screen in the screen map has an address
src/lib/seed.ts          optional sample Studio work (marked [Sample])
src/content/             structured, versioned starter curriculum
src/components/          layout shell and shared UI
src/screens/             one file per screen area
```
