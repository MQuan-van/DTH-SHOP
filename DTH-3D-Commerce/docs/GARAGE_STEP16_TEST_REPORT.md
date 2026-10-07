# Step 16 — Test report

Baseline: `MQuan-van/DTH-SHOP`, `feat/shop-discovery`,
`646bed45d7dbeb886d5205ae418b6588549168d8`.

This report separates executed checks from supplied-but-unexecuted integration tests.
No user's database, Git branch or account was changed while preparing this package.

## Executed checks

| Check | Result | Actual scope |
|---|---:|---|
| `node --test tests/garage16.test.mjs` | 72 passed, 0 failed | New domain policy, ownership, revision/CAS behavior with in-memory model doubles, route middleware ordering, explicit Flow adapter, stale client-response rejection, finite animation/cleanup, structural guards. |
| Offline installer harness | 18 passed, 0 failed | Synthetic before-anchor fixtures, Unicode/spaced paths, LF/CRLF, check mode non-writing, repeat installation, byte-for-byte undo, edited-file refusal, collision/symlink refusal and patch allowlist. Not application compilation. |
| New-source syntax checks | 17 passed | JS/JSX through TypeScript transpileModule (parser/transpiler, not React runtime/type checking), `.mjs` through Node syntax check, CSS through PostCSS, Python through py_compile. |
| Chromium static layout | 8 passed | Full/empty Garage layout at 1440, 768, 390 and 320 CSS pixels; no horizontal overflow. Actual new JSX/CSS rendered with controlled hooks/router/API/3D doubles. Not an interactive React, WebGL, performance or accessibility certification. |

Node used here: 22.16.0. Browser layout checks used `/usr/bin/chromium` through Python Playwright.
The installer is an offline Node script; it does not install packages, start servers, alter Git refs or migrate MongoDB.
It does store a rollback journal in the repository's Git metadata when applying code changes.

The static layout screenshots contain an explicit placeholder for the existing viewer. That placeholder is
ONLY in the layout harness; it is not part of the installed application. In the application, GarageStage
imports the actual existing `Viewer3D.jsx`.

## Important covered cases

- Maximum three unique NVX versions; no arbitrary vehicle IDs, year, ownerId, role or extra fields in mutation requests.
- First saved version becomes default; adding a second preserves the current default.
- Removing the default clears it instead of selecting another vehicle; clearing default keeps the saved list.
- Step 15 savedVehicleId read compatibility; explicitly empty lists are not resurrected.
- No mutation to input user objects, bag lines, orders, product prices or vehicle fitment.
- Shared service for the new endpoint and legacy `/account/vehicle` writer.
- Single-document revision compare-and-swap; competing in-memory writes produce one success and one conflict.
- Session ownership and response identity checks; stale client responses do not overwrite new account state.
- API mode never silently becomes Flow mode.
- Bounded animation timings, disposal, rejected/cancelled animation promises, reduced-motion handling.
- Loader, Home, Viewer3D, cart, assets and package-lock are outside the installer patch allowlist.

## Not executed here

- Full repository `npm ci`, `npm run check`, `npm test`, Vite build or React 19 runtime integration.
- Full baseline source application/compilation in this container. Live source was read to form targeted edits;
  local `--check` verifies actual anchors before any file write. Installer tests use synthetic anchor fixtures.
- Actual MongoDB integration. `tests/garage16.mongo.test.mjs` is supplied, opt-in and restricted to
  the local `dth_garage16_test` database. A skipped test is not a passed integration test.
- Compiled Flow browser integration `tests/browser/garage16.py` (supplied, syntax checked only).
- Rendering existing GLB assets, frame-rate, memory/performance, Safari/Firefox/mobile hardware, full accessibility audit or UAT.

The container could not resolve external package/repository hosts for a complete checkout/locked install.
GitHub connector reads succeeded; this is not evidence of a full executable checkout.

Run the instructions in `NOTE_GARAGE_STEP16.md` on the PC before committing the update.
The existing viewer's manual rotation, zoom, reset, auto-rotation toggle and fallbacks are reused, not newly
certified by the static layout checks. No new complete motorcycle model is included.

## Data and rollback boundary

Step 16 is additive to each user's document. No seed or bulk migration is required; legacy reads are
non-writing and later explicit saves initialize the fields. Source rollback does not delete garage records
or revert database changes made by the user. Backups are local, not a cloud backup of MongoDB.
Cross-device persistence requires the same backend/database; Git alone does not synchronize local databases.
