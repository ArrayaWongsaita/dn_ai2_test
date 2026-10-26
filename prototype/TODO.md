# Prototype Build Plan

**Current wave:** ✅ All eight waves done, plus the TH / EN switch (D77) — awaiting the human browser pass (see Wave 8 Handoff)
**Last updated:** 2026-09-27

---

## How to resume

1. You are picking up mid-project. Read this file, then `CLAUDE.md`.
2. Find the first wave below that is **not** marked ✅ Done. That is your wave. Do only that one.
3. Open only the docs listed under **Read first** for that wave — not all nine.
4. Work the tasks in order. Tick `- [ ]` → `- [x]` here the moment each one is finished.
5. When **Exit criteria** all pass: write the **Handoff** note, update **Current wave** at the top,
   then stop and tell the user the wave is done. Do not roll into the next wave.
6. Anything you had to decide that the docs did not answer goes in **Decisions** below.

**Doc shorthand** used in the Read-first lines below:

| | | | |
|---|---|---|---|
| `docs/01` → `01-PROTOTYPE-PRD.md` | `docs/04` → `04-ROLE-PERMISSION-PROTOTYPE.md` | `docs/07` → `07-MOCK-DATA.md` | |
| `docs/02` → `02-SCREENS-NAVIGATION.md` | `docs/05` → `05-INTERACTIONS-STATES.md` | `docs/08` → `08-IMPLEMENTATION-GUIDE.md` | |
| `docs/03` → `03-USER-FLOWS.md` | `docs/06` → `06-UI-UX-DESIGN-SYSTEM.md` | `docs/09` → `09-PROTOTYPE-ACCEPTANCE-CHECKLIST.md` | |

---

## Decisions

Settled before the build started:

| # | Decision | Why |
|---|---|---|
| D1 | UI language is **English** throughout — *amended by D77: English stays the default, with a TH / EN switch* | Matches the labels already written in `docs/02` and `docs/06` |
| D2 | Board shows **4 columns + a `Show Blocked` toggle** that reveals a 5th; `Cancelled` is filter-only | `docs/01` wants 4 columns, `docs/07` seeds Blocked tasks — the toggle satisfies both without crowding the board |
| D3 | State is **in-memory only**, no localStorage; `Reset Prototype Data` restores mid-session | Repeated stakeholder demos should start clean on every refresh |
| D4 | Build is split into **8 waves**, one AI session each | Each wave fits one context window and ends with the prototype still runnable |
| D5 | Views register on `window.Views`; `router.js` reads that registry | Classic scripts have no imports — keeps router and views decoupled |
| D6 | Mock dates are **relative** (`daysFromNow(n)`), never hardcoded | A hardcoded "Due today" breaks the demo the next morning |
| D7 | Icons are hand-written inline SVG in `components.js`, not a vendored icon library | No CDN is allowed at `file://`, and a full Lucide build is dead weight for ~25 glyphs |
| D8 | Fonts use the local `system-ui` stack; Inter is used only if the viewer already has it | A webfont needs a CDN or a vendored binary — the `file://` demo must look the same everywhere |
| D9 | `mock-data.js` exposes `MockData.build()` rather than a literal | `resetDemoData()` has to re-evaluate `daysFromNow()`, otherwise "Due today" goes stale overnight |
| D10 | Product name in the UI is **TaskFlow** | The docs never name the product and the sidebar logo needs a word |
| D11 | Wave 1 login already has working persona buttons | Every other route sits behind the no-persona guard; without them the wave cannot be tested |
| D12 | `interactions.js` is created in Wave 1 holding `Toast` only | Router guard rule 3 needs a toast; drag & drop and the drawer join the same file in Waves 3–4 |
| D13 | `resetDemoData()` keeps the current persona and sidebar state, rebuilding only the data | Resetting mid-demo should not eject the stakeholder back to the login screen |
| D14 | `setState(patch, { silent: true })` exists for router bookkeeping | The router records `activeRoute` on every navigation; notifying there would re-enter the render loop |
| D15 | The `Menu` dropdown primitive lives in `interactions.js` and renders into `#modal-root` with fixed positioning | The sidebar is `overflow: hidden`, so a popover in normal flow is clipped at the rail. Wave 5's notification bell reuses the same primitive |
| D16 | Dashboard summary tiles count **only tasks assigned to the current user** | The tile links into My Tasks, which is personal — a tile scoped to the whole division would show a number the target screen contradicts |
| D17 | A manager's oversight numbers live as **scope chips in the dashboard header**, not as tiles | Keeps D16 honest while still giving Prim and Ben a dashboard that says something; the chips change per persona, which is the wave's whole point |
| D18 | "Recently updated" recency is read from each task's **newest activity event** | Tasks have no `updatedAt` field in `docs/07`, and every Wave 3-4 interaction appends activity, so the list stays live without a new field |
| D19 | Dashboard tile filter keys are `assigned` / `due-today` / `overdue` / `in-progress` | Wave 5 task 5.2 must honour all four. The first three map to S03 tabs; `in-progress` has no tab of its own, so Wave 5 should land on Assigned to Me with a status filter applied |
| D20 | `+ Add Task` renders **enabled** and answers with an explanatory toast until Wave 6 builds the form | A disabled primary button in the board header reads as broken; the checklist also wants "Supervisor sees Add Task" to be visibly true. The topbar search stays disabled-with-tooltip because an inert input reads as "not ready", not as broken |
| D21 | A project with **zero tasks** replaces the column strip with one empty state, rather than showing five empty columns | `docs/05` §10 asks the empty project to explain the next action; five empty columns explain nothing. A project whose only tasks are Cancelled still shows the columns, because the header already accounts for them |
| D22 | Clicking a task card routes to `#/tasks/:id` and renders a **read-only selected-task strip** under the board header | Keeps the card click alive without pre-building the Wave 4 drawer, and proves the deep-link route that task 4.11 depends on. Wave 4 deletes `.task-peek` and opens the real drawer instead |
| D23 | `updateTask` / `appendActivity` take the same `{ silent: true }` option as `setState` | One drop is three mutations; notifying on each would re-render the board three times. Wave 4's progress and reassign actions want the same |
| D24 | Board scroll positions live in a module variable in `board.js`, restored on the next frame | A drop re-renders the whole board — without this the stakeholder is thrown back to the top-left of the board on every single move |
| D25 | `Drawer` and `Confirm` are content-agnostic shells in `interactions.js`; the task body lives in `js/task-detail.js`. `--z-dropdown` moves above `--z-drawer` | Wave 6's Create Task drawer and Waves 6-7's confirmations reuse the shells, and 450 lines of task body would drown the primitives file. A popover must float above the layer that opened it, and the drawer's status / priority / reassign controls all open one |
| D26 | `router.js` clears `selectedTaskId` only when the resolved **path** changes | Every drawer action calls `setState`, which re-enters the router; nulling the id there would slam the drawer shut mid-interaction. It also lets Wave 5 open the drawer from My Tasks with a plain `setState`, no hash change. On `#/tasks/:id` the URL stays the source of truth |
| D27 | Task **title** and **collaborators** are read-only for every persona in Wave 4 | `docs/04` only requires read-only for User, task 4.3 lists just status / priority / deadline, and `docs/09` asks only that they be *visible*. Wave 6's Create Task form owns both inputs |
| D28 | Description uses `contenteditable` + `document.execCommand` | Deprecated, but it works in every browser straight from `file://` with no library — exactly the trade `docs/08 §7` offers. The user chose a really-formats editor over a decorative toolbar |
| D29 | Description, priority and attachment changes toast but append **no** activity event | `docs/07 §6` defines exactly seven types and none covers them. Inventing an eighth would break `UI.activitySentence`, which the dashboard's Recently Updated list also reads (D18) |
| D30 | ESC and X close and discard drafts; only the **overlay click** is guarded | `docs/05 §2` lists ESC and X as unconditional closes and attaches the unsaved-edit condition to the overlay alone. The blocked click answers with a nudge and a toast rather than silence |
| D31 | The drawer is full-window-height and its overlay dims the sidebar and topbar too | User's choice: it reads unmistakably as one focused layer, and a stray sidebar click cannot yank the demo away mid-edit. The board stays visible through `var(--overlay)`, which is what `docs/05 §2` asks for |
| D32 | A persona switch on `#/tasks/:id` **repaints** the drawer with the new persona's rights instead of closing it | It is the Limited-edit table changing in front of you — switch James to Nina and the priority and deadline locks fall away. A persona who cannot see the task still gets bounced by the existing router guard |
| D33 | `.progress__track` reads as a dark groove (`--bg-app` + inset border), not a tint | `--bg-surface-hover` is within a hair of `--bg-card`, so on a task card and in the drawer the track was effectively invisible. Found in the Wave 4 visual pass; the fix improves every board card too |
| D34 | The topbar search became a **global task finder** — type, get matching tasks from every project the persona can see, click one to open its drawer. The board owns a separate card filter | `docs/02 §1` puts Search in the topbar and `docs/05 §11` puts one in the Kanban header: two different jobs. Leaving the input disabled would have kept a visibly dead control in the shell for the rest of the demo |
| D35 | S03 uses a new full-width `UI.taskRow`, not `UI.taskCard` | My Tasks spans projects, so the project name must be on the row — and the assignee is always the reader, so two of the card's five slots would say nothing. Supersedes the Wave 3 handoff's `showStatus: true` suggestion |
| D36 | The active S03 tab lives in the **hash**, not a module variable | `docs/02 §4` already lists `#/my-tasks?filter=overdue`, so the dashboard tiles, the tabs and the back button share one mechanism. D26 means a tab switch never slams an open drawer shut |
| D37 | A notification opens the drawer **over the current screen** rather than navigating to the task's board | Flow G wants the row to turn read *and* the task to open; keeping the list on screen is what makes the read-state change visible |
| D38 | Board filters carry their `projectId` **inside** `state.filters`; a board applies them only when the id matches | Another board must start clean, and resetting from inside `render()` would be a `setState` during render. Side effect worth knowing: returning to a board restores the filters you left on it, and the filter row always says so |
| D39 | While filtering, a column count reads `n of m`, and a board filtered to nothing **keeps its columns** plus a "no matching cards · Clear all" banner | The exit criterion is that filtering never dead-ends. D21's replace-the-strip treatment is for a project with no tasks at all |
| D40 | `TaskActions.reassign` pushes a `TASK_REASSIGNED` notification for the new assignee — never when someone reassigns to themselves | Closes the Wave 4 loose end and makes the bell live rather than seed-only: hand a task to Aom, switch to Aom, the bell has a new unread |
| D41 | `markNotificationRead` takes the same `{ silent: true }` option as `setState` / `updateTask` (D23) | Marking read *and* opening the task is two mutations that should cost one render |
| D42 | `Menu` gained `autoFocus: false` and `setContent()` | A type-as-you-search panel is the one case where "focus the first item" is wrong. Extending the primitive beat growing a second popover — the finder gets outside-click, ESC and arrow-key nav for free |
| D43 | New file `js/topbar.js` owns the two topbar widgets. Notification *copy* lives in `components.js`, notification *behaviour* in `interactions.js` as `NotificationActions` | The split the codebase already uses: `UI` draws, `*Actions` mutates, a view file owns a screen |
| D44 | `.progress__fill` needs `display: block` | Found in the Wave 5 visual pass: the fill is a `<span>`, and an inline box ignores `width`/`height` — so **every** progress bar in the prototype had been an empty groove since Wave 1, on board cards, project cards and in the drawer. D33 fixed the track; this fixes the bar |
| D45 | The finder's results reopen on a **click** in the input, not on focus | Menu's ESC handler closes the panel and hands focus back to the input; if focus alone reopened it, ESC could never dismiss the results |
| D46 | The board search restores its caret **synchronously** after the re-render its own keystroke caused, not on the next frame | Chrome fires `blur` when a focused node is replaced, and a fast typist outruns `requestAnimationFrame` — before this the box accepted one or two characters and went deaf |

