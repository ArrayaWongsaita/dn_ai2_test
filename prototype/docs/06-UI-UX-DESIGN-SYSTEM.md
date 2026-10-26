# UI/UX Design System — Dark Purple Trello-like

## 1. Experience Direction
Keywords:
- Simple
- Clear
- Card-first
- Fast to scan
- Friendly productivity tool
- Modern dark purple
- Premium but not flashy

Reference feeling: Trello's ease of use and board mental model, but do **not** visually clone Trello.

Avoid:
- Enterprise dashboard clutter
- Too many charts
- Heavy glassmorphism everywhere
- Neon overload
- Excessive gradients
- Tiny text
- Dense tables as the default experience

---

## 2. Color Direction
Suggested design tokens:

```css
--bg-app: #0d0a16;
--bg-sidebar: #120d20;
--bg-surface: #181126;
--bg-surface-hover: #211633;
--bg-card: #21182f;
--bg-card-hover: #2a1e3b;
--border: #35264a;

--purple-primary: #8b5cf6;
--purple-bright: #a78bfa;
--purple-deep: #6d28d9;
--indigo-accent: #6366f1;

--text-primary: #f7f5fb;
--text-secondary: #b8aec7;
--text-muted: #81758f;

--success: #34d399;
--warning: #fbbf24;
--danger: #fb7185;
--info: #60a5fa;
```

Actual colors may be refined during prototype, but preserve the hierarchy:
near-black purple base + purple primary + restrained status colors.

---

## 3. Typography
Prefer modern sans serif:
- Inter
- Geist
- Manrope
- system-ui fallback

Guideline:
- Page title: 24–30px
- Section title: 16–20px
- Card title: 14–16px medium/semibold
- Supporting text: 12–14px

---

## 4. Layout
### App Shell
- Sidebar: 240–260px expanded
- Topbar: 56–64px
- Main content fluid

### Kanban
- Column width around 300–340px
- Gap 16px
- Rounded surface
- Horizontal overflow allowed

Do not force all columns to shrink until unreadable.

---

## 5. Task Card
Card hierarchy:
1. Priority / small metadata
2. Task title
3. Assignee + deadline
4. Progress bar
5. comments / attachments indicators

Card style:
- 10–14px radius
- subtle border
- subtle hover lift
- no giant shadows

Overdue:
- make deadline text/badge danger color
- avoid painting entire card red

---

## 6. Status Columns
Each column has:
- Status name
- task count
- optional subtle status marker

Do not use extremely saturated full-column colors.

---

## 7. Buttons
### Primary
Purple filled

### Secondary
Dark surface + border

### Destructive
Danger accent, used sparingly

Button labels must be explicit:
- `Add Task`
- `Add Member`
- `Reassign`

Avoid vague labels such as `Submit` when the action can be named.

---

## 8. Forms
- Labels above fields
- sensible spacing
- clear focus ring in purple
- dropdowns consistent
- no oversized forms

Create Task should feel quick, not like filling an ERP form.

---

## 9. Drawer / Modal
Task Detail: Drawer preferred
Create/Edit dialogs: Drawer or Modal

Use overlays with restrained opacity and no excessive blur.

---

## 10. Icons
Use one consistent icon set, e.g. Lucide.

Suggested:
- LayoutDashboard
- CheckSquare
- Layers
- FolderKanban
- Bell
- Users
- Settings
- Calendar
- Paperclip
- MessageSquare

---

## 11. Micro-interactions
- 150–220ms transitions
- hover states
- drag elevation
- drop zone highlight
- drawer slide
- toast fade/slide

Motion should feel responsive, not decorative.

---

## 12. Accessibility for Prototype
- minimum readable contrast
- keyboard focus visible
- buttons use labels/title where needed
- do not rely on color alone for priority/status
