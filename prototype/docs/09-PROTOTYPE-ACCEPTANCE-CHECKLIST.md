# Prototype Acceptance Checklist

## Navigation
- [x] Can enter as Super Admin
- [x] Can enter as Supervisor
- [x] Can enter as User
- [x] Sidebar links work
- [x] Breadcrumb links work
- [x] Project card opens Kanban
- [x] Task card opens detail drawer

## Role Behavior
- [x] User does not see Add Task
- [x] User does not see Archive/Delete Task
- [x] Supervisor sees Add Task
- [x] Super Admin sees administration screens
- [x] Data visibility changes between personas

## Kanban
- [x] Four main columns visible
- [x] Task cards can be dragged
- [x] Column task count updates
- [x] Status updates after drop
- [x] Activity log updates after drop
- [x] Completed sets Progress = 100%

## Task Detail
- [x] Title visible
- [x] Assignee visible
- [x] Priority visible
- [x] Deadline visible
- [x] Progress visible
- [x] Description visible
- [x] Attachments visible
- [x] Comments visible
- [x] Activity timeline visible

## Reassign
- [x] Current assignee can reassign own task
- [x] Only project members appear
- [x] Confirmation interaction exists
- [x] UI updates after reassign
- [x] Activity log records reassign

## Progress
- [x] Progress can be changed
- [x] Card progress updates
- [x] Detail progress updates
- [x] Activity log records change

## Supervisor Flow
- [x] Add Task opens form
- [x] Form can create mock task
- [x] New task appears on board
- [x] Project members can be viewed/managed visually

## Super Admin Flow
- [x] User Management screen exists
- [x] Division Management exists
- [x] Can visually add/edit mock user
- [x] Can visually create mock division

## Notifications
- [x] Bell shows unread state
- [x] Dropdown opens
- [x] Notification item is clickable
- [x] Clicking can open related task
- [x] Read state updates visually

## UI Quality
- [x] Dark purple theme consistent
- [x] Trello-like ease of scanning
- [x] No overcrowded admin-dashboard feeling
- [x] Hover/focus states exist
- [x] Drawer/modal transitions feel responsive
- [x] Board works at common desktop width

## Explicitly Out of Scope
- [x] No API implementation
- [x] No database
- [x] No real email
- [x] No production authentication

---

Ticked at the close of Wave 8 (2026-09-27). Each box is backed by a named headless check run
from `file://`, except "Trello-like ease of scanning" and "No overcrowded admin-dashboard feeling",
which rest on a visual review of screenshots. See the Wave 8 Handoff in `TODO.md`, which also
lists what still needs a human look in a real browser window.
