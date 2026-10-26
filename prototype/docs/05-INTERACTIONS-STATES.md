# Interactions & UI States

## 1. Drag & Drop Kanban
### Required behavior
- Entire Task Card can be dragged using a clear cursor / drag affordance
- Dragging over another column highlights drop zone
- On drop, card moves to target column
- Task count updates
- Status badge updates
- Activity log updates in memory
- Show small toast confirmation

### Completed behavior
Dropping into Completed:
- Set status `Completed`
- Set progress `100%`

### Prototype error simulation
Optional: include a small developer/demo toggle `Simulate failure`
When enabled, after drop:
- card briefly moves
- then returns to original column
- toast error appears

This demonstrates optimistic update behavior without a backend.

---

## 2. Task Detail Drawer
- Slide in from right
- Board remains visible in background
- ESC closes drawer
- X closes drawer
- Clicking overlay closes unless form has unsaved edits

Desktop width target: about 520–640px

---

## 3. Edit in place
Prefer lightweight inline controls:
- Status dropdown
- Assignee dropdown
- Priority dropdown
- Progress slider
- Deadline picker mock

Description may enter edit mode on click

---

## 4. Reassign
- Only valid users appear in dropdown
- Current assignee clearly marked
- User role only reassigns tasks assigned to themselves
- confirmation recommended
- on success update card + drawer + activity log

---

## 5. Progress
Components:
- horizontal progress bar
- percentage label
- slider / quick select

Suggested interaction:
- click progress control
- choose/drag new value
- save immediately in prototype state
- show toast

---

## 6. Rich Text / Images
Prototype does not need a production editor.

Provide a convincing mock editor toolbar:
- Bold
- Italic
- Bullet
- Numbered list
- Link
- Image

Support optional fake image drop/paste interaction:
- Dropped/pasted image can be rendered as local preview using browser FileReader / clipboard if easy
- No upload server needed

If implementing clipboard images becomes distracting, visual simulation is acceptable for prototype phase.

---

## 7. Comments
- Input box at bottom of comment section
- Add Comment updates local state
- comment appears immediately
- optional mention autocomplete visual

---

## 8. Notifications
Bell icon:
- unread dot / count
- click opens compact dropdown
- `View all notifications`

Click item:
- mark read
- route to related task/project

---

## 9. Toasts
Use short non-blocking toasts:
- Task moved to In Progress
- Progress updated to 70%
- Task reassigned to Aom
- Comment added
- Task created

---

## 10. Empty States
Must prototype at least:
- Project with no tasks
- My Tasks with no overdue items
- Notification list with no unread items

Empty state should explain next action where appropriate.

---

## 11. Search & Filter
Kanban header can support:
- Search text
- Assignee filter
- Priority filter
- Deadline state filter

Filtering happens on mock data only.

---

## 12. Responsive Behavior
Primary target: Desktop 1280px+

Tablet:
- Sidebar collapses
- Board scrolls horizontally

Mobile:
- not primary
- allow navigation and basic Task Detail
- Kanban can horizontally scroll
