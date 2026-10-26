# Mock Data Specification

Fixed JavaScript objects/arrays in `js/mock-data.js`. No database models, no JSON files
(`file://` blocks `fetch`). This file is the contract — build the dataset exactly as specified
so every persona and every visual state has something to show.

---

## 1. Date rule — read this first

**Never hardcode calendar dates.** Deadlines and timestamps are computed relative to "now" when
the page loads, so the demo never goes stale:

```js
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow  = (n) => new Date(Date.now() + n * DAY);
const hoursAgo     = (n) => new Date(Date.now() - n * 60 * 60 * 1000);

// deadline: daysFromNow(-3) → always Overdue
// deadline: daysFromNow(0)  → always Due today
// deadline: null            → no deadline set
```

Deadline state thresholds are defined in `01-PROTOTYPE-PRD.md` §9.

---

## 2. Users

`SUPER_ADMIN` | `SUPERVISOR` | `USER` · status `ACTIVE` | `INACTIVE`

| id | name | email | role | avatar | status |
|---|---|---|---|---|---|
| `u1` | Prim | prim@company.test | SUPER_ADMIN | P | ACTIVE |
| `u2` | Nina | nina@company.test | SUPERVISOR | N | ACTIVE |
| `u3` | James | james@company.test | USER | J | ACTIVE |
| `u4` | Aom | aom@company.test | USER | A | ACTIVE |
| `u5` | Ben | ben@company.test | SUPERVISOR | B | ACTIVE |
| `u6` | Mook | mook@company.test | USER | M | ACTIVE |

```js
{ id: 'u1', name: 'Prim', email: 'prim@company.test', role: 'SUPER_ADMIN', avatar: 'P', status: 'ACTIVE' }
```

`u5` and `u6` exist so role switching demonstrates a *different* division and an *empty* board —
without them every persona sees the same data and the permission demo proves nothing.

---

## 3. Divisions

```js
{ id: 'd1', name: 'Marketing', supervisorId: 'u2', memberIds: ['u2','u3','u4'] }
```

| id | name | supervisor | members |
|---|---|---|---|
| `d1` | Marketing | Nina (`u2`) | u2, u3, u4 |
| `d2` | Admin | Ben (`u5`) | u5, u6 |
| `d3` | Management | Prim (`u1`) | u1 |

---

## 4. Projects

```js
{ id: 'p1', name: 'Facebook Campaign Q4', divisionId: 'd1', memberIds: ['u2','u3','u4'], status: 'ACTIVE' }
```

| id | name | division | members | note |
|---|---|---|---|---|
| `p1` | Facebook Campaign Q4 | d1 | u2, u3, u4 | main demo board — all columns populated |
| `p2` | New Website Launch | d1 | u2, u4 | James is **not** a member → visibility demo |
| `p3` | Office Operations | d2 | u5, u6 | **no tasks** → empty-state demo |
| `p4` | Brand Refresh 2027 | d1 | u2, u3 | gives James a second project |

`memberIds` drives two business rules: who can be assigned a task, and which projects a User sees.

---

## 5. Tasks

```js
{
  id: 't1',
  projectId: 'p1',
  title: 'Prepare Facebook Ad Creative',
  description: '...',
  status: 'TODO',              // TODO | IN_PROGRESS | REVIEW | COMPLETED | BLOCKED | CANCELLED
  priority: 'HIGH',            // LOW | MEDIUM | HIGH | URGENT
  assigneeId: 'u3',            // exactly one; must be in project.memberIds
  collaboratorIds: ['u4'],
  progress: 10,                // 0–100
  deadline: daysFromNow(5),    // or null
  createdById: 'u2',
  createdAt: hoursAgo(72),
  activity: [ /* §6 */ ],
  comments: [ /* §7 */ ],
  attachments: [ /* §7 */ ]
}
```

### Facebook Campaign Q4 (`p1`)

| id | title | status | priority | assignee | progress | deadline | extras |
|---|---|---|---|---|---|---|---|
| `t1` | Prepare Facebook Ad Creative | TODO | HIGH | u3 James | 10 | `daysFromNow(5)` | 2 comments, 1 attachment |
| `t2` | Draft Q4 Audience Targeting Brief | TODO | MEDIUM | u4 Aom | 0 | `daysFromNow(2)` | due soon |
| `t3` | Collect Competitor Ad Examples | TODO | LOW | u3 James | 0 | `null` | no deadline |
| `t4` | Review Landing Page Copy | IN_PROGRESS | URGENT | u4 Aom | 65 | `daysFromNow(0)` | due today, 3 comments |
| `t5` | Set Up Conversion Tracking | IN_PROGRESS | HIGH | u3 James | 35 | `daysFromNow(1)` | |
| `t6` | Finalize Campaign Tracking Sheet | REVIEW | MEDIUM | u3 James | 90 | `daysFromNow(-2)` | **overdue** |
| `t7` | Proofread Ad Headlines | REVIEW | LOW | u4 Aom | 80 | `daysFromNow(4)` | |
| `t8` | Publish Campaign Assets | COMPLETED | HIGH | u4 Aom | 100 | `daysFromNow(-1)` | past deadline but Completed wins |
| `t9` | Book Media Placement Slots | COMPLETED | MEDIUM | u2 Nina | 100 | `daysFromNow(-6)` | |
| `t10` | Confirm Budget Approval | BLOCKED | URGENT | u3 James | 40 | `daysFromNow(-4)` | overdue + blocked |
| `t11` | Get Legal Sign-off on Claims | BLOCKED | HIGH | u2 Nina | 20 | `daysFromNow(3)` | |
| `t12` | Run Influencer Outreach Pilot | CANCELLED | LOW | u4 Aom | 15 | `null` | filter-only |

