# Prototype PRD — Task Management & Assignment System

## 1. Purpose
สร้าง HTML Prototype สำหรับทดสอบ Product Flow และ User Experience ของระบบจัดการงานภายในองค์กร

ระบบจริงในอนาคตมีโครงสร้าง:

Organization → Division → Project → Task

Prototype นี้ต้องแสดงให้เห็นว่าโครงสร้างดังกล่าวใช้งานจริงแล้วเข้าใจง่ายหรือไม่ โดยเน้น interaction หลักแทนการเชื่อมต่อระบบจริง

---

## 2. Product Goals
ผู้ใช้ควรสามารถเข้าใจได้ภายในไม่กี่วินาทีว่า:
- งานของฉันอยู่ตรงไหน
- Project นี้มีงานอะไรบ้าง
- งานไหนเร่งด่วน
- งานไหนใกล้ Deadline หรือ Overdue
- ใครเป็นคนรับผิดชอบ
- งานอยู่สถานะไหน
- Progress เท่าไร
- จะลาก Task ไปสถานะต่อไปได้อย่างไร
- จะ Reassign งานอย่างไร
- จะเปิดรายละเอียด Task อย่างไร

UX ต้องให้ความรู้สึกคล้าย Trello ในแง่ความเรียบง่ายและ Card-first workflow แต่มี Visual Identity เป็น Dark Purple Modern Product

---

## 3. Prototype Scope

### Included
- Mock Login / Role Switcher
- Dashboard
- My Tasks
- Division List
- Project List
- Project Kanban Board
- Task Detail Drawer / Modal
- Create Task UI สำหรับ Supervisor / Super Admin
- Reassign Task
- Update Task Status ผ่าน Drag & Drop
- Update Progress
- Priority
- Deadline
- Comments แบบ Mock
- Attachments แบบ Mock
- Activity Timeline แบบ Mock
- Notification Center แบบ Mock
- User Management UI สำหรับ Super Admin
- Division Management UI สำหรับ Super Admin
- Project Management UI สำหรับ Supervisor
- Empty / Loading-like / Error-like states แบบจำลอง

### Not Included
- Backend/API
- Database
- Email delivery
- Real authentication
- Real file upload/storage
- Password reset จริง
- Permission security ฝั่ง server
- Real-time collaboration
- Production-grade validation

---

## 4. Roles

### Super Admin
สามารถเข้าถึง Prototype Screen ทั้งหมด

ใช้สำหรับทดสอบ:
- User Management
- Division Management
- Assign Supervisor
- ดูทุก Project
- Create/Edit/Archive Task UI

### Supervisor
ใช้สำหรับทดสอบ:
- Division ของตนเอง
- Project Management
- Project Members
- Create Task
- Assign/Reassign Task
- Edit Task
- Kanban workflow

### User
ใช้สำหรับทดสอบ:
- My Tasks
- Project ที่เป็นสมาชิก
- View Task
- Drag & Drop Status
- Update Progress
- Comment
- Reassign Task ที่ตัวเองรับผิดชอบ

User ปกติห้ามมี Create Task / Delete / Archive Task action ใน UI

---

## 5. Core Business Rules to Simulate
1. User ปกติสร้าง Task ไม่ได้
2. User ปกติลบหรือ Archive Task ไม่ได้
3. User สามารถ Reassign Task ที่ตนเองเป็น Assignee ให้ Project Member คนอื่นได้
4. Reassign ต้องเพิ่ม Activity Log แบบ Mock
5. Task มี Main Assignee 1 คน
6. Assignee ต้องเป็น Project Member
7. Status เปลี่ยนด้วย Drag & Drop ได้
8. Status Change ต้องเพิ่ม Activity Log แบบ Mock
9. Progress อยู่ระหว่าง 0–100%
10. Progress Change ต้องเพิ่ม Activity Log แบบ Mock
11. ถ้า Status เปลี่ยนเป็น Completed ให้ Progress เป็น 100%
    **ทางเดียวเท่านั้น** — การตั้ง Progress เป็น 100% เองไม่เปลี่ยน Status อัตโนมัติ
    (Task ที่ทำเสร็จ 100% แต่ยังรอ Review เป็นเรื่องปกติ)
