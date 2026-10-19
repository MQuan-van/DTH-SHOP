# DTH Step 19C — Kinetic Inbox, streamlined Admin

## Design decision
- **Remove** `Focus inbox` mode and the **two icon-only topbar actions**:
  - Pause/Play was a manual interface-motion toggle; remove its state/UI, while respecting OS `prefers-reduced-motion`.
  - Refresh Dashboard manually re-fetched overview/queue/order metrics; remove this redundant icon. Normal API reads, support SSE revisions and individual error retry remain.
- Remove duplicated manual refresh controls in the Inbox queue/lead. SSE and existing state refresh still operate; no API data mocked.
- Keep **Overview** (`/admin`) and **Website home** (`/`) links, with accessible names, including on mobile.
- Keep 19B removal of WebGL-only Admin decorative mechanism. **Home/Product 3D untouched**.

## Visual behavior (presentation only)
- Subtle moving blue light in the Inbox header; no canvas/3D, no font or third-party assets.
- 2D signal motif, animated workspace line and focused chat composer.
- Queue rows animate **once when they enter their own scrollable panel**; a selected row gains a blue tracking edge.
- Unread dots pulse discreetly. A newly selected thread header slides in.
- **Only newly inserted message DOM nodes animate** (max four for initial hydration). Historical messages do not continually replay on new SSE events.
- Reduced-motion turns off CSS/WAAPI effects. No scroll capture, no server changes, no sending/typing behavior modifications.

## Install from Windows CMD

Extract the ZIP to `C:\DTH-AdminInbox-Kinetic-Step19C\`.

```
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
node "C:\DTH-AdminInbox-Kinetic-Step19C\install.mjs" --project "." --check
```

Only after `CHECK OK`:

```
node "C:\DTH-AdminInbox-Kinetic-Step19C\install.mjs" --project "." --apply
node --test tests\admin-kinetic19c.test.mjs tests\admin-calm19b.test.mjs
npm run check && npm test && npm run test:admin && npm run build
npm run dev
```

App backend & MongoDB should already be running in API mode. No seed, migration, or dependency install.

## Manual acceptance
1. `/admin`: no pause icon or refresh icon in the topbar. Numbers still load. `Overview` has no decorative 3D bearing.
2. `/admin/inbox`: no Focus Inbox, no pause, no duplicate refresh icons. Direct `Overview` and `Website home` links work even with thread selected.
3. Scroll in the conversation queue; new rows slide in. Select different threads; heading slides, message bubbles enter from the sender's side.
4. Open unread thread / reply with template / attach an image / Resolve / Reopen / use filters. Data comes from the existing API/SSE; no duplicate send.
5. On 390px phone size, links do not disappear; use `Back to conversations` for the queue.
6. In OS reduced-motion mode, content is visible immediately, no CSS/WAAPI animations.
7. Verify the page is usable offline: error/Retry surfaces remain; no fictitious online-customer indication.

## Safe undo

```
node "C:\DTH-AdminInbox-Kinetic-Step19C\install.mjs" --project "." --undo-latest
```

Undo is fail-closed. It refuses restoration when any installed file has been subsequently edited. Never use `git reset --hard` just to make this package install.

## Validation boundaries
Installer checks, pure-source assertions and parser checks cannot prove rendered animations, FPS or real SSE/browser behavior; run a live browser check before committing.