| D47 | A `Modal` primitive joins `Confirm` in `interactions.js`: a node body, and an `onConfirm` that may return `false` to stay open | `Confirm`'s body is text-only and its confirm cannot veto, so a required field would have nowhere to complain. Same `.dialog*` markup and CSS — nothing new to style. Wave 7's Add User / Edit Role / Assign Division reuse it |
| D48 | Create Task is a **state-driven drawer** (`state.createTaskProjectId`) with key `create-task:<projectId>`; each `sync()` closes only a drawer whose key it owns; the router clears the flag on a real path change, exactly as it does `selectedTaskId` | `Drawer` is a singleton, and `TaskDetail.sync()` runs after every render — before this it closed *whatever* was open whenever no task was selected, which would have killed the Create Task drawer on the next repaint |
| D49 | S09's required fields are **Title and Assignee** only, and nothing is marked until `Create` has been pressed once | `docs/01 §6` requires Title / Project / Status / Priority / Assignee: Project comes from the board, Status and Priority ship with defaults, and `docs/02 S09` asks for "required field visual state" — not live validation that nags while you type |
| D50 | Creating a task appends `CREATED` then `ASSIGNED`, and pushes a `TASK_ASSIGNED` notification unless the creator assigned it to themselves | The D40 rule applied to creation — the Wave 5 handoff left this for Wave 6 to decide. Only two of the seven `docs/07 §6` types apply, and D29 forbids inventing an eighth |
| D51 | `+ New Division` is **wired this wave**, not left as a toast stub | User's call. Wave 6 already had to build a form dialog for `Create project`, so Flow E was nearly free — and a dead primary button would have sat on S04 for two waves. Wave 7's S11 reuses `DivisionActions.create` |
| D52 | `Archive project` sets `status: 'ARCHIVED'` and is **restorable** from the division. New selector `AppState.activeProjects` keeps archived projects out of every card grid *and* out of `UI.scopeCounts`; `visibleProjects` is untouched | User's call. A stakeholder who clicks Archive mid-demo gets the board back without resetting the dataset. Keeping `visibleProjects` honest means the board, its tasks in My Tasks and `#/projects/:id/settings` never become unreachable — Restore needs somewhere to live. `scopeCounts` had to follow, or the scope line would claim more projects than the grid shows |
| D53 | `Add Member` is a **`Menu` picker** — one click adds. `Remove member` is a destructive `Confirm`, and is refused outright when the member still holds a task | Adding is cheap and reversible; removing is not. The refusal is the teaching moment for `docs/01 §5` rule 6, so it fires *before* the confirmation rather than after it |
| D54 | New permission key `manageDivisionMembers` (`isManager`) | `docs/04` has no row for division *membership* at all, and `docs/02 S05` lists `Add member` under "Supervisor / Super Admin" — so this follows S05, not the admin-only rows around it |
| D55 | New permission key `editProject` (`isManager`), used to rename a project in S12 | `docs/04` has no "edit project" row either. A settings screen whose info block cannot be edited reads as broken |
| D56 | Task **title** and **collaborators** become editable in the drawer for a manager, closing **D27** | User's call. Create Task settled what both controls look like, `changeTitle` / `changeCollaborators` already existed in `permissions.js`, and a User still sees both read-only per the `docs/04` Limited-edit table. Neither appends an activity event (D29) |
| D57 | S12 moves out of `board.js` into its own `js/views/project-settings.js` | `board.js` was already 589 lines and the two screens share nothing but a project id |
| D58 | **No new stylesheet.** Field validation went to `base.css` next to `.field`/`.input`, `.list-row*` / `.panel*` / `.division-card*` / `.info-grid` to `components.css`, `.td-foot` / `.td-select--input` / `.dialog--form` to `drawer.css` | Each rule sits with the family it extends, and `index.html`'s `<link>` list stays unchanged — one less thing to get wrong at `file://` |
| D59 | A member row is the generic **`.list-row`**, a `<div>`, not a `<button>` | It carries its own trailing Remove button; `.project-card`, `.task-row` and `.notif-item` are all anchors or buttons and cannot nest one. The archived-project row reuses it |
| D60 | Divisions, projects and tasks created in the demo get **sequential ids** (`d4`, `p5`, `t17`) via `AppState.nextId`, not the `uid()` timestamp that comments and activity use | These three land in the URL — `#/projects/p5` reads like the seed data, `#/projects/p1lq3k7x2` does not |

