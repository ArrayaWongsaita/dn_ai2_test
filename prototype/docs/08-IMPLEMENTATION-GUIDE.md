# HTML Prototype Implementation Guide

## 1. Goal
Build a self-contained clickable prototype, not a production application.

## 2. Runtime Constraint
The prototype is opened by **double-clicking `index.html`** from the filesystem (`file://`).
No server, no install step. This constrains how the JavaScript may be written:

- Classic `<script src="...">` tags ordered by dependency — no `<script type="module">`, `import`, or `export`
- No build step, bundler, transpiler, or `npm install`
- No `fetch()` / `XMLHttpRequest` against local files — mock data must be plain JS object literals in `.js` files
- External libraries, if truly needed, are vendored into `assets/vendor/` and loaded locally (no CDN links)

## 3. Preferred Structure
```text
prototype/
├── index.html
├── css/
│   ├── tokens.css      # design tokens from 06-UI-UX-DESIGN-SYSTEM.md — single source
│   ├── base.css        # reset, typography, buttons, badges, avatars, inputs, focus ring
│   ├── layout.css      # app shell, sidebar, topbar
│   └── components.css  # cards, columns, drawer, modal, toast
├── js/
│   ├── mock-data.js    # dataset per 07-MOCK-DATA.md
│   ├── state.js        # store, subscribe, selectors, resetDemoData
│   ├── permissions.js  # can(action, ctx) from 04-ROLE-PERMISSION-PROTOTYPE.md
│   ├── components.js   # shared render helpers
│   ├── interactions.js # drag & drop, drawer, modal, toast
│   ├── views/          # one file per screen group
│   │   ├── login.js
│   │   ├── dashboard.js
│   │   ├── my-tasks.js
│   │   ├── divisions.js
│   │   ├── projects.js
│   │   ├── board.js
│   │   ├── notifications.js
│   │   └── admin.js
│   ├── router.js
│   └── app.js          # bootstrap
├── assets/
└── docs/               # this documentation pack — no code here
```

### Load order
Classic scripts have no dependency resolution — `index.html` must list them in this order:

```text
mock-data → state → permissions → components → interactions → views/* → router → app
```

Each view file registers itself on a global registry rather than being imported:

```js
window.Views = window.Views || {};
window.Views.board = { render(params) { /* returns an element */ } };
```

`router.js` reads `window.Views` at navigation time, which keeps router and views decoupled
without modules.

A simpler structure is acceptable if maintainable — but keep the load order explicit.

## 4. State
**All state lives in JavaScript memory — no localStorage.** A refresh returns the prototype to the
seeded demo, which is what repeated stakeholder demos need. A `Reset Prototype Data` action in the
profile menu restores it mid-session without a refresh.

Recommended shape:
```js
{
  currentUserId,     // role is derived from this user, not stored separately
  activeRoute,
  selectedTaskId,    // non-null ⇒ Task Detail Drawer is open
  showBlockedColumn, // board toggle, see 01-PROTOTYPE-PRD.md §7
  filters,           // { search, assigneeId, priority, deadlineState }
  users,
  divisions,
  projects,
  tasks,             // activity / comments / attachments nested per task
  notifications
}
```

The store exposes `getState()`, `setState(patch)`, `subscribe(fn)`, and `resetDemoData()`.
Every mutation goes through `setState` so subscribed views re-render — never mutate arrays in place.

Derived data belongs in selectors, not in state: `visibleProjects(userId)`,
`tasksByStatus(projectId)`, `deadlineState(task)`, `unreadCount(userId)`.

## 5. Routing
Hash routing. The full route table lives in `02-SCREENS-NAVIGATION.md` §4 — including the guard
rules for unknown routes, routes the current role cannot access, and deep-linking a task.

No web server routing is required.

## 6. Drag & Drop
Can use:
- Native HTML5 drag/drop, or
- a small library such as SortableJS, vendored locally per §2 (not loaded from a CDN)

Required outcome matters more than implementation purity.

## 7. Rich Text
Do not build a full editor.
Use either:
- contenteditable area with simple toolbar, or
- styled textarea/editor mock

## 8. Images / Attachments
No upload backend.
For local interaction:
- render selected image using `URL.createObjectURL()` or FileReader
- attachment records can be appended to local state

## 9. Reset
Add a small demo utility in profile/settings:
`Reset Prototype Data`

This restores original mock data.

## 10. No Backend Rule
Do not create:
- Express server
- Next.js API routes
- Prisma
- SQL schema
- database migrations
- authentication provider
- email provider

unless explicitly requested in a later phase.

## 11. Quality Expectations
Even though it is a prototype:
- navigation should work
- no dead buttons on primary flows
- UI should remain visually consistent
- role behavior must visibly differ
- interactions should update the screen immediately
- code should be readable enough to iterate quickly
