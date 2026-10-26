# Instructions for Claude Code — HTML Prototype Phase

## Mission
Build a polished, clickable **HTML prototype** for the Task Management & Assignment System.

This is NOT the production build. Prefer working interactions over decorative completeness.

---

## Session protocol — do this first
1. Read `TODO.md`. It holds the build plan, what is already done, and the decisions already settled.
2. Work only on the **first wave that is not yet ✅ Done**, in task order. One wave per session.
3. Tick each task in `TODO.md` the moment it is finished — not in a batch at the end.
4. When the wave's exit criteria pass, fill in that wave's **Handoff** note, set **Current wave**
   at the top of `TODO.md`, and stop. Do not start the next wave — the user says `next` when ready.
5. Any new decision you have to make goes in the **Decisions** section of `TODO.md`, with the reason.

---

## Where to read
Full specs live in `docs/`. Do not read all nine files every time — open what the task needs.

| When you need | Read |
|---|---|
| Scope, business rules, task fields, status/priority values | `docs/01-PROTOTYPE-PRD.md` |
| Screen inventory, app shell, hash routes | `docs/02-SCREENS-NAVIGATION.md` |
| Click-through flows that must work end to end | `docs/03-USER-FLOWS.md` |
| Which actions each role can see / use | `docs/04-ROLE-PERMISSION-PROTOTYPE.md` |
| Drag & drop, drawer, toasts, empty states, filters | `docs/05-INTERACTIONS-STATES.md` |
| Colors, typography, spacing, card & column sizing | `docs/06-UI-UX-DESIGN-SYSTEM.md` |
| Mock users, divisions, projects, tasks, activity, notifications | `docs/07-MOCK-DATA.md` |
| File layout, state shape, routing, reset behavior | `docs/08-IMPLEMENTATION-GUIDE.md` |
| Definition of done | `docs/09-PROTOTYPE-ACCEPTANCE-CHECKLIST.md` |

---

## Runtime constraint — read this before writing any code
Stakeholders open this prototype by **double-clicking `index.html`** from the filesystem (`file://`).
No server, no install step. That rules out several common patterns:

- Use classic `<script src="...">` tags ordered by dependency. **Never** `<script type="module">`, `import`, or `export` — `file://` blocks module loading.
- No build step, bundler, transpiler, or `npm install`.
- No `fetch()` / `XMLHttpRequest` against local files (JSON, HTML partials) — `file://` blocks it. Mock data must be plain JS object literals inside `.js` files.
- If an external library is genuinely needed, vendor the file into `assets/vendor/` and load it locally. No CDN links — the prototype must work offline.

Before declaring work done, confirm the page actually renders when opened directly as a file.

---

## Hard constraints
Do not build:
- backend APIs or server routes
- a database, Prisma, SQL schema, or migrations
- real authentication infrastructure
- email infrastructure
- real file upload / storage

Use mock JavaScript data and browser state. Do not over-engineer the architecture.

---

## File layout
```text
prototype/
├── index.html
├── css/
├── js/
├── assets/
└── docs/          # specs — do not put code here
```
`docs/08-IMPLEMENTATION-GUIDE.md` has the detailed breakdown. A simpler structure is fine if it stays maintainable.

---

## Product priorities
1. Kanban board must feel excellent
2. Task cards must be easy to scan
3. Drag & drop must work
4. Task Detail Drawer must work
5. Role switching must demonstrate permissions
6. Reassign and Progress interactions must work
7. Visual theme = dark purple, modern, clear, Trello-like ease of use

---

## Business rules to enforce in the UI
- A normal User cannot create a task
- A normal User cannot delete or archive a task
- A User can reassign only tasks where they are the assignee; Supervisor and Super Admin can reassign any visible task
- A task has exactly one main assignee, and the assignee must be a project member
- Reassign, status drag & drop, and progress update each append a mock activity event
- Moving a task to Completed sets progress to 100%
- Progress stays within 0–100%
- A User sees only projects they are a member of; a Supervisor sees only their division; Super Admin sees everything
- A task card must convey its important information without opening the detail drawer

---

## Implementation style
- **UI is bilingual, English by default, with a TH / EN switch** (TODO.md D77). Write every new
  visible string in English. A plain literal passed to `UI.el()` is translated automatically once
  `js/i18n-th.js` has an entry for it; a sentence that joins data and words must be a template —
  `T('{name} added to {place}', { name, place })`, never `name + ' added to ' + place` — because
  Thai word order differs. Add the Thai for every new string to `js/i18n-th.js`. Mock data
  (names, task titles, comments) is data and is never translated.
- Do not leave primary buttons dead — every visible primary action does something.
- Use reusable rendering helpers/components even in vanilla JS.
- Hide actions a role cannot use rather than rendering many disabled buttons. Use a disabled + tooltip state only when it teaches the rule (e.g. deadline locked for User).
- Keep design tokens in one place under `css/`, using the values from `docs/06-UI-UX-DESIGN-SYSTEM.md`.
- Interactions update the screen immediately — state change, re-render, toast.

---

## Before considering the prototype complete
Validate against every item in `docs/09-PROTOTYPE-ACCEPTANCE-CHECKLIST.md`.