| D61 | **Deactivating a user is a real change, not a badge.** An inactive person leaves every people picker — task assignee, reassign, collaborators, project and division Add Member, supervisor candidates — but stays in the demo persona switcher, badged `Inactive`, and stays visible on the board header and the assignee *filter* | User's call. A mock button that only changes a badge is a dead button, and this prototype has not shipped one yet. The board header and the filter are the deliberate exception: you must still be able to see and filter a deactivated person's work |
| D62 | Deactivate and Edit Role are **refused** for yourself, for a division's supervisor, and (for deactivate) for anyone still holding open tasks — each naming the rule and the count | The D53 pattern: the refusal *is* the teaching moment, so it fires before the confirmation rather than after. Seed data gives both outcomes for free — Mook deactivates cleanly, Ben is refused as a supervisor, James as a task-holder |
| D63 | **Archive Division is refused while the division still has active projects.** Otherwise it is reversible: the card leaves S04 and `scopeCounts`, `visibleDivisions` and the detail screen are untouched, and Restore lives on S11 | User's call. Mirrors D52 for projects one level up. Refusing beats cascading boards out from under a Supervisor, and it keeps Restore simple — there is nothing to put back but the division itself |
| D64 | S10 is drawn as `.list-row` + a ⋮ `Menu`, not a table | User's call. Reuses the member-list language the division and project screens already speak, adds no table CSS, and `docs/09` asks for "no overcrowded admin-dashboard feeling" |
| D65 | The four division dialogs move to **`js/division-forms.js`**; `views/admin.js` splits into `views/admin-users.js` + `views/admin-divisions.js` | A dialog two screens open belongs to neither view file. The split is D57 applied again — S10 and S11 share nothing but a nav group |
| D66 | Administrative actions push **no notification** | `docs/07 §8` defines six types and none covers "your role changed". The D29 / D50 rule against inventing a seventh |
| D67 | S11's `+ New Division` **stays on S11** so the new row literally appears (Flow E step 8); S04's keeps its Wave 6 navigate-to-the-new-division behaviour | Two entry points, two right answers: from a grid the new division's own screen is the proof, from a list the new row is |
| D68 | Promoting a User to Supervisor leaves them **seeing nothing** until they supervise a division — every role picker says so rather than hiding the option | Supervisor visibility is by supervised division (`state.js`), not membership. Surfacing the consequence teaches the model; hiding it would make a correct result look like a bug |
| D69 | `.menu__item--destructive` gained real CSS, and `.list-row.is-muted` now dims its avatar | Both found in the Wave 7 visual pass. The destructive modifier had **no rule at all** — `Deactivate` and `Archive Division` looked like every other menu item. The muted row was too quiet to scan in a list of otherwise equal rows |
| D70 | The two one-shot **attention animations** (drawer nudge 320ms, card-landed pulse 520ms) sit outside the 150–220ms band, as the tokens `--dur-nudge` / `--dur-pulse`. Every *transition* is inside it | `docs/06 §11` bands transitions. A pulse short enough to fit the band is too short to read as "this card just changed", which is its only job |
| D71 | `Simulate failure` is a checkable item in the **profile menu** next to Reset Prototype Data; while it is on, the board header shows a `Failure simulation on · Turn off` chip | User's call. It is a demo control, not a product feature, and the chip means a presenter never mistakes a scripted revert for a real bug |
| D72 | Simulated failure applies to **every** `TaskActions.moveTask` (drag and the drawer's status dropdown). The card lands, reverts after 700ms, shows an error toast and appends **no** activity. The revert writes back only `status`, and stands down if the task moved again or a Reset happened in between (`AppState.epoch()`) | User's call on scope. A failed write never happened, so it leaves no log. Reverting only what it wrote means a comment added inside the window survives |
| D73 | Contrast nudged to WCAG AA: `--text-muted` `#81758f`→`#9387a3`; white text sits on a new `--accent-fill` `#7a4ae8` (hover `--accent-fill-hover` `#6d28d9`) instead of `--purple-primary`; avatar teal and orange deepened one shade | User's call. Found by the 8.4 sweep. The `docs/06` values measured 3.9:1 (muted on a card), 4.2:1 (primary button) and 2.7:1 (its hover), below the 4.5:1 that `docs/06 §12` asks for. `--purple-primary` stays the brand colour for rings, borders and accents |
| D74 | On a phone, `.view__header` wraps (title takes the row, actions beneath) and `.list-row`'s body shrinks beside its avatar instead of wrapping under it | Found at 390px: S05, S10 and S11 pushed their primary button off-screen, the dashboard crushed its welcome line into a column, and the S10 ⋮ button was stranded in a bottom corner |
| D75 | `.td-date` gets its focus ring through `:focus-within`, and the sidebar logo button gained a hover state | Found by the 8.2 sweep. A date input's focus lands on its inner segments, so the host never matches `:focus-visible` and the shared `.input` ring never drew. Current and active items (active nav, current crumb, active tab) are deliberately exempt from hover |
| D76 | Nineteen raw colours outside `tokens.css` moved into it as named tokens (badge edges, avatar palette, decorative tints), values unchanged | `tokens.css` declares itself the only file allowed a raw colour, and CLAUDE.md asks for tokens in one place. This is what makes "Dark purple theme consistent" checkable rather than a matter of taste |
| D77 | **TH / EN switch**, English by default. `js/i18n.js` provides `T(template, vars)`; `UI.el()` soft-translates every `text` / `title` / `placeholder` / `aria-label` / string child by exact dictionary match; sentences that mix data and words are `T()` templates; label maps (status, priority, role, deadline, notification, lock reasons) translate on read. The Thai lives in `js/i18n-th.js` (566 strings, 19 plural nouns). The switch is on the Login card and in the profile menu, each option written in its own language; the choice survives Reset like the persona (D13) and is in-memory like everything else (D3). Mock data is never translated. In Thai, letter-spacing is removed everywhere | User's call, after Wave 8 closed. Soft translation at the single DOM builder meant ~500 plain literals needed no edit; only the ~150 built sentences became templates, because Thai word order cannot be reached by concatenation. Tracking breaks Thai's stacked vowels and tone marks apart |

Add new decisions here as they come up, with a one-line reason.

---

## Wave 0 — Documentation & folder structure ✅ Done

- [x] Move the nine spec docs into `docs/`
- [x] Rewrite `CLAUDE.md` with doc map, runtime constraint, business rules, session protocol
- [x] Rewrite `README.md` as the human entry point
- [x] Reduce `AGENTS.md` to a pointer at `CLAUDE.md`
- [x] Add `.gitignore`
- [x] Fill the gaps that blocked the build: full mock dataset with IDs and project membership
      (`docs/07`), deadline thresholds and the progress↔status direction (`docs/01`), the meaning of
      "Limited" edit (`docs/04`), the complete route table (`docs/02`), `js/` layout, load order and
      state shape (`docs/08`)
- [x] Write this file

**Handoff:** Docs are internally consistent and decision-complete. No prototype code exists yet —
Wave 1 starts from an empty folder. Every `index.html`/`css/`/`js/` path referenced below is still
to be created.

---

## Wave 1 — Foundation & App Shell ✅ Done

Goal: the app boots from `file://`, the shell renders, and every route switches to a placeholder.
Nothing is styled per-screen yet — this wave is the skeleton everything else hangs on.

**Read first:** `CLAUDE.md` · `docs/06-UI-UX-DESIGN-SYSTEM.md` (all) · `docs/07-MOCK-DATA.md` (all) · `docs/08-IMPLEMENTATION-GUIDE.md` (all) · `docs/02-SCREENS-NAVIGATION.md` §1 and §4

**Tasks**
- [x] 1.1 `index.html` — app shell markup: `#sidebar`, `#topbar`, `#view`, `#drawer-root`, `#modal-root`, `#toast-root`, plus script tags in the load order from `docs/08` §3
- [x] 1.2 `css/tokens.css` — every token from `docs/06` §2, plus typography / spacing / radius / motion scales as custom properties
- [x] 1.3 `css/base.css` — reset, type scale, focus ring, buttons (primary / secondary / destructive), badges, avatars, form controls
- [x] 1.4 `css/layout.css` — app shell grid, sidebar 240–260px with collapse, topbar 56–64px
- [x] 1.5 `js/mock-data.js` — the full dataset from `docs/07`: 6 users, 3 divisions, 4 projects, 16 tasks, activity, comments, attachments, notifications, all dates via `daysFromNow()` / `hoursAgo()`
- [x] 1.6 `js/state.js` — `getState` / `setState` / `subscribe` / `resetDemoData`, plus selectors `visibleProjects`, `visibleDivisions`, `tasksByStatus`, `deadlineState`, `unreadCount`
- [x] 1.7 `js/permissions.js` — `can(action, ctx)` covering every row of the `docs/04` table and the Limited-edit field rules
- [x] 1.8 `js/components.js` — shared helpers: `el()`, `badge()`, `avatar()`, `avatarStack()`, `progressBar()`, `emptyState()`, `icon()`
- [x] 1.9 `js/router.js` — hash router over the `docs/02` §4 table, including the three guard rules
- [x] 1.10 `js/views/*.js` — one placeholder view per route, each registering on `window.Views`
- [x] 1.11 `js/app.js` — bootstrap, render sidebar + topbar, mount the router, subscribe for re-render

**Exit criteria**
- Double-clicking `index.html` renders the shell — no server, no console errors
- Every sidebar link and every route in `docs/02` §4 reaches its placeholder view
- `AppState.resetDemoData()` from the console restores the dataset
- Persona counts match the table in `docs/07` §9 when checked via selectors in the console

**Handoff:** The shell runs from `file://` with no server and no console errors. What Wave 2 can rely on:

- `AppState` — `getState` / `setState(patch[, {silent}])` / `subscribe` / `resetDemoData`, lookups
  (`currentUser`, `getUser`, `getProject`, `getTask`, …), visibility selectors (`visibleDivisions`,
  `visibleProjects`, `visibleTasks`, `canSeeProject` / `canSeeDivision` / `canSeeTask`), task helpers
  (`tasksByStatus`, `tasksAssignedTo`, `deadlineState`, `daysUntil`), `unreadCount`, and the mutation
  helpers `updateTask` / `appendActivity` / `markNotificationRead`.
- `Permissions.can(action, ctx)` and `Permissions.canEditField(field, ctx)`, plus `LOCK_REASON` and
  `ROLE_LABEL`. All 16 rows of the `docs/04` table were asserted.
- `UI` — `el`, `icon`, `badge` / `statusBadge` / `priorityBadge`, `avatar` / `avatarStack`,
  `progressBar`, `emptyState`, `placeholder`, `formatDate` / `formatDateTime` / `relativeTime`,
  and the `STATUS_` / `PRIORITY_` / `DEADLINE_` label and variant maps.
- `Toast.success|error|warning|info(message, { detail })`.
- `Router` — `navigate`, `handleRoute`, `breadcrumbFor`, `current()`. All 12 routes resolve; the three
  guard rules were exercised for all three personas and each denial carries its own message.
- Views register on `window.Views`: `login`, `dashboard`, `myTasks`, `divisions`, `divisionDetail`,
  `projects`, `board`, `projectSettings`, `notifications`, `adminUsers`, `adminDivisions`.

Persona counts verified against `docs/07` §9: Prim 3/4/16 · Nina 1/3/16 · Ben 1/1/0 · James 1/2/14 ·
Aom 1/2/14 · Mook 1/1/0 (divisions / projects / tasks).

Still stubs, on purpose: every view except `login` is a placeholder; the topbar search input is
disabled with a tooltip until Wave 5; the sidebar footer shows the current user with a *Switch
persona* link, and the full profile menu with **Reset Prototype Data** is Wave 2 task 2.2
(`AppState.resetDemoData()` works from the console today).

Verification status: checked by headless render of `index.html` and a route/guard matrix — no JS
errors. A human pass in a real browser window has not been done yet; the checklist for it is in
**Exit criteria** above.

---

## Wave 2 — Login, Role Switcher & Dashboard ✅ Done

Goal: the permission story becomes visible — switching persona visibly changes navigation and data.

**Read first:** `docs/02` S01 + S02 · `docs/03` Flow H · `docs/04` (all) · `docs/07` §9

**Tasks**
- [x] 2.1 S01 login view — product logo, "Continue as" Super Admin / Supervisor / User, routes to Dashboard
- [x] 2.2 Profile block at the sidebar footer — current user, role, menu with persona switcher (all 6 users) and `Reset Prototype Data`
- [x] 2.3 Persona switch re-renders in place, no page reload
- [x] 2.4 Sidebar items filtered by role — Administration group only for Super Admin
- [x] 2.5 S02 Dashboard — welcome + role line, summary tiles (My Tasks / Due Today / Overdue / In Progress), Recently Updated list, project cards
- [x] 2.6 Summary tiles link to `#/my-tasks?filter=…` (target screen is still a placeholder until Wave 5 — the link must carry the filter)

**Exit criteria**
- All three login entry points work and land on Dashboard
- Switching persona changes the sidebar, the dashboard numbers, and the project cards
- Counts per persona match `docs/07` §9 exactly
- `docs/09` → "Can enter as …" and "Data visibility changes between personas" tick

**Handoff:** The permission story is now visible without explanation. What Wave 3 can rely on:

- **`Menu`** (`js/interactions.js`) — `Menu.toggle(trigger, buildItems, { placement, width, label })`
  plus `Menu.item / section / separator / close / isOpen`. Placements `top-start` and `bottom-end`,
  closes on outside mousedown / ESC / resize, ArrowUp-ArrowDown moves between items, and
  `App.render()` closes any open menu before it replaces the shell.
- **New `UI` helpers** — `statTile(config)`, `projectCard(project)` (S06 in Wave 3 should reuse this
  one, not build a second card), `activitySentence(event)` for all seven `docs/07` §6 event types
  (the Wave 4 timeline should reuse it so wording never drifts), `lastActivity(task)`,
  `scopeCounts / scopeLine / roleLine / plural`. New icons: `check`, `clock`, `alert-triangle`,
  `trending-up`, `activity`, `arrow-right`, `refresh-cw`, `log-out`, `switch`.
- **New CSS** — `.menu*`, `.stat-tile*`, `.project-card*` + `.project-grid`, `.scope-chip(s)`,
  `.dash-tiles / .dash-cols / .dash-panel / .recent-item`, and the redesigned `.login*` block, all in
  `css/components.css`. `.profile-block` is now a menu-trigger `button` and the topbar has
  `.topbar__avatar` (`css/layout.css`). No new files, no change to `index.html`.
- **Persona switching** is a plain `setState({ currentUserId })` — the sidebar, topbar and view all
  re-render, and if the new persona cannot reach the current route the router guard sends it to the
  dashboard with its own toast. Any screen built from here on gets this for free.

Verified by a headless render that boots from `index.html`'s own script list (no console errors, no
warnings), driving: all three S01 entry points, all six personas' sidebar / tiles / project cards /
recent list, opening the menu, switching persona in place (hash unchanged), the guard bouncing James
off `#/admin/users`, `Reset Prototype Data` (data restored, persona kept), sign out, and every tile /
recent-item / project-card link resolving to the right view. Persona counts match `docs/07` §9
exactly: Prim 3/4/16 · Nina 1/3/16 · Ben 1/1/0 · James 1/2/14 · Aom 1/2/14 · Mook 1/1/0.

