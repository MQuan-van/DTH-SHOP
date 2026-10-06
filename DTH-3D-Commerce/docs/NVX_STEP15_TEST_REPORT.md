# Step 15 — verification report

## Delivery scope

User-approved choices: Yamaha NVX V1, NVX V2, NVX V3; no year selector or year field on new NVX records. Read-only source reference: `MQuan-van/DTH-SHOP`, `feat/shop-discovery`, `894a061f4c230a34e892ccaab50b3546738400ee`.

The deliverable is an offline, single-file Node installer. It does not push GitHub changes or execute operations on the user's machine/database. It replaces only the two existing vehicle form implementations, inserts imports/hooks/scoped queries and updates bounded vehicle captions. Other local code remains in place. Loader files, Viewer3D, GLB files, Home camera/styles, npm manifest/lockfile and the legacy asset fixture are not replaced.

## Executed checks in the authoring environment

| Group | Observed result | Actual scope |
|---|---:|---|
| Node NVX/quote/migration-plan/route tests | 65 pass, 0 fail, 1 skipped; 66 total | Authored modules plus copied existing domain/quote helpers and cart route/middleware excerpt. Database and Express response are doubles. Migration planning is pure; no live MongoDB. |
| Standalone installer | 28 pass, 0 fail | Temporary Linux Git repositories containing narrow fixtures with the exact inspected integration anchors. Check/no-write, targeted replacement, idempotence, CRLF, backup/undo, local-edit conflicts, symlinks, active-data-journal guard. Not a Windows full-repo install. |
| Chromium UI assertions | 41 pass | Actual new JSX/hooks/CSS rendered with locally available React 18.2 runtime. API, store, router, product images and WebGL viewer are explicit doubles. Covers native radios/keyboard, draft versus committed selection, async saves/failures/stale identity, legacy selection backup, reduced motion and widths 320–1440. |
| Syntax | Passed | Node parser for JS/MJS, TypeScript JSX syntax/transpilation and PostCSS CSS parsing. Python browser script compiles. Syntax checking is not a Vite build. |

The skipped test is the contract against the actual `shared/catalog.json`: the complete repository was not mounted in the isolated verifier. That test runs normally on the user's repository when the asset fixture is present.

No sample mapping is represented as manufacturer-verified compatibility. Counts in isolated tests use an explicitly synthetic 20-product fixture. No real account, user email, password, order or live database was used.

## What is not verified here

- Full React 19 + Vite dependency installation/build; container access could not retrieve the full dependency set/repository checkout. Only individual files were read through the connected GitHub tool.
- Running the migration executor against a real MongoDB server, native BSON/driver behavior under concurrent external writes, or a real Windows filesystem. Backups, preflight checks and conditional writes mitigate risk but do not replace database integration testing.
- Actual WebGL/GLB rendering, model performance/FPS, GPU memory, or fidelity of Yamaha motorcycles. The new component delegates to the unchanged existing part viewer; the isolated UI uses a mocked boundary. No full motorcycle mesh is provided.
- Safari/Firefox, physical phone/tablet, reduced-motion preferences across all existing site modules.
- Passing every legacy browser/integration suite or GitHub Actions run. Tests written for old Make/Model/Year controls and legacy vehicle IDs require corresponding fixture/selector updates before the new full CI acceptance run.

Do not treat these isolated pass counts as an end-to-end certification or a production security audit.

## User-side acceptance sequence

1. Stop frontend/backend; keep the MongoDB service running. Save local work. Run installer `--check`; investigate any conflict rather than forcing.
2. Apply code. Run `node --test tests/nvx-step15.test.mjs tests/nvx-migration.test.mjs tests/nvx-api.test.mjs`, `npm run check`, then `npm run build` in the real app root. Stop on any failure.
3. Run `node backend/commerce/nvx/migrate.mjs --check`; inspect preserved/custom mappings. Apply only with explicit `--apply --confirm-demo-fitment` and no concurrent database writers.
4. Restart API and Vite. Exercise three-version picker, Garage persistence, scoped Admin vehicle list, per-line cart review and a simulated checkout. Check the existing 3D controls and Home/loader regressions visually.
5. For automated full-browser verification, use the supplied `tests/browser/nvx_step15.py` against a compiled **Flow** build on localhost. `--require-3d` requires the actual unchanged viewer to reach its ready state. This script is supplied but not reported as executed in this environment.
6. Commit/push only after local acceptance. Each PC/laptop local database requires its own checked migration; Git does not carry database contents.

Code rollback and database rollback are separate. Undo data before undoing code. Newly used accounts/orders/custom product references and edits made after installation prevent unsafe automatic rollback. Preserve backup journals rather than deleting them to bypass a guard.
