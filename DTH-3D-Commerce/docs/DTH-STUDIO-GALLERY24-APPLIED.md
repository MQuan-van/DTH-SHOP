# Studio Gallery 24 — applied locally

Date: 2026-11-03. The approved pearl Product Gallery is now the default Studio at `/`, normally served at **http://127.0.0.1:5173/**. After the port-collision handover below, the agent-started services are stopped so the user can run them in their own terminals. Port 5174 was the earlier API-mode preview; port 5175 was a separate explicit Flow rehearsal, not MongoDB evidence.

## What was applied

- Seamless pearl stage, navy type, blue actions, readable metadata, image thumbnail strip and category filters.
- Cancellable product transitions and existing validated GLB loading, original geometry/materials and authored Admin presentation.
- Inline Inspect keeps the hero bounds. Expand moves the same portal host into a native dialog, preserving the mounted Canvas and GLB; resize reframes the camera. Escape/focus return, body scroll restoration and background inertness are handled without replacing shared account/cart dialogs.
- Startup/intro, offscreen, hidden-tab and external dialog/support input gates remain in effect. The Gallery excludes its own expanded dialog from the external input gate.
- StoreProvider remains the only production catalog source. No independent fetch, fixture fallback or fabricated TTX record is installed in the live view. Explicit published product selection wins. Without one, an uploaded model is preferred. Existing Suspension display filtering remains unchanged.
- Vehicle selection and synthetic fitment read the original store/outlet handlers. Product, Shop, Build, account and bag URLs/contracts remain unchanged. No new add-to-bag, payment or compatibility API is invented.
- Product data refreshes update the displayed record even when its model identity is unchanged. A price-only refresh does not recreate the camera. Readiness is cleared alongside model selection so a cached GLB's first render cannot be overwritten by a later loading reset.

## Files changed in this application pass

| File | Purpose |
| --- | --- |
| `frontend/src/shop/home/HomePage.jsx` | Default Gallery lazy entry; classic and precision rollback views retained |
| `frontend/src/experience/gallery24/StudioGallery24.jsx` | Production store adapter and approved Gallery presentation |
| `frontend/src/experience/gallery24/studio-gallery24.css` | All selectors scoped to `.dgs24`; content-driven hero prevents fitment text overlap |
| `frontend/src/experience/gallery24/studio-gallery24.logic.mjs` | Pure catalog/default selection and stable portal-host mounting |
| `frontend/src/experience/gallery24/useGalleryModal24.js` | Native modal lifecycle and existing-style external input gates |
| `frontend/src/experience/galleryDemo24/GalleryStage24.jsx` | Narrow camera memo dependencies so price-only updates preserve the view |
| `tests/studio-gallery24.test.mjs` | Production adapter, binding, refresh, modal lifecycle and integration guards |
| `tests/studio23-suspension-route.test.mjs` | Rename two legacy test descriptions to identify the retained rollback accurately; assertions preserved |
| `tools/verify-premium24.mjs` | Include the demo and production Gallery suites in the existing non-database regression checks |
| This document | Results, limitations, rollback and PC/laptop transfer |

Runtime also uses the previously created `galleryDemo24/gallery-demo.logic.mjs`, `GalleryStage24.jsx`, existing Studio camera math/loader/presentation helpers, and `public/previews/gallery24/`. These must accompany the production files when committing the previously untracked demo work. No dependency manifest/lock, backend source, environment file, original GLB, shared navigation or commerce/auth handler was modified in this pass.

## Backups and rollback

The exact files present before this application pass were copied to ignored `backups/gallery24-before-apply/`, including HomePage, current Studio23 and the shared Gallery scene/helper files. Existing unrelated uncommitted edits were preserved. No Git reset, checkout, commit or push was performed.

- Default: `/` (Gallery).
- Previous Studio: `/?studio=precision` (original commerce23 implementation remains intact).
- Earlier cinematic option: `/?studio=classic`.
- For a permanent rollback, review the backed-up HomePage against the current one, then change only the default view selection back to `StudioAtelier22H`. Do not restore the entire working tree or overwrite later local edits.

## Verification and limits

The final non-database regression command is `node tools/verify-premium24.mjs`: **1,586/1,586 tests passed**, project/local imports passed, and the production Vite build passed (7.66 seconds). Full output is in ignored `test-results/gallery24-verify.log`. The earlier focused Studio/camera check passed 124/124 before the extra refresh test was added. No database integration pass is claimed.

Browser checks used the real React application on port 5175 with **FLOW DEMO / NO DATABASE**, the documented public fixture account, real bundled illustrative GLBs, original shared header and cart/vehicle dialogs. This is not a claim that the API user session was tested:

