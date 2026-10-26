# Screens & Navigation

## 1. Global Layout
ใช้ App Shell เดียวกันเกือบทุกหน้า

### Left Sidebar
- Logo / Product name
- Dashboard
- My Tasks
- Divisions
- Projects
- Notifications
- Administration (เฉพาะ Role ที่มีสิทธิ์)
- User profile / Role switcher ด้านล่าง

Sidebar สามารถ Collapse ได้

### Top Bar
- Breadcrumb
- Search
- Quick filter / contextual action
- Notification bell
- User avatar

---

## 2. Screen Inventory

### S01 — Mock Login / Role Switcher
จุดประสงค์: ไม่ทำ Auth จริง แต่ให้เลือก persona เพื่อทดลอง permission

UI:
- Product logo
- “Continue as”
- Super Admin
- Supervisor
- User

เมื่อเลือกแล้วพาเข้า Dashboard

---

### S02 — Dashboard
แสดงภาพรวมงานแบบสั้นและ actionable

Sections:
- Welcome + role
- My Tasks summary
- Due Today
- Overdue
- In Progress
- Recently Updated
- Project cards

ไม่ทำ dashboard แบบ BI หนัก ๆ

---

### S03 — My Tasks
List / compact board ของ Task ที่เกี่ยวข้องกับผู้ใช้ปัจจุบัน

Tabs / filters:
- Assigned to Me
- Due Today
- Upcoming
- Overdue
- Completed

Task click → Task Detail

---

### S04 — Divisions
แสดง Division cards

Card:
- Division name
- Supervisor
- Member count
- Active project count

Super Admin มีปุ่ม `+ New Division`
User ปกติไม่มี

---

### S05 — Division Detail
ข้อมูล:
- Division name
- Supervisor
- Members
- Projects

Supervisor / Super Admin มี action:
- Add member
- Create project

---

### S06 — Projects
แสดง Project cards หรือ list

Project card:
- Project name
- Division
- Member avatars
- Task counts
- Completion percentage

---

### S07 — Project Kanban Board
หน้าหลักสำคัญที่สุดของ Prototype

Header:
- Breadcrumb
- Project name
- Member avatars
- Search
- Filters
- View toggle (optional mock)
- `+ Add Task` เฉพาะ Supervisor / Super Admin

Board columns:
- To Do
- In Progress
- Review
- Completed

แต่ละ Column:
- Status title
- Task count
- Scroll independently หรือ board scroll แนวนอน

Task Card click → Task Detail Drawer
Task Card drag → Change status

---

### S08 — Task Detail Drawer
Prefer right-side drawer บน Desktop เพื่อรักษา context ของ Kanban

Sections:
- Title
- Status
- Priority
- Assignee
- Collaborators
- Deadline
- Progress
- Description
- Attachments
- Comments
- Activity

User actions แสดงตาม Role

---

### S09 — Create Task
Supervisor / Super Admin only

สามารถเป็น Modal หรือ Drawer

Fields:
- Title
- Description
- Assignee
- Collaborators
- Priority
- Status
- Deadline
- Progress initial value

Prototype validation แค่ required field visual state

---

### S10 — User Management
Super Admin only

Table/List:
- Name
- Email
- Role
- Divisions
- Status

Actions:
- Add User
- Edit Role
- Assign Division
- Activate / Deactivate

ทั้งหมดเป็น mock interaction

---

### S11 — Division Management
Super Admin only

Actions:
- Add Division
- Edit Division
- Assign Supervisor
- Archive Division

---

### S12 — Project Settings / Members
Supervisor / Super Admin

Sections:
- Project info
- Members
- Add member
- Remove member
- Archive project

---

### S13 — Notifications
Notification list:
- Assigned task
- Reassigned task
- Mention
- Deadline changed
- Due soon
- Overdue

รองรับ Read / Unread visual state

---

## 3. Navigation Rules
- Logo → Dashboard
- Division card → Division Detail
- Project card → Project Kanban
- Task card → Task Detail Drawer
- Notification item → เปิด Task Detail หรือ Project ที่เกี่ยวข้อง
- Breadcrumb ต้อง clickable เพื่อกลับระดับก่อนหน้า

---

## 4. Route Table
Hash routing ใน single-page HTML + JS router ไฟล์เดียว ไม่ต้องแยกหลาย HTML file

| Route | Screen | เข้าถึงได้โดย |
|---|---|---|
| `#/login` | S01 Mock Login / Role Switcher | ทุกคน |
| `#/dashboard` | S02 Dashboard | ทุก role |
| `#/my-tasks` | S03 My Tasks | ทุก role |
| `#/my-tasks?filter=overdue` | S03 พร้อม filter ที่เลือกไว้ | ทุก role — ใช้จาก Dashboard tile |
| `#/divisions` | S04 Divisions | ทุก role (เห็นตามสิทธิ์) |
| `#/divisions/:divisionId` | S05 Division Detail | member ของ division, Supervisor, Super Admin |
| `#/projects` | S06 Projects | ทุก role (เห็นตามสิทธิ์) |
| `#/projects/:projectId` | S07 Project Kanban Board | member ของ project, Supervisor, Super Admin |
| `#/projects/:projectId/settings` | S12 Project Settings / Members | Supervisor, Super Admin |
| `#/tasks/:taskId` | เปิด Board ของ Task นั้นพร้อมกาง Task Detail Drawer (S08) | ใครที่เห็น Task นั้น |
| `#/notifications` | S13 Notifications | ทุก role |
| `#/admin/users` | S10 User Management | Super Admin |
| `#/admin/divisions` | S11 Division Management | Super Admin |

### กฎของ Router
- Route ที่ไม่รู้จัก → `#/dashboard`
- Route ที่ role ปัจจุบันเข้าไม่ได้ → เด้งกลับ `#/dashboard` + toast แจ้งเหตุผล
- ยังไม่เลือก persona → เด้งไป `#/login`
- S08 Task Detail ไม่ใช่หน้าจอแยก เป็น drawer ที่กางทับหน้าปัจจุบัน `#/tasks/:taskId` มีไว้ให้ Notification และลิงก์ภายนอกเปิดตรงได้
- S09 Create Task เป็น drawer/modal ไม่มี route ของตัวเอง
