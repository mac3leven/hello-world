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

## What works today

| Area | Screens | Notes |
| --- | --- | --- |
| Onboarding | Welcome, goals, strengths, coach & context | Every question optional; "skip and explore with sample work" |
| Home | Suggested next step, your work, recent learning, profile insight | Returning after a gap shows where you were, never "you missed…" |
| Academy | Paths, lessons, exercises, feedback & revision | 3 paths / 8 lessons of sample content; autosave; compare attempts; optional link to a Studio project |
| Studio | Home, idea inbox, new project, project, draft editor, revision history | Autosave + 10-minute snapshots; restore never overwrites |
| Creative Profile | Profile, observation evidence | Your statements kept apart from coach observations; correct, don't-use, dismiss, remove |
| Coach | One conversation, four modes | Shows what it can see and what it can't; suggestions only apply when you accept them |
| Progress | Milestones, practice history, Studio work, profile changes, reflections | Derived from real work; no points, ranks, or streaks |
| Settings | Permissions, export/import, sample work, forget/delete | |

## Adding real Claude responses later

All coaching goes through `CoachService` in `src/coach/service.ts`. To switch from the sample coach:

1. Add a small server endpoint that holds the API key (never put a key in the browser for real users).
2. Implement `CoachService` (`feedback` and `reply`) to call it. Send only `CoachRequest.context`: `resolveContext` has already applied the user's permissions.
3. Change the `coach` export in `service.ts`. Screens don't change.
4. Update the CSP/hosting config to allow that endpoint.

## Code map

```
src/lib/types.ts         data model (PRD §11)
src/lib/store.ts         local persistence, visible save state, other-tab change notice
src/lib/router.ts        hash router: every screen in the screen map has an address
src/lib/profile.ts       self-report vs coach observations, gradual confidence
src/lib/academy.ts       attempts and versions (Academy only)
src/lib/studio.ts        projects, drafts, snapshots, restore-as-new-version (Studio only)
src/lib/recommend.ts     explainable, rule-based recommendations
src/lib/progress.ts      milestones derived from real work
src/lib/seed.ts          optional sample Studio work (marked [Sample])
src/content/             structured, versioned starter curriculum
src/coach/service.ts     the one CoachService interface (swap point for real AI)
src/coach/context.ts     permission enforcement: exactly what the coach may see
src/coach/sample*.ts     sample (non-AI) feedback and four-mode replies
src/components/          layout shell and shared UI
src/screens/             one file per screen area
```

Tests live next to the code (`*.test.ts`): `npm test`.
