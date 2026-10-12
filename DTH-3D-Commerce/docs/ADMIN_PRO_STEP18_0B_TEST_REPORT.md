# Admin Experience Pro 18.0B — Verification report

## Scope / baseline

- GitHub reference: `MQuan-van/DTH-SHOP`, branch `feat/shop-discovery`, commit `91f1fcece076bbd7a5a3cac29e525fadde45c5e9`.
- Prior local Admin Ops18.0 extracted from the conversation ZIP and applied to the installer fixture.
- Original `ChatThread.jsx` fetched and verified as Git blob `81187977120ca2dc9dfcfdc0640af5b95ae3f9c9`.
- Only two existing files are patched: `admin/AdminLayout.jsx` and `support/ChatThread.jsx`.
- The added optional composer slot is the only change inside the original chat component, aside from its prop signature. Removing those two additions recovers the exact original bytes.
- No backend/API schema, password/session/CSRF policy, product/vehicle/order database records, GLB files, loader or storefront component changed.

## Executed in packaging environment

### Node tests: 32 passed / 0 failed

Input bounds, page-local queue counts, real-count catalog ratio, query parsing, read-only sort, timestamp fallback, year-free vehicle captions, reply append/length rules, geometric indices/normals, deterministic matrices, resource cleanup contracts, intro/typing guards, preserved access guards and optional composer slot.

Prior Ops18.0 helper regression: 6 passed / 0 failed (unchanged tests).

### Installer regression: 22 passed / 0 failed

Read-only check; Ops18 and original-admin compatibility; only two existing files patched; original chat code preserved; repeat check/apply; exact undo; pre-existing local edits retained; unknown anchors refused; conflicting added files refused; edited/missing files block ALL undo writes; CRLF preservation; wrong app, conflicting flags and symlink targets refused. Fixtures include spaces and Vietnamese characters in filesystem paths.

### Browser integration harness: 47 passed / 0 failed

- Chromium 144 on Linux, React 18.2 production build (StrictMode wrapper), real new UI components and the original ChatThread with optional extension.
- Real procedural WebGL2 rendering with software ANGLE/SwiftShader (Xvfb display); NOT an image replacing the 3D object. No physical PC/laptop GPU benchmark.
- Tests use in-memory route/API/store adapters and synthetic `@dth.test` conversations/orders. Browser restrictions prevent normal HTTP navigation, so the harness is loaded through set_content/add_script_tag. A secure-context randomUUID equivalent is provided ONLY to the opaque-origin harness; production code remains unchanged.
- Start-up cover prevents renderer initialization; one canvas; DPR bound; context loss fallback; fresh canvas Retry; motion pause; pause while typing; Focus inbox retains thread; draft templates append without auto-send; 3,000 character cap; double-send suppression; Resolve/Reopen; image lightbox/Escape; context dialog/focus restore; stale status response guard; search empty state; API errors and retry; mobile queue/back; no horizontal overflow at 320/390/768/1024/1440/1920; route cleanup; reduced-motion and unavailable-WebGL fallbacks.
- No uncaught JavaScript errors in the successful interaction run.

### Syntax

New React JSX/JS modules and the patched ChatThread were transpiled with TypeScript in an isolated test harness with no syntax diagnostics; Node syntax check passed for the installer and pure `.mjs` modules. This is not a Vite production build of the full repo.

## Explicitly NOT verified here

- Full application React 19/Vite build, all global CSS, all original routes/providers.
- Real MongoDB accounts, CSRF/cookies and SSE transport; authorization logic is preserved, not penetration-tested.
- Upload delivery between real accounts, server reconnection races and concurrent real operators.
- Actual PC/laptop FPS, memory use, battery use, Windows libuv shutdown, physical iOS/Android, Firefox/Safari.
- React development StrictMode's extra effect replay. The browser harness is production React18.2, so mount/unmount navigation and retry are tested, not a claim of full dev StrictMode coverage.

Run `node --test tests/admin-pro18b.test.mjs`, `npm run check`, `npm test`, `npm run build`, and the manual API-mode checklist on the user's machine before committing. Build exit code must be zero even if Vite previously printed “built”.

## Preview integrity

Preview screenshots are of the implemented UI with synthetic API data and a clearly labelled test attachment. The 3D bearing is rendered by the actual WebGL2 module. Preview numbers, customer emails and the test image are NOT included in the installed website. Production only reads the existing API.

## Deliberately deferred

Product CRUD fixes/deletion/upload, operator notes, assignments, SLA, AI suggestions and customer online presence are not implemented or fabricated by this visual/interaction upgrade.