Not yet done: **a human pass in a real browser window.** The Chrome extension available in this
session refuses `file://` URLs and could not reach a local http server either, so nothing in this
wave has been looked at with human eyes — the headless check proves structure and behaviour, not
that the design looks right. Double-click `index.html` and check the S01 card, the tile row, the
project-card grid and the profile menu's upward placement (including the collapsed 64px rail).

Deliberately left for later waves: the four dashboard tiles link to the S03 placeholder until Wave 5
honours `?filter=` (see D19); `Recently updated` rows and project cards open the board, and the Task
Detail drawer they should open arrives in Wave 4; the topbar search stays disabled until Wave 5.

---

## Wave 3 — Projects list, Kanban board & Drag and Drop ✅ Done

Goal: the board feels excellent. This is priority #1 in `CLAUDE.md` — spend the session here.

**Read first:** `docs/02` S06 + S07 · `docs/05` §1 · `docs/06` §4, §5, §6, §11 · `docs/03` Flow A and Flow D · `docs/01` §7 and §9

**Tasks**
- [x] 3.1 S06 Projects list — cards with name, division, member avatars, task counts, completion %
- [x] 3.2 Board header — breadcrumb, project name, member avatars, `+ Add Task` for Supervisor / Super Admin only, `Show Blocked (n)` toggle per D2
- [x] 3.3 Columns — To Do / In Progress / Review / Completed (+ Blocked when toggled), each with a live count and independent scroll, board scrolls horizontally
- [x] 3.4 Task card component following the `docs/06` §5 hierarchy: priority, title, assignee + deadline chip, progress bar, comment / attachment indicators
- [x] 3.5 Deadline chip rendering all states from `docs/01` §9 — overdue in danger colour, card not painted red
- [x] 3.6 Native HTML5 drag & drop — drag affordance, drop-zone highlight, card moves on drop
- [x] 3.7 On drop: status updates, column counts update, `STATUS_CHANGED` activity appended, toast shown
- [x] 3.8 Drop into Completed also sets progress to 100% and appends a second `PROGRESS_CHANGED` event (one-way only — see `docs/01` §5 rule 11)
- [x] 3.9 Completed cards get their muted treatment; empty columns and the empty project (`p3`) show empty states

**Exit criteria**
- Every box in the `docs/09` "Kanban" section ticks
- `docs/03` Flow A steps 4–8 and Flow D complete without explanation
- Board stays readable at 1280px with the Blocked column open

**Handoff:** The board works. Flow A steps 4-8 and Flow D both run end to end. What Wave 4
can rely on:

- **`TaskActions`** (`js/interactions.js`) — `moveTask(taskId, toStatus)` is the single place a
  status change happens: it checks the permission, writes the status, appends `STATUS_CHANGED`,
  forces progress to 100% with a second `PROGRESS_CHANGED` when the target is Completed, and
  toasts. The drawer's status dropdown (task 4.3) should call this rather than write status itself.
  `consumeLanded()` returns the id of the task that just moved, once, so the board can pulse it.
  Wave 4's `setProgress` and `reassign` belong in this module, next to `moveTask`.
- **`DragDrop`** — `DragDrop.card(node, task)` and `DragDrop.column(node, status, onDrop)`.
  Teardown is bound at **document** level on purpose: a successful drop re-renders the board and
  destroys the card that started the drag, so its own `dragend` never arrives. Anything added here
  later must not rely on a card-scoped `dragend` firing.
