# Role & Permission Rules for Prototype

เอกสารนี้กำหนดเฉพาะ **สิ่งที่ควรแสดง/ซ่อน/กดได้ใน Prototype** ไม่ใช่ security specification

| Capability | Super Admin | Supervisor | User |
|---|---|---|---|
| View all divisions | Yes | No | No |
| View assigned division | Yes | Yes | Member only |
| Create division | Yes | No | No |
| Assign supervisor | Yes | No | No |
| Create project | Yes | Yes | No |
| Manage project members | Yes | Yes | No |
| Create task | Yes | Yes | No |
| Edit task | Yes | Yes | Limited — ดู §Limited edit |
| Archive task | Yes | Yes | No |
| Reassign own task | Yes | Yes | Yes |
| Reassign any visible task | Yes | Yes | No |
| Change status | Yes | Yes | Yes |
| Drag task card | Yes | Yes | Yes |
| Change progress | Yes | Yes | Yes |
| Change deadline | Yes | Yes | No |
| Change priority | Yes | Yes | No |
| Comment | Yes | Yes | Yes |
| View activity log | Yes | Yes | Yes |
| User management | Yes | No | No |

## Limited edit — สิ่งที่ Role `User` แก้ได้บน Task

| Field | User แก้ได้? | ถ้าแก้ไม่ได้ให้แสดงอย่างไร |
|---|---|---|
| Status (รวม drag & drop) | ได้ | — |
| Progress | ได้ | — |
| Description | ได้ | — |
| Comment | ได้ | — |
| Attachment | เพิ่มได้ | — |
| Assignee | ได้เฉพาะ Task ที่ตนเป็น Assignee | Task อื่นแสดงชื่อแบบ read-only ไม่มีปุ่ม Reassign |
| Title | ไม่ได้ | read-only |
| Priority | ไม่ได้ | lock icon + tooltip `Only Supervisor can change priority` |
| Deadline | ไม่ได้ | lock icon + tooltip `Only Supervisor can change deadline` |
| Collaborators | ไม่ได้ | read-only |

Supervisor และ Super Admin แก้ได้ทุก field

---

## Prototype behavior
### Hidden vs Disabled
Prefer **hide actions that the role cannot use** rather than showing a large number of disabled buttons.

Use disabled states only when they help explain a rule, for example:
- User tries to edit Deadline → field displays locked icon + tooltip `Only Supervisor can change deadline`

## Visibility simulation
Mock users should have different project memberships so role switching clearly demonstrates different data visibility.