### New Website Launch (`p2`)

| id | title | status | priority | assignee | progress | deadline |
|---|---|---|---|---|---|---|
| `t13` | Finalize Sitemap | IN_PROGRESS | HIGH | u4 Aom | 50 | `daysFromNow(7)` |
| `t14` | Write Homepage Copy | TODO | MEDIUM | u2 Nina | 0 | `daysFromNow(10)` |

### Brand Refresh 2027 (`p4`)

| id | title | status | priority | assignee | progress | deadline |
|---|---|---|---|---|---|---|
| `t15` | Audit Existing Brand Assets | TODO | MEDIUM | u3 James | 5 | `daysFromNow(14)` |
| `t16` | Shortlist Design Agencies | REVIEW | LOW | u2 Nina | 70 | `daysFromNow(-5)` |

### Office Operations (`p3`)
No tasks. This is deliberate — it is the empty-board state from `05-INTERACTIONS-STATES.md` §10.

### Coverage this dataset guarantees
- Every Kanban column in `p1` holds more than one card
- All 4 priorities, all 6 statuses, all 5 deadline states, plus "no deadline"
- `t1/t3/t5/t6/t10/t15` are assigned to James → he can reassign them
- `t2/t4/t7/t8/t9/t11/t12` are not → his assignee field must render read-only

---

## 6. Activity events

Every task carries a seeded activity list. Newest last; the timeline renders newest first.

```js
{ id: 'a1', taskId: 't1', type: 'STATUS_CHANGED', actorId: 'u3',
  from: 'TODO', to: 'IN_PROGRESS', at: hoursAgo(5) }
```

| type | extra fields | rendered as |
|---|---|---|
| `CREATED` | — | Nina created this task |
| `ASSIGNED` | `to` (userId) | Nina assigned this task to James |
| `STATUS_CHANGED` | `from`, `to` | James moved this task from To Do to In Progress |
| `PROGRESS_CHANGED` | `from`, `to` (numbers) | James changed progress from 20% to 50% |
| `REASSIGNED` | `from`, `to` (userIds) | James reassigned this task from James to Aom |
| `DEADLINE_CHANGED` | `from`, `to` (dates) | Nina changed the deadline to 12 Oct |
| `COMMENT_ADDED` | `commentId` | Aom commented |

Seed at least one `CREATED` on every task, and give `t1`, `t4`, `t6` a richer history (4–6 events
covering reassign, progress, and deadline changes) so the timeline has something to show.

---

## 7. Comments & attachments

```js
// comment
{ id: 'c1', taskId: 't1', authorId: 'u2', body: 'Can we get the 1080x1080 version too?', at: hoursAgo(20) }

// attachment — no upload backend; seeded records carry a name + fake size only
{ id: 'f1', taskId: 't1', name: 'ad-brief-v2.pdf', size: '248 KB',
  uploadedById: 'u2', at: hoursAgo(30), url: null }
```

Attachments added at runtime use `URL.createObjectURL()` / FileReader for a local preview
(`08-IMPLEMENTATION-GUIDE.md` §8).

---

## 8. Notifications

```js
{ id: 'n1', userId: 'u3', type: 'TASK_ASSIGNED', taskId: 't1', projectId: 'p1',
  actorId: 'u2', read: false, at: hoursAgo(2) }
```

Seed all six types for James (`u3`) so the bell has an interesting unread state, and a couple for
Aom (`u4`):

| type | message template |
|---|---|
| `TASK_ASSIGNED` | Nina assigned you "Prepare Facebook Ad Creative" |
| `TASK_REASSIGNED` | James reassigned "Review Landing Page Copy" to you |
| `MENTION` | Aom mentioned you in "Finalize Campaign Tracking Sheet" |
| `DEADLINE_CHANGED` | Nina changed the deadline of "Set Up Conversion Tracking" |
| `DUE_SOON` | "Draft Q4 Audience Targeting Brief" is due in 2 days |
| `OVERDUE` | "Confirm Budget Approval" is overdue |

At least 3 unread. Clicking an item marks it read and routes to the related task.

---

## 9. Personas & expected visibility

App state keeps `currentUserId`; role comes from that user. The login screen (S01) offers three
entry points, and the profile menu can switch to any of the six users for a deeper demo.

| S01 option | user |
|---|---|
| Continue as Super Admin | Prim (`u1`) |
| Continue as Supervisor | Nina (`u2`) |
| Continue as User | James (`u3`) |

Use this table as the expected result when testing role switching:

| Persona | Divisions visible | Projects visible | Tasks visible |
|---|---|---|---|
| Prim — SUPER_ADMIN | 3 (all) | 4 (all) | 16 |
| Nina — SUPERVISOR (Marketing) | 1 — Marketing | 3 — p1, p2, p4 | 16 |
| Ben — SUPERVISOR (Admin) | 1 — Admin | 1 — p3 | 0 → empty state |
| James — USER | Marketing (as member) | 2 — p1, p4 | 14 |
| Aom — USER | Marketing (as member) | 2 — p1, p2 | 14 |
| Mook — USER | Admin (as member) | 1 — p3 | 0 → empty state |

If a persona's counts do not match this table, the visibility rules are wrong.

---

## 10. Reset

`state.js` exposes `resetDemoData()` which rebuilds the whole dataset from this spec, re-evaluating
the relative dates. Wired to `Reset Prototype Data` in the profile menu.
