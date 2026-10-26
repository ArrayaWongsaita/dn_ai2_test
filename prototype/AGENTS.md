# AGENTS.md

`CLAUDE.md` in this folder is the single source of truth for agent instructions
on this prototype. Read it before writing any code.

Quick summary:
- Build only the clickable HTML prototype described in `docs/`
- Vanilla HTML / CSS / JS — must run by double-clicking `index.html` from `file://`
  (no build step, no ES modules, no `fetch()` of local files, no CDN links)
- No backend, database, authentication, or email
- Keep design consistent with `docs/06-UI-UX-DESIGN-SYSTEM.md`
- The board is the core experience — it should feel like a lightweight team task
  board, not an ERP/admin console
- Definition of done: `docs/09-PROTOTYPE-ACCEPTANCE-CHECKLIST.md`