- **New `UI` helpers** — `taskCard(task, options)` (`options.selected` / `landed` / `showStatus` /
  `draggable:false`; Wave 5's My Tasks rows can reuse it with `showStatus: true`) and
  `deadlineChip(task)`, which renders all six `docs/01` §9 states and returns `null` when there is
  no deadline. New icons: `eye`, `eye-off`, `ban`, `grip-vertical`.
- **`AppState.updateTask` / `appendActivity`** now take `{ silent: true }` (D23).
- **New CSS** — `css/board.css`, linked from `index.html` after `components.css`. Holds
  `.project-group*`, `.view--board`, `.board__*`, `.column*`, `.task-card*`, `.deadline-chip` and
  `.task-peek`. No other stylesheet changed.

Verified by a headless render that boots `index.html` from a **`file://`** URL using the page's own
script list — 93 checks, no console errors or warnings anywhere in the run. Covered: S06 grouping
and counts per persona; the four columns and their counts; the Blocked toggle both ways; Cancelled
`t12` absent from the board but declared in the header; every card element; all six deadline states;
a full drag (dragstart → dragenter → dragover → drop) moving the task, updating both column counts,
appending exactly one `STATUS_CHANGED` with the right actor and from/to, and toasting; same-column
drop as a no-op; Flow D setting progress to 100% and appending two events; progress 100% **not**
completing a task (rule 11 stays one-way); the `#/tasks/:id` deep link selecting the right card;
role differences on `+ Add Task`; the empty project for both a Supervisor and a User; an empty
column; and `resetDemoData`.

One real bug was found and fixed during that pass: the click guard that stops a drag from also
opening the task was released on the card's own `dragend`, which never fires when the drop destroys
the card — so after the first successful drop every later card click would have been swallowed. The
teardown now lives on the document. The regression test was checked against the unfixed code to
confirm it actually catches it (91/93 before, 93/93 after).

Still not done: **a human pass in a real browser window.** A local http server was served
successfully (curl returns 200) but the Chrome extension in this session could not load either the
`file://` URL or `http://localhost` — the same wall Wave 2 hit. So the visual design has still not
been looked at by anyone. Double-click `index.html` and check: the column strip at 1280px, the card
hierarchy, the drop-zone highlight while dragging, the completed cards' muted treatment, and the
overdue chip being the only red thing on the card.

Two things to know about the board geometry: four 316px columns plus a 248px sidebar do not fit in
1280px, so the board scrolls horizontally — that is what `docs/06` §4 asks for ("do not force all
columns to shrink until unreadable"), and collapsing the sidebar buys one more column. And a card
is only reachable by keyboard for **opening**, not for moving; keyboard status changes arrive with
the drawer's status dropdown in Wave 4, and the accessibility sweep is task 8.4.

Deliberately left for later waves: `+ Add Task` toasts instead of opening a form (D20, Wave 6);
clicking a card renders the read-only strip instead of the drawer (D22, Wave 4); board search and
the assignee / priority / deadline filters are Wave 5; `Simulate failure` is task 8.5.

---

## Wave 4 — Task Detail Drawer, Reassign & Progress ✅ Done

Goal: the drawer carries the whole task story and the two headline interactions work.

**Read first:** `docs/02` S08 · `docs/05` §2, §3, §4, §5, §6, §7 · `docs/03` Flow A steps 9–11 and Flow B · `docs/04` Limited-edit table

**Tasks**
- [x] 4.1 Drawer shell — slides in from the right 520–640px, board stays visible, closes on ESC / X / overlay click, overlay click blocked when an edit is unsaved
- [x] 4.2 Header — title, status badge, priority badge, close button
- [x] 4.3 Inline editors — status, priority, deadline; role-gated per `docs/04` with lock icon + tooltip where a User cannot edit
- [x] 4.4 Progress control — bar, percentage, slider plus quick-select; saves immediately, appends `PROGRESS_CHANGED`, shows a toast, updates the card behind the drawer
- [x] 4.5 Assignee + Reassign — dropdown lists project members only, current assignee marked, confirmation dialog, toast, `REASSIGNED` activity, card and drawer both update
- [x] 4.6 A User viewing a task they are not assigned to sees the assignee read-only with no Reassign action
- [x] 4.7 Description — click to edit, mock toolbar (bold / italic / bullet / numbered / link / image)
- [x] 4.8 Attachments — seeded records render; adding one locally previews via FileReader, no upload
- [x] 4.9 Comments — list plus input; adding one renders immediately and appends `COMMENT_ADDED`
- [x] 4.10 Activity timeline — renders all seven event types from `docs/07` §6, newest first
- [x] 4.11 `#/tasks/:taskId` deep link opens the right board with the drawer already open

**Exit criteria**
- `docs/09` "Task Detail", "Reassign" and "Progress" sections all tick
- `docs/03` Flow B completes, including the read-only case in 4.6
- Every change made in the drawer is reflected on the board card without a refresh

**Handoff:** The drawer carries the whole task story and both headline interactions work.
Flow A steps 9-11 and Flow B run end to end. What Wave 5 can rely on:

- **`Drawer`** (`js/interactions.js`) — `Drawer.open({ key, label, render, hasUnsavedEdits,
  onBlockedClose, onClose, returnFocusTo })` plus `close({silent}) / key() / panel() / isOpen() /
  nudge()`. Content-agnostic on purpose: Wave 6's Create Task drawer should call it rather than
  build a second shell. Reopening with the **same key repaints in place** — no re-animation, no
  focus steal — which is what makes a state-driven drawer cheap.
- **`Confirm`** (`js/interactions.js`) — `Confirm.open({ lead, title, body, confirmLabel, variant,
  onConfirm, onCancel })`, centred in `#modal-root` above the drawer. Wave 6's archive project and
  Wave 7's deactivate user reuse it.
- **`TaskActions`** now holds every task mutation: `moveTask` (unchanged), `setProgress`,
  `reassign`, `setPriority`, `setDeadline`, `setDescription`, `addComment`, `addAttachment`. Each
  one checks its own permission, writes silently, appends the activity `docs/07 §6` defines, and
  notifies **once** through a shared `finish(taskId)` — which also leaves the card id for the
  board to pulse. A screen must never write a task field itself.
- **`TaskDetail`** (`js/task-detail.js`, new) — `sync()` is the only entry point, called at the end
  of `App.render()`. It opens, repaints or closes the drawer from `selectedTaskId` alone. Also
  `requestClose()`, `hasUnsavedEdits()`, `refresh()`.
- **Opening the drawer from any screen** is `AppState.setState({ selectedTaskId: id })` — no hash
  change needed. Wave 5's My Tasks rows (5.3) and notification clicks (5.8) should do exactly that
  off `#/my-tasks` / `#/notifications`, and closing there drops the selection without navigating.
  On `#/tasks/:id` the URL is the source of truth instead, and closing steps back to the board.
- **New `UI` helpers** — `toDateInputValue` / `fromDateInputValue` (local-midnight, never
  `toISOString`) and `formatBytes`. New icons: `bold`, `italic`, `list`, `list-ordered`, `link`,
  `image`, `file-text`, `upload`, `pencil`, `send`.
- **New CSS** — `css/drawer.css`, linked after `board.css`. Holds `.drawer*`, `.dialog*`, every
  `.td-*`, `.range`, `.rte*`. `.task-peek` is gone from `board.js` and `board.css` per D22.

Two shared files changed in ways later waves inherit: `.progress__track` now reads as a dark groove
(D33 — it was invisible on a task card), and `--z-dropdown` moved above `--z-drawer` (D25) so a
dropdown opened inside the drawer is not clipped behind it.

Verified by four headless suites driving `index.html` from a **`file://`** URL using the page's own
script list — **190 checks, zero console errors or warnings** across the whole run. Covered: mount /
ESC / X / clean overlay click / overlay click blocked by a dirty description and by a half-written
comment; the deep link direct-loading the right board and the guard still bouncing a persona without
access; all six statuses in the dropdown including Cancelled leaving the board while the drawer
stays open; Completed forcing 100% and appending the second event; the slider previewing without
committing and committing once on release; the 0-100 clamp; Flow B end to end including Cancel
changing nothing and a non-member being refused; a User losing Reassign the moment they hand a task
on; the locked priority / deadline copy for a User and both unlocked for a Supervisor; the local
date round-trip; Bold and the list buttons really formatting; a draft surviving an unrelated
re-render; FileReader previewing an image; comment counts reaching the card; all seven activity
types rendering newest-first; the focus trap, the focus hand-back, and ESC peeling one layer at a
time; and every Wave 3 board behaviour still passing.

Four real bugs were found and fixed during that pass, all of them ordering or layering problems the
DOM will not forgive:
1. The comment draft was cleared **after** `addComment`, but the commit re-renders the drawer, so
   the posted text was read straight back into the textarea. Drafts are now cleared before the
   commit and handed back if it is refused.
2. `Drawer` and `Confirm` both bind ESC capture-phase on `document`, so `stopPropagation` cannot
   help — they fire in registration order and the drawer registered first. The drawer now stands
   down explicitly while a `Menu` or a `Confirm` is above it.
3. Focus hand-back raced the navigation that closing triggers: the card it focused was replaced a
   moment later by the board's re-render. It is now finished in `sync()`, which runs after every
   render and is the only deterministic point.
4. Bullet and numbered lists produced indentation and no markers — `base.css` resets `list-style`
   for the nav lists, and rich text needs it back.

**This is the first wave with a real visual pass.** Seven rendered screenshots were reviewed at
1280x900: the drawer as a User (priority and deadline locked), as a Supervisor (both editable), the
status dropdown floating above the drawer, the reassign dialog stacked above both, the editor with
live formatting, and the comment + activity stack. That review is what caught the invisible progress
track and the missing list markers. Still worth a human look on real hardware: the 220ms slide, the
native date picker's locale format, and the drawer at widths other than 1280.

Deliberately left for later waves: the task **title is read-only for every persona** (D27) and
**collaborators are read-only** — both belong to Wave 6's Create Task form; mention autocomplete in
comments is "optional visual" in `docs/05 §7` and was skipped; a reassign does **not** yet create a
notification for the new assignee, which Wave 5 should add when it builds the bell; and `Simulate
failure` is still task 8.5.

---

## Wave 5 — My Tasks, Notifications, Search & Filter ✅ Done

Goal: the "where is my work" half of the product, and the board becomes searchable.

**Read first:** `docs/02` S03 + S13 · `docs/05` §8, §10, §11 · `docs/03` Flow F and Flow G · `docs/07` §8

**Tasks**
- [x] 5.1 S03 My Tasks — tabs Assigned to Me / Due Today / Upcoming / Overdue / Completed
- [x] 5.2 `#/my-tasks?filter=…` honours the deep link from the Wave 2 dashboard tiles
- [x] 5.3 Task rows open the Task Detail Drawer
- [x] 5.4 Board header search box — filters cards live by title
- [x] 5.5 Board filters — assignee, priority, deadline state; filters compose with search and with the Blocked toggle
- [x] 5.6 Bell in the topbar — unread dot / count, compact dropdown, `View all notifications`
- [x] 5.7 S13 notification list — read / unread visual states, all six types from `docs/07` §8
- [x] 5.8 Clicking a notification marks it read and routes to the related task or project
- [x] 5.9 Empty states — project with no tasks, My Tasks with no overdue items, notifications with nothing unread; each explains the next action

**Exit criteria**
- `docs/09` "Notifications" section ticks
- `docs/03` Flow F and Flow G complete
- Filtering never leaves the board in a state with no way back — clearing filters restores every card

**Handoff:** The "where is my work" half of the product is in. Flow F and Flow G both run end to
end, and the `docs/09` Notifications section ticks in full. What Wave 6 can rely on:

- **`UI.taskRow(task, options)`** (`js/components.js`) — the full-width S03 row (D35): priority
  accent + badge, title, status badge, project name, deadline chip, comment/attachment counts and
  progress. A `<button>` carrying `data-task-id`, so `TaskDetail`'s focus hand-back finds it exactly
  as it finds a board card. `options.selected` marks the open one; `options.onclick` overrides the
  default `setState({ selectedTaskId })`.
- **`UI.tabBar(tabs, activeKey, options)`** — tabs as anchors, each with a live count. Tabs are
  links because the hash is the state (D36).
- **`UI.notificationSentence(n)`** plus `NOTIFICATION_LABEL / _ICON / _VARIANT` — one source of
  wording for all six `docs/07 §8` types, read by both the bell and S13, exactly as
  `activitySentence` is shared (D18).
- **`NotificationActions`** (`js/interactions.js`) — `open(notification)` marks read silently and
  opens the drawer over the current screen in one render (D37/D41), warning instead when the task is
  out of reach; `markAllRead()`; `listFor(userId)` returns newest-first.
- **`AppState`** gained `pushNotification`, `markAllNotificationsRead`, `markNotificationRead(id, {silent})`,
  `NO_FILTERS`, and the filter selectors `filtersFor / activeFilterCount / matchesFilters / filterTasks`.
  `state.filters` now carries a `projectId` (D38) — anything that resets filters must use
  `AppState.NO_FILTERS` rather than writing its own literal.
- **`Menu`** gained `autoFocus: false` and `setContent(trigger, children)` (D42), which is what makes a
  type-as-you-search panel possible. Wave 7's admin screens can reuse both.
- **`js/topbar.js`** (new, loaded after `task-detail.js`) — `Topbar.search(user)` and `Topbar.bell(user)`.
  `app.js`'s `renderTopbar` just appends what they return.
- **New CSS** — no new stylesheet and no `<link>` change. `.task-row*`, `.tab-bar` / `.tab`,
  `.filter-chip*`, `.notif-item*` / `.notif-row*`, `.menu__head` / `.menu__note` /
  `.menu__item--footer`, `.finder__mark` and `.dot-swatch` are in `css/components.css`;
  `.board__filters*`, `.column__count.is-filtered` and `.board__no-match` are in `css/board.css`.
- **`TaskActions.reassign` now notifies the new assignee** (D40). Wave 6's Create Task should decide
  whether an assignment at creation does the same — the pattern is one `AppState.pushNotification`
  call written silently before `finish()`.

Verified by ten headless suites driving `index.html` from a **`file://`** URL using the page's own
script list — **663 checks, zero console errors or warnings** across the whole run, including all
361 Wave 3 and Wave 4 checks re-run unchanged. Covered: the five tabs and their counts for four
personas; all four dashboard tile keys including `in-progress` resolving per D19 and its chip
clearing; a row opening the drawer with the hash untouched, a drawer edit reaching the row behind
it, Esc closing back to My Tasks and handing focus to the row; the bell's six rows, unread count,
Mark all read and View all footer; every `docs/07 §8` template in both the bell and S13; read/unread
carrying a word as well as a colour; a notification whose task is out of reach warning instead of
opening nothing; D40 both ways; every board filter alone, composed, and composed with search and the
Blocked toggle; `n of m` counts; a drag under an active filter; the no-match banner; per-board
filter scoping; the finder's visibility rules, focus retention, arrow-key entry, Esc, Enter, the
declared 8-result cap; and `Reset Prototype Data` from all six screens.

Four real bugs were found and fixed during that pass:
1. **Every progress bar in the prototype had been empty since Wave 1** (D44). `.progress__fill` is a
   `<span>`, and an inline box ignores `width` — so board cards, project cards and the drawer all
   drew a groove with nothing in it. One line of CSS; it changes the look of every screen.
2. The board search accepted one or two characters and went deaf (D46). Chrome fires `blur` when the
   focused node is replaced, and each keystroke re-renders the board — the caret restore has to be
   synchronous, not on the next frame.
3. Esc could not dismiss the finder (D45): Menu's Esc handler hands focus back to the input, whose
   focus handler reopened the panel. Reopening is a click now.
4. `UI.plural` produced "2 matchs". It now applies the -es rule for words ending in s/x/z/ch/sh.

**This wave had a visual pass**: thirteen screenshots at 1280×900 — My Tasks on four tabs including
both empty states, S13 read and all-caught-up, the bell dropdown, the finder panel floating over the
sidebar, and the board idle / with a filter menu open / filtered / filtered to nothing / with Blocked
open. That review is what caught the empty progress bars. The filter row costs about 48px and the
board still shows three full columns plus the edge of a fourth at 1280.

Deliberately left for later waves: `+ Add Task` still toasts until Wave 6 builds the form (D20);
mention autocomplete in comments stays skipped (`docs/05 §7` calls it optional); `Simulate failure`
is still task 8.5; the accessibility and responsive sweeps are 8.3 / 8.4. One behaviour worth
demoing deliberately: leaving a board filtered and coming back restores that board's filters (D38) —
the filter row always announces it with "n filters active · Clear all", so it is discoverable rather
than mysterious.

---

## Wave 6 — Divisions, Create Task & Project Members ✅ Done

Goal: the Supervisor story — structure above the board, and getting work onto it.

**Read first:** `docs/02` S04, S05, S09, S12 · `docs/03` Flow C · `docs/04` (all) · `docs/01` §6

**Tasks**
- [x] 6.1 S04 Divisions — cards with name, supervisor, member count, active project count; `+ New Division` for Super Admin only
- [x] 6.2 S05 Division Detail — supervisor, members, projects; `Add member` and `Create project` for Supervisor / Super Admin
- [x] 6.3 S09 Create Task drawer — title, description, assignee, collaborators, priority, status, deadline, initial progress
- [x] 6.4 Create Task validation — required-field visual state only, no production validation
- [x] 6.5 On create: task appears in To Do, `CREATED` + `ASSIGNED` activity, `Task created` toast
- [x] 6.6 Assignee dropdown offers project members only
- [x] 6.7 S12 Project Settings / Members — project info, member list, add / remove member, archive project
- [x] 6.8 A User never sees `+ Add Task`, `Create project`, or archive controls anywhere

**Exit criteria**
- `docs/09` "Supervisor Flow" section ticks
- `docs/03` Flow C completes end to end
- Switching to the User persona hides every control added in this wave

**Handoff:** The Supervisor story is in. Flow C and Flow E both run end to end, and all four
`docs/09` "Supervisor Flow" boxes tick. What Wave 7 can rely on:

- **`Modal`** (`js/interactions.js`) — `Modal.open({ title, body, lead, render, confirmLabel,
  cancelLabel, variant, onConfirm, onCancel, label })` plus `close / refresh / dialog / isOpen`.
  `render()` returns a node, and `onConfirm()` returning **`false` keeps it open** (D47) — that is
  how required-field validation works in a dialog. `refresh()` repaints the body in place for a
  picker that changed the chips it has to draw. Enter submits from any single-line input; Esc and
  the overlay cancel. Wave 7's Add User / Edit Role / Assign Division should call this, not build a
  second dialog. The drawer's `stackedAbove()` now stands down for it, so Esc peels one layer.
- **`ProjectActions`** — `create({ divisionId, name, memberIds })`, `rename`, `addMember`,
  `removeMember`, `archive`, `restore`. **`DivisionActions`** — `create({ name, supervisorId })`,
  `addMember`, `removeMember`. Same house idiom as `TaskActions`: permission check → refusal toast
  that names the rule → one write → success toast. These notify loudly on their own; there is no
  card to pulse, so no silent-then-`finish()` dance.
- **`TaskActions`** gained `createTask(projectId, draft)`, `setTitle`, `setCollaborators`.
- **`AppState`** gained `nextId(prefix, collection)` (D60), `addTask / addProject / addDivision /
  addUser`, `updateProject / updateDivision / updateUser`, and the selectors `activeProjects` /
  `archivedProjects`. `addUser` and `updateUser` are unused this wave — they are there for S10.
- **`UI`** gained `field(config)` + `setFieldError(wrapper, message)` (the whole of "required field
  visual state"), `listRow(config)`, `memberRow(user, options)`, and `divisionCard(division)`.
  New icons: `user-minus`, `folder-plus`, `archive`, `rotate-ccw`, `mail`, `trash-2`, `crown`.
- **`js/task-create.js`** (new, loaded after `task-detail.js`) — `TaskCreate.open(projectId)` is how
  any screen opens the form; `sync()` is called from `app.js` right after `TaskDetail.sync()`.
- **`js/views/project-settings.js`** (new) — S12 moved out of `board.js` (D57). The board header now
  carries the `Settings` link that finally makes `#/projects/:id/settings` reachable.
- **New CSS, no new stylesheet** (D58): `.field__error / .field__hint / .field--error` in
  `base.css`; `.panels / .panel* / .list-row* / .division-card* / .info-grid / .inline-form /
  .picker-note` in `components.css`; `.td-foot / .td-form / .chip-row / .td-select--input /
  .td-title-edit / .dialog--form / .dialog__form` in `drawer.css`.

Verified by eight new headless suites plus every prior one, all driving `index.html` from a
**`file://`** URL using the page's own script list — **1,072 checks, zero console errors or
warnings** (663 Wave 3-5 checks re-run unchanged, 409 new). Covered: Flow C end to end including the
exact `CREATED` + `ASSIGNED` activity pair and Prim's and Nina's task counts moving 16 → 17;
validation marking exactly Title and Assignee and clearing as you fix it; the assignee list being
exactly `project.memberIds`; Completed forcing 100%; Esc / X / Cancel / clean overlay click / overlay
click blocked by a typed title; a persona switch and a navigation each closing the form, and a plain
re-render *not* closing it; the two drawers swapping without fighting; Flow E including an empty form
refusing without closing; add and remove on both division and project members; the rule-6 refusal
when a member still holds work; archive → restore and the archived project vanishing from S06, the
dashboard and `scopeCounts` while its board stays reachable; the creation notification reaching
James's bell and opening the task; `Reset Prototype Data` from S04, S05, S12 and from inside an open
dialog; and a **107-check role matrix** asserting a User sees none of this wave's controls on any
screen they can reach.

One check worth knowing about: `w6-7-dead-buttons.js` patches `addEventListener` before the page
loads and tags every node given a click listener, then asserts no untagged, non-disabled `<button>`
renders anywhere — shell, both drawers, the Modal and twenty screens. It was verified against an
injected dead button, so it is not vacuous. 26/26.

**Visual pass:** 22 screenshots at 1280×900 and 1024×800. Three things it caught and fixed: a
division card said "1 active projects"; the Supervisor panel on S05 rendered the same `.list-row`
card as the Members list directly beneath it and read as a rendering bug (it is a plain inline block
now); and a field's error line sat *below* its hint instead of directly under the control.

Deliberately left for later waves: `Assign supervisor` is Super Admin work and stays in Wave 7's S11
— S05 says so in its own copy rather than offering a control; `Archive division` has no backing
field in `docs/07` and belongs to 7.3; mention autocomplete in comments stays skipped (`docs/05 §7`
calls it optional); `Simulate failure` is still task 8.5; the accessibility and responsive sweeps are
8.3 / 8.4. `AppState.addUser` / `updateUser` are in place but unused until S10.

---

## Wave 7 — Super Admin: User & Division Management ✅ Done

Goal: the administration surface, visible to exactly one persona.

**Read first:** `docs/02` S10 + S11 · `docs/03` Flow E · `docs/04` (all)

**Tasks**
- [x] 7.1 S10 User Management — list with name, email, role, divisions, status
- [x] 7.2 User actions — Add User, Edit Role, Assign Division, Activate / Deactivate, all mock
- [x] 7.3 S11 Division Management — Add Division, Edit Division, Assign Supervisor, Archive Division
- [x] 7.4 Flow E: `+ New Division` → modal → name + supervisor → Save → new card appears
- [x] 7.5 Administration nav group renders only for Super Admin
- [x] 7.6 `#/admin/*` entered directly by a non-admin persona bounces to Dashboard with an explanatory toast
- [x] 7.7 New users and divisions created here appear in the Wave 6 screens and in assignee dropdowns

**Exit criteria**
- `docs/09` "Super Admin Flow" section ticks
- `docs/03` Flow E completes
- The route guard holds for all three personas

**Handoff:** The administration surface is in, and it is visible to exactly one persona. Flow E runs
from both entry points, all four `docs/09` "Super Admin Flow" boxes tick, and the guard holds for all
six personas on both routes. What Wave 8 can rely on:

- **`UserActions`** (`js/interactions.js`, new) — `create(draft)`, `setRole(userId, role)`,
  `activate` / `deactivate(userId)`, plus `commitments(userId)` which returns
  `{ divisions, openTasks }` — what a deactivation or a demotion would strand. Same house idiom as
  `ProjectActions`: permission check → refusal toast that names the rule → one write → success
  toast. No screen writes a `user` field itself.
- **`DivisionActions`** gained `rename`, `assignSupervisor`, `archive` / `restore`. The archive pair
  is `ProjectActions.setArchived` one level up, refusal and all.
- **`AppState`** gained `isActive(user)`, `activeUsers()`, `divisionsOf(userId)`,
  `assignableMembers(projectId)` and the `activeDivisions` / `archivedDivisions` pair.
  **`assignableMembers` is now the only correct source for an assignee or collaborator picker** —
  `project.memberIds.map(getUser)` would hand work to a deactivated person.
- **`DivisionForms`** (`js/division-forms.js`, new, loaded after `task-create.js`) —
  `openNew({ onCreated })`, `openEdit`, `openAssignSupervisor`, `confirmArchive`, plus the shared
  `peoplePicker(trigger, config)` and `supervisorCandidates()`. S04 and S11 both call it (D65).
- **`js/views/admin-users.js` / `js/views/admin-divisions.js`** (new) replace `js/views/admin.js`
  (deleted). `index.html` lost one `<script>` and gained three.
- **New CSS, no new stylesheet** (D58): `.menu__item--destructive` and `.list-row.is-muted .avatar`
  in `components.css`. That is the whole of it — S10 and S11 are built from `.panel*`, `.list-row*`,
  `.badge`, `.menu*` and `.dialog--form` as they already stood.
- **New icons**: `more-vertical`, `user-check`, `user-x`.

Verified by six new headless suites plus every prior one, all driving `index.html` from a **`file://`**
URL using the page's own script list — **1,313 checks, zero console errors or warnings** (1,044 Wave
3-6 checks re-run with identical per-suite counts, 269 new). Covered: Flow E end to end from S11 and
from S04, including an empty form refusing without closing and the supervisor picker offering only
Supervisors and Super Admins; Edit Division and its empty-name refusal; Assign Supervisor moving
Marketing from Nina to Ben and Nina's `visibleProjects` collapsing from 3 to 0 while Ben's grows; Add
User with the duplicate-address, missing-`@` and empty-field refusals and the marks clearing as you
fix them; the full 7.7 chain (new user → S04 member count → S05 member list → S12 Add Member picker →
Create Task assignee menu); Edit Role including D68's warning toast and the demotion refusal; Assign
Division adding and removing in one click and refusing to strip a supervisor; all three D62 refusals
changing nothing; D61 in both directions across six different pickers plus the persona switcher;
`TaskActions.reassign` refusing an inactive assignee even when the picker is bypassed; D63's refusal,
archive, scope-line drop, still-reachable detail screen and restore; the nav group and the guard for
all six personas on both routes; and `Reset Prototype Data` from S10, from S11, and from inside an
open dialog.

The `w6-7-dead-buttons` sweep grew to cover S10, S11 and all five new dialogs (45/45). It was
re-verified against an injected dead button on S10 — 44/45 before, 45/45 after — so it is not vacuous.

**Visual pass:** 24 screenshots at 1280×900 and 1024×800 — S10 idle, its row menu, the Edit Role and
Assign Division pickers, both deactivation outcomes, the inactive row, all four Add User states, S11
idle, its row menu, the archive refusal, Assign Supervisor, Edit Division, the archive confirmation,
S11 with an Archived block, and S04 showing where the archived card went. It caught the two things in
D69: `.menu__item--destructive` had **no CSS rule whatsoever**, so `Deactivate` and `Archive Division`
read like ordinary menu items, and a muted `.list-row` was too quiet to pick out of a list of equal
rows until its avatar was dimmed too.

Deliberately left for Wave 8: `Simulate failure` is still task 8.5; mention autocomplete in comments
stays skipped (`docs/05 §7` calls it optional); the accessibility and responsive sweeps are 8.3 / 8.4
— S10 and S11 have not been checked below 1024px, and the ⋮ buttons carry `aria-label`s but the row
menus have not been through a screen-reader pass. Two things worth demoing deliberately: deactivating
**Mook** is the clean path (Ben and James both refuse, which is the better story), and archiving
**Management** is the clean path (Marketing refuses — it has three projects).

---

## Wave 8 — Polish & Acceptance ✅ Done

Goal: close out `docs/09` completely. No new screens — only refinement and verification.

**Read first:** `docs/09-PROTOTYPE-ACCEPTANCE-CHECKLIST.md` (all) · `docs/05` §1 error simulation, §9, §12 · `docs/06` §11, §12 · `docs/03` (all eight flows)

**Tasks**
- [x] 8.1 Motion audit — every transition in the 150–220ms band, drag elevation, drop-zone highlight, drawer slide, toast fade
- [x] 8.2 Hover and focus states on every interactive element; keyboard focus always visible
- [x] 8.3 Responsive — tablet collapses the sidebar and scrolls the board; mobile allows navigation and Task Detail
- [x] 8.4 Accessibility pass — readable contrast, priority and status never signalled by colour alone, icon-only buttons carry labels
- [x] 8.5 `Simulate failure` demo toggle per `docs/05` §1 — card moves, reverts, error toast
- [x] 8.6 `Reset Prototype Data` verified from every screen
- [x] 8.7 Walk all eight flows in `docs/03` start to finish; fix whatever breaks
- [x] 8.8 Tick every box in `docs/09` — anything that cannot be ticked gets written up in the Handoff
- [x] 8.9 Final check: fresh double-click of `index.html`, no console errors, no dead primary buttons

**Exit criteria**
- Every box in `docs/09` is ticked, including the "Explicitly Out of Scope" confirmations
- All eight flows in `docs/03` run without explanation
- The prototype opens from `file://` on a machine with no tooling installed

**Handoff:** The build plan is complete. All 59 boxes in `docs/09` are ticked, all eight `docs/03`
flows run end to end through the UI alone, and the prototype boots from `file://` with no console
errors. What this wave changed:

- **`Simulate failure`** (D71, D72) — profile menu toggle plus a board chip. Implemented inside
  `TaskActions.moveTask`, so drag and the drawer dropdown both fail: the card lands, reverts after
  700ms, shows an error toast, and writes no activity. `AppState.epoch()` (new) lets the delayed revert
  stand down after a Reset.
- **Contrast** (D73) — `--text-muted`, a new `--accent-fill` / `--accent-fill-hover` for anything
  that carries white text, and two avatar fills. These are the only visible colour changes, and each is
  one shade.
- **Tokens** (D76) — no stylesheet but `tokens.css` holds a raw colour any more.
- **Phone layout** (D74) — view headers wrap and list rows keep their avatar inline at ≤720px.
- **Focus / hover** (D75) — the date input's focus ring, the sidebar logo's hover.
- **Motion** (D70) — no literal duration outside `tokens.css`; the two attention animations are tokens.
- **`docs/09`** — every box ticked, with a footnote saying how.

Verified by **34 headless suites, 1,676 checks, zero console errors or warnings**, all from a
`file://` URL through the page's own script list. The 26 prior suites re-ran with per-suite counts
identical to Wave 7. The eight new ones:

| Suite | Checks | What it proves |
|---|---|---|
| `w8-1-motion` | 13 | every transition 150–220ms, parsed from the CSS on disk; drawer measured mid-slide |
| `w8-2-focus-hover` | 15 | real Tab through 10 screens, 2 drawers and a Modal; hover diffed on every distinct interactive kind |
| `w8-3-responsive` | 57 | no clipped control at 1024 / 900 / 390; rail nav; board strip scrolls; drawer, Modal and toasts fit |
| `w8-4-a11y` | 12 | WCAG AA on every visible text node across 11 screens and the drawer; labels; `lang`; dialogs named |
| `w8-5-simulate-failure` | 26 | lands, reverts, no activity, dropdown path, comment survives, reset-in-window safe, off restores |
| `w8-6-reset-everywhere` | 87 | Reset from the profile menu on 11 routes and inside 4 overlays |
| `w8-7-flows` | 59 | Flows A–H in one session, clicks and drags only, no page reload |
| `w8-9-dead-buttons` | 53 | the full sweep plus the failure chip, the profile menu, and the out-of-scope greps |

Three sweeps each caught something before they passed, so none of them is vacuous. The focus sweep
found the date input. The contrast sweep found `--text-muted` failing on nearly every screen. The first
version of the responsive check passed while buttons hung off a phone screen; the screenshots showed
that, and the check was rewritten to catch it before the fix went in. No flow broke during 8.7. Its
only failures were test selectors.

**What is still not proven — please do this before calling the prototype accepted:** no human has
opened it in a real browser window at any point in eight waves. Every check is headless and every
design judgement came from screenshots. Two `docs/09` boxes, "Trello-like ease of scanning" and "No
overcrowded admin-dashboard feeling", rest entirely on that screenshot review. Double-click
`index.html` and look at:
1. a drag across the board, with its drop-zone highlight and landing pulse;
2. the drawer slide and the native date picker;
3. the slightly lighter muted grey and deeper button purple from D73;
4. `Simulate failure` from the profile menu, then one drag;
5. the window narrowed to phone width.

The contrast check skips deliberately dimmed elements (completed cards, archived and inactive rows,
disabled controls). Those are below AA on purpose, and a strict reviewer may want them revisited.
Mention autocomplete in comments stays unbuilt, since `docs/05 §7` calls it optional.

---

## After the plan — TH / EN switch (D77) ✅ Done

Asked for after Wave 8 closed. Not a wave of its own; recorded here so the next session finds it.

- **New files:** `js/i18n.js` (the `T()` / `soft()` / `labels()` / `plural()` core) and
  `js/i18n-th.js` (the Thai), both loaded right after `state.js`. `state.locale` is `'en'` or `'th'`.
- **Changed:** ~150 built sentences across 18 files became `T()` templates; `UI.el()`,
  `UI.setFieldError()` and the drawer label pass their strings through the dictionary; status,
  priority, role, deadline, notification and lock-reason maps translate on read; dates use Thai
  month abbreviations; `UI.langSwitch()` + `.lang-switch` CSS; the profile menu's language item.
- **How the Thai was gathered:** every `T()` template statically, plus every string that reached the
  dictionary untranslated while the whole 34-suite battery ran in Thai. Then a Thai-mode scan
  (`w9-th-scan`) opened every screen, drawer, dialog, menu and toast and required that no interface
  text remain in English once mock data is set aside. It found 11 stragglers before it passed.
- **Verified:** all 34 English suites unchanged (1,676 / 1,676); in Thai, the responsive (57/57),
  focus/hover (15/15) and contrast checks pass, plus the switch suite (22/22) and the scan (2/2).
  Two visual fixes came out of the Thai screenshots: the inactive switch option drew a light pill,
  and letter-spaced headings pulled Thai glyphs apart.
- **Not covered:** the translations are one person's reading of the English. A native reviewer
  should read the Thai once, especially toast wording and the role names (ผู้ดูแลระบบ / หัวหน้างาน / ผู้ใช้).
  English suites that assert English words fail in Thai by design and were not run that way.
