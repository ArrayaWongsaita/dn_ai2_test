# Prototype User Flows

## Flow A — Enter as User and update task
1. เปิด Prototype
2. เลือก `Continue as User`
3. Dashboard แสดงงานของ User
4. กด Project `Facebook Campaign`
5. เห็น Kanban Board
6. ลาก Task จาก `To Do` → `In Progress`
7. Card เคลื่อนทันที
8. Activity Log ใน Mock State เพิ่ม `Status changed`
9. เปิด Task Detail
10. เปลี่ยน Progress 20% → 50%
11. Activity Log เพิ่ม `Progress changed 20% → 50%`

Expected UX:
- ไม่มี Create Task button
- ไม่มี Delete / Archive

---

## Flow B — User reassigns own task
1. User เปิด Task ที่ตัวเองเป็น Main Assignee
2. กด Assignee
3. เปิด dropdown รายชื่อ Project Members
4. เลือกสมาชิกใหม่
5. Confirmation dialog: `Reassign this task to Aom?`
6. Confirm
7. Avatar/name เปลี่ยน
8. Toast `Task reassigned to Aom`
9. Activity เพิ่ม Reassignment log

ถ้าเปิด Task ที่ User ไม่ได้เป็น Assignee:
- Assignee field แสดง read-only หรือไม่มี reassign action

---

## Flow C — Supervisor creates task
1. สลับเป็น Supervisor
2. เข้า Project Kanban
3. เห็น `+ Add Task`
4. กดเปิด Create Task Drawer
5. กรอก Title
6. เลือก Assignee
7. เลือก Priority
8. เลือก Deadline
9. Create
10. Task ใหม่ปรากฏใน To Do
11. Toast `Task created`

ข้อมูลอยู่ใน browser state เท่านั้น

---

## Flow D — Drag task to Completed
1. Drag In Progress → Completed
2. Status เปลี่ยนเป็น Completed
3. Progress auto-set = 100%
4. Card แสดง completed visual treatment
5. Activity เพิ่ม 2 event ได้:
   - Status changed
   - Progress changed to 100%

---

## Flow E — Super Admin manages division
1. สลับ Super Admin
2. เข้า Divisions
3. กด `+ New Division`
4. Modal mock เปิด
5. กรอก Division Name
6. เลือก Supervisor
7. Save
8. Division card ใหม่ปรากฏ

---

## Flow F — Check overdue work
1. Dashboard
2. กด Overdue summary card
3. ไป My Tasks พร้อม filter `Overdue`
4. เห็น Task overdue ชัดเจน
5. กด Task → detail

---

## Flow G — Notification interaction
1. กด Bell icon
2. Dropdown แสดง latest notifications
3. กด notification `You were assigned...`
4. เปิด Task Detail ที่เกี่ยวข้อง
5. Notification เปลี่ยนเป็น read visual state

---

## Flow H — Permission demonstration
Prototype ต้องมีวิธีสลับ Role ได้ง่าย เช่นใน User Menu

หลังสลับ Role:
- Navigation บางรายการเปลี่ยน
- Buttons เปลี่ยน
- Data visibility เปลี่ยน

ไม่ต้อง Reload page หากทำได้ง่าย