- Desktop 1440x1000 and mobile 390x844: the Gallery and GLBs rendered; observed one Canvas, no horizontal page overflow, readable layout and no fitment/collection overlap.
- Expand moved the host into the native dialog; controls, resize, Escape and return focus worked. Closing restored the body's previous overflow value.
- Existing empty bag opened/closed normally. Inspect was disabled while its native dialog was open. Existing vehicle picker opened from the Gallery; selecting NVX V2 changed the shopping vehicle and existing synthetic fitment text, without saving an account default or changing bag lines.
- Empty Suspension category removed the old Canvas and exposed an honest empty state; View all parts returned to a real catalog record.
- View product navigated to the existing product route. Browser screenshots: `test-results/gallery24-applied/flow-studio-desktop.png` and `flow-expanded-mobile.png`.
- The earlier isolated preview separately rendered the original X1R/TTX uploaded GLBs. Its evidence is documented in `DTH-STUDIO-GALLERY-DEMO24.md`; that does not certify an authenticated live API Gallery session.
- No FPS/GPU benchmark, physical phone test, forced context-loss, API login/session, live cart mutation or checkout was certified. No real order, support message, product edit or migration was performed.

An initial unrestricted `tests/*.test.mjs` attempt hit explicit test-database guards and sandbox loopback restrictions in other HTTP suites. It is not counted as passing. The database tests refused to proceed without a named `TEST_MONGO_URI`; none was supplied. The final verifier uses the existing explicit non-database allowlist.

## Runtime handover after port collisions

The user's manual backend/frontend commands encountered occupied ports because the earlier agent-started servers were still running. Those specific managed sessions were stopped, including preview/rehearsal servers. A listener check then confirmed **5000, 5173, 5174 and 5175 were free**. No source, environment, database or model data was changed during this handover.

The user now owns the development processes. From the project root, keep two separate terminals open:

```powershell
# Terminal 1
npm.cmd run dev --workspace backend
```

```powershell
# Terminal 2
npm.cmd run dev --workspace frontend
```

Open http://127.0.0.1:5173/. Ctrl+C in the corresponding terminal stops that service. Do not start a second copy on the same port while the first remains running.

## API restart approved and completed (before handover)

The existing API at port 5000 stopped during this work. The first restart was rejected by automatic approval review because `backend/server.mjs` and `makeApp()` call `model.init()`, which may create collections/indexes. Runtime attempts to disable automatic creation were not accepted as sufficient assurance. An offline initialization probe did not resolve within its 2.5-second limit and was not used as proof of a read-only restart. No rejected command was bypassed or retried before obtaining explicit user approval.

On 2026-11-03 the user explicitly approved restarting API port 5000, including collection/index initialization if missing. `npm.cmd run start --workspace backend` then started the unchanged server successfully. Read-only checks returned HTTP 200 for `/api/shop/health`, `/api/shop/products`, `/api/shop/experience/home` and the frontend at port 5173. The live catalog contains 21 records, including the uploaded `x1r-gtr` / X1R GTR MONOSHOCK product.

The main tab at http://127.0.0.1:5173/ was opened and its login surface confirmed `data-mode="api"`. Authenticated Gallery/session verification remains pending the user's direct sign-in; no API login success is claimed. The normal permitted frontend Origin is port 5173; backend Origin/auth protections were not relaxed for the earlier preview port. No seed, migration, product edit or database deletion was run. Startup initialization of missing collections/indexes was within the user's explicit approval, not a claim that all database metadata remained untouched.

## PC / laptop push and pull

Current branch: `feat/story-shop-ultra-pc-20261026`. Git root is the parent `DTH-SHOP`. Review both machines' local edits before transferring; neither has been reset or automatically committed here.

From the parent Git root, stage the relevant files explicitly:

```powershell
git status --short
git add -- DTH-3D-Commerce/frontend/src/shop/home/HomePage.jsx DTH-3D-Commerce/frontend/src/experience/gallery24 DTH-3D-Commerce/frontend/src/experience/galleryDemo24 DTH-3D-Commerce/frontend/public/previews/gallery24 DTH-3D-Commerce/frontend/studio-gallery-demo.html DTH-3D-Commerce/frontend/vite.gallery-demo.config.mjs DTH-3D-Commerce/tests/gallery-demo24.test.mjs DTH-3D-Commerce/tests/studio-gallery24.test.mjs DTH-3D-Commerce/tests/studio23-suspension-route.test.mjs DTH-3D-Commerce/tools/verify-premium24.mjs DTH-3D-Commerce/docs/DTH-STUDIO-GALLERY-DEMO24.md DTH-3D-Commerce/docs/DTH-STUDIO-GALLERY24-APPLIED.md
git diff --cached
git commit -m "Apply Studio Gallery 24 with native 3D inspection"
git push origin feat/story-shop-ultra-pc-20261026
```

Inspect `git diff --cached` for previously staged unrelated work. The working tree also contains the earlier Premium24 pass: review and transfer those edits deliberately; this command does not silently include every other page redesign.

On the other machine, preserve its own edits, then fast-forward the same branch when ready:

```powershell
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
node tools/verify-premium24.mjs
npm.cmd run dev --workspace frontend
```

Keep each machine's environment files local. A code pull does not migrate MongoDB or supply an untracked GLB. Missing originals require a deliberate asset transfer; no model is substituted for a missing file.
