# DTH Step 18.0 — Admin Operations Experience test report

## Scope
- UI-only switch in `AdminLayout.jsx` to new Overview/Inbox components.
- Uses existing authenticated Admin API, SSE SupportProvider, `ChatThread` and customer context routes.
- Does **not** create/modify Admin Product CRUD API, upload pipeline, backend, database or user permissions.

## Completed on isolated build fixture
- 6 pure helper tests passed: count safety, percentage, page-local queue counts, stable priority sort, time labels and safe conversation links.
- New JSX components parsed/transpiled with TypeScript JSX transform with zero syntax diagnostics.
- Both CSS files parsed by tinycss2 with zero stylesheet syntax errors.
- Installer workflow: clean `--check` (9 files), `--apply`, repeat `--check` (0 files), `--undo-latest`, plus undo change-detection guard.
- No project files changed during `--check` in the fixture.

## Not validated yet
- Full React/Vite production build of the user's working repository.
- Live API/MongoDB support, Admin authenticated session, physical mobile interaction, FPS and end-to-end chat with multiple accounts.

## User validation
```
node --test tests\admin-ops18.test.mjs
npm run check
npm test
npm run build
```
Then manually verify `/admin` and `/admin/inbox`, search/filters/unread order, select thread, reply/image, resolve/reopen, customer context, return to orders, mobile, keyboard focus and reduced motion. `Admin > Products > Add/Edit` remains in Step 18.1.
