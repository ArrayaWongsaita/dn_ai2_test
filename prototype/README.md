# Task Management & Assignment System — HTML Prototype

Clickable HTML prototype ของระบบ Task Management & Assignment ใช้ทดสอบ Product Flow และ UX ก่อนเริ่มพัฒนาระบบจริง

**สถานะปัจจุบัน:** Wave 1–6 เสร็จแล้ว (app shell, dashboard, Kanban + drag & drop, Task Detail
drawer, My Tasks / Notifications / Search, Divisions + Create Task + Project Members) ·
ถัดไปคือ Wave 7 — Super Admin · รายละเอียดใน [`TODO.md`](TODO.md)

---

## วิธีเปิด
ดับเบิลคลิก `index.html` — ไม่ต้องลง dependency ไม่ต้องรัน server ไม่ต้อง build

เข้าหน้าแรกแล้วเลือก persona (Super Admin / Supervisor / User) เพื่อทดลองสิทธิ์ที่ต่างกัน
สลับ persona ระหว่างทางได้จากเมนูโปรไฟล์มุมซ้ายล่าง ซึ่งมี `Reset Prototype Data` อยู่ด้วย

---

## โครงสร้างโฟลเดอร์
```text
prototype/
├── README.md      # ไฟล์นี้
├── CLAUDE.md      # คำสั่งสำหรับ coding agent — แหล่งความจริงเดียว
├── TODO.md        # แผน build แบ่งเป็น 8 wave + ความคืบหน้า + decisions
├── AGENTS.md      # ชี้ไป CLAUDE.md
├── docs/          # เอกสาร spec 9 ไฟล์
├── index.html     # app shell + ลำดับโหลด script (classic scripts เท่านั้น)
├── css/           # tokens · base · layout · components · board · drawer
├── js/            # mock-data · state · permissions · components · interactions
│                  # · task-detail · task-create · topbar · views/ · router · app
└── assets/
```

---

## เอกสาร
อ่านตามลำดับนี้ถ้าเพิ่งเข้าโปรเจกต์

| # | ไฟล์ | เนื้อหา |
|---|---|---|
| 01 | [PRD](docs/01-PROTOTYPE-PRD.md) | ขอบเขต, roles, business rules, task fields, status/priority |
| 02 | [Screens & Navigation](docs/02-SCREENS-NAVIGATION.md) | App shell, หน้าจอ S01–S13, hash routes |
| 03 | [User Flows](docs/03-USER-FLOWS.md) | Flow A–H ที่ต้องกดผ่านได้จริง |
| 04 | [Role & Permission](docs/04-ROLE-PERMISSION-PROTOTYPE.md) | ตารางสิทธิ์ว่า role ไหนเห็น/กดอะไรได้ |
| 05 | [Interactions & States](docs/05-INTERACTIONS-STATES.md) | Drag & drop, drawer, toast, empty state, filter |
| 06 | [UI/UX Design System](docs/06-UI-UX-DESIGN-SYSTEM.md) | Dark purple tokens, typography, layout, card, motion |
| 07 | [Mock Data](docs/07-MOCK-DATA.md) | Users, divisions, projects, tasks, activity, notifications |
| 08 | [Implementation Guide](docs/08-IMPLEMENTATION-GUIDE.md) | โครงไฟล์, state shape, routing, reset demo data |
| 09 | [Acceptance Checklist](docs/09-PROTOTYPE-ACCEPTANCE-CHECKLIST.md) | นิยามของคำว่าเสร็จ |

ข้อจำกัดด้านเทคนิคทั้งหมด (vanilla HTML/CSS/JS, ต้องรันจาก `file://`, ห้าม ES modules) อยู่ใน [`CLAUDE.md`](CLAUDE.md)

## แผนการ build
[`TODO.md`](TODO.md) แบ่งงานเป็น **8 wave** โดย 1 wave = 1 รอบสั่ง AI ทำงานก่อน `/clear`
เปิดไฟล์นี้ก่อนเสมอเมื่อกลับมาทำต่อ — จะบอกว่าตอนนี้อยู่ wave ไหน ต้องอ่าน doc ไหน และ task ถัดไปคืออะไร

---

## เป้าหมาย
Prototype ต้องช่วยให้ Stakeholder สามารถ:
- เปิดดูหน้าหลักทั้งหมด และกดเปลี่ยนหน้าได้
- ทดลองมุมมองตาม Role
- ทดลอง Drag & Drop Task ระหว่าง Status
- เปิด/ปิด Task Detail
- ทดลอง Reassign Task
- ทดลองเปลี่ยน Progress
- ทดลอง Comment / Attachment / Notification แบบ Mock
- ตรวจสอบว่า Flow และ UX เข้าใจง่ายก่อนเริ่ม Backend

## สิ่งที่ยังไม่ต้องทำในเฟสนี้
Backend · REST/GraphQL API · Database จริง · Authentication จริง · Email จริง · File upload จริง · Server-side authorization · Production deployment · Security implementation

ข้อมูลทั้งหมดใน Prototype ใช้ **Mock Data ใน JavaScript**