12. User เห็นเฉพาะ Project ที่เป็นสมาชิก (`project.memberIds` มี id ของตน)
13. Super Admin เห็นทุกอย่าง
14. Supervisor เห็นเฉพาะ Division ที่ตนเป็น `supervisorId` และทุก Project ใน Division นั้น
15. Task Card ต้องอ่านข้อมูลสำคัญได้โดยไม่ต้องเปิดรายละเอียด

---

## 6. Task Fields Displayed in Prototype
### Required
- Title
- Project
- Status
- Priority
- Main Assignee

### Optional / Supporting
- Description
- Deadline
- Progress
- Collaborators
- Attachments
- Comments
- Created By
- Created Date
- Activity Timeline

---

## 7. Task Status
Default columns:
- To Do
- In Progress
- Review
- Completed

Additional states:
- Blocked
- Cancelled

สำหรับ Prototype หลัก ให้ Kanban ใช้ 4 คอลัมน์หลักเพื่อไม่ให้ UI แน่นเกินไป

### Blocked / Cancelled บน Board
- Board แสดง 4 คอลัมน์หลักเป็น default
- Header มีปุ่ม `Show Blocked` พร้อมจำนวน กดแล้วเปิดคอลัมน์ที่ 5 `Blocked` ขึ้นมา
- คอลัมน์ Blocked ลาก Task เข้า/ออกได้เหมือนคอลัมน์อื่น
- `Cancelled` ไม่มีคอลัมน์ เข้าถึงผ่าน Filter และ Status dropdown ใน Task Detail เท่านั้น

---

## 8. Priority
- Low
- Medium
- High
- Urgent

ต้องเป็น Badge ที่สแกนด้วยตาได้เร็ว แต่ไม่แย่งความเด่นจาก Task Title

---

## 9. Deadline States
เกณฑ์คำนวณจาก `deadline` เทียบกับวันนี้ ตรวจตามลำดับนี้ (เจอข้อไหนก่อนใช้ข้อนั้น):

| State | เงื่อนไข | Visual |
|---|---|---|
| Completed | `status === 'COMPLETED'` | muted — ชนะทุกเงื่อนไขด้านล่าง ถึงเลยกำหนดก็ไม่นับ overdue |
| Overdue | `deadline < today` | danger |
| Due today | `deadline === today` | warning |
| Due soon | ภายใน 1–3 วันข้างหน้า | warning (อ่อนกว่า due today) |
| Upcoming | มากกว่า 3 วันข้างหน้า | ปกติ |
| No deadline | `deadline === null` | ไม่แสดง deadline chip |

เทียบเฉพาะวัน ไม่คิดเวลา — normalize เป็นเที่ยงคืนท้องถิ่นก่อนเปรียบเทียบ

Mock data ต้องมีครบทุก state (ดู `07-MOCK-DATA.md` §5)

---

## 10. Progress
รองรับ 0–100%

Prototype ควรมีทั้ง:
- Progress bar บน Task Card
- Progress editor ใน Task Detail

สามารถใช้ slider + numeric value หรือ predefined quick buttons

---

## 11. Success Criteria
Prototype ถือว่าผ่านหาก Stakeholder สามารถทำ Flow เหล่านี้ได้โดยแทบไม่ต้องอธิบาย:
- เข้า Project แล้วเข้าใจ Kanban ทันที
- ลากงานจาก To Do → In Progress
- เปิด Task Detail
- เปลี่ยน Progress
- Reassign งาน
- ดูว่าใครเปลี่ยนอะไรจาก Activity Timeline
- กลับมาหน้า My Tasks
- สลับ Role แล้วเห็น action ที่ต่างกัน
