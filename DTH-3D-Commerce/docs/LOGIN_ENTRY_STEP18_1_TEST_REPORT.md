# Step18.1 — DTH Branded Login / Entry

## Executed in this packaging environment
- **60 / 60 Node tests passed.** Route decisions; role-aware return paths; malicious redirect rejection; preview/flow boundaries; finite extruded geometry; transform math; mobile/reduced-motion/typing policy; source integration checks.
- **25 / 25 installer checks passed.** Dry-run is read-only; safe apply; exact-byte undo; repeat apply/check; addition conflict; later local edits block undo; CRLF preservation; missing startup policy; non-matching route anchors; symlink rejection; no force switch. Fixtures include existing local Admin/Shop/Cart edits and an env sentinel that remain unchanged.
- **49 / 49 isolated browser checks passed.** Guest entry; real WebGL2 rendering after loader release; one canvas; input-focus/Pause frame-loop stop; invalid login; registration/confirmation; rapid-submit lock; identity-epoch change; customer/admin destinations; direct checkout/filter returns; preview/flow handling; session retry; context-loss fallback/retry; responsive widths 320/390/768/1024/1440/1920.
- Eight source modules were transpiled with the locally installed TypeScript JSX compiler with zero syntax diagnostics. The packaged installer passes `node --check`.
- The native WebGL2 vertex/fragment shaders compiled and rendered in Chromium under Xvfb/SwiftShader. The DTH monogram contains 956 extruded/bevelled triangles, with additional procedural decorative props. This is not a 3D image/video substitute.
- ZIP contents and installer SHA-256 were checked after final packaging.

## Important limitations
- The browser fixture uses **React 18.2.0**, ReactDOM **18.2.0-next-9e3b772b8-20220608**, and a StrictMode wrapper from installed JupyterLab assets. These are NOT redistributed in the installer. This is not a test of the application's React19 dev-mode StrictMode replay.
- Existing router/store/startup-context and authentication responses are replaced with isolated adapters. The new boundary, Login JSX, policies and renderer are the production source being tested.
- No full `npm run build` / React19-Vite dependency graph of the user's repo was run here. Public source archive download was unavailable in this environment. Actual repository routing context was read through the connected GitHub tool, and known local patch packages were inspected.
- No live MongoDB login, admin access, CSRF cookie exchange, SSE chat, product/checkout integration or existing-model GLB rendering was exercised here.
- Desktop/mobile previews are fixture screenshots, labelled as such. Desktop shows the real new WebGL2 sculpture. Mobile intentionally defaults to the vector still before `View in 3D`.
- Software rendering frame counts are NOT a Windows-PC FPS benchmark. There is no claim of guaranteed 60 FPS or that the previous Windows libuv build crash is fixed.

## Required acceptance on the user's PC
1. Run `node --test tests/login181.test.mjs`, `npm run check`, `npm test`, `npm run build`; each must exit 0.
2. Use an InPrivate window: root -> existing loader -> new Login -> customer Shop / administrator Admin.
3. Verify direct Shop filter / Product / Bag / Checkout return paths and the existing signed-in Home route.
4. Confirm wrong credentials never proceed, registrations are stored by the real API, logout/session expiry works, and Admin authorization remains enforced.
5. Confirm current Garage, Shop Discovery, existing Admin Inbox, cart and checkout still work.
6. Test WebGL failure/retry, manual motion pause, keyboard focus, mobile and reduced motion. No credential values or lengths go into the scene.

## Scope boundary
This is the approved **Cinematic Login & Entry Flow** step. It does not implement deposits, real payments, addresses/onboarding, mail, Facebook Messenger or Product CRUD. Their existing/not-yet-implemented status is unchanged. Existing loader choreography, watchdog and readiness logic are retained.
