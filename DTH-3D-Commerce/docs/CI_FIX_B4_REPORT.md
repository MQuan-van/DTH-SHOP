# CI Fix B4 validation report

Date: 12 October 2026 (Asia/Saigon). Branch: `feat/shop-discovery`.
Baseline: `4057274`. PR: #9. Changes remain uncommitted.

## Scope and inspection

Reviewed all five failing browser scripts, their workflows in the parent
repository's `.github/workflows`, and the current Access181, loader/journey,
Home/WebGL, account/Garage, cart/checkout, product/recommendation/router,
Admin and support/API implementations before editing.

The workflows already build the correct modes and provision disposable MongoDB.
Their commands, assertions and database jobs remain enabled. Three companion
scripts also contained obsolete UI assumptions and are included because these
same workflows execute them after the five primary regressions.

## Changed files

| File | Change and retained coverage |
| --- | --- |
| `tests/browser/experience_studio.py` | Authenticate customer and admin through Access181 and actual login responses/server sessions. Customer visits Story before Home. Retain camera continuity, input ownership, publication, private drafts, rollback, authorization, recovery, responsive layout and real versioned GLB fallback/Retry. |
| `tests/browser/cinematic_home.py` | Record intercepted and failed GLB requests, wait up to 30 seconds for the legitimate fallback, require successful Retry network response and an active real WebGL context. Preserve scene framing, controls, motion, route cleanup and browser error checks. |
| `tests/browser/account_flow.py` | Replace legacy login/bearing/year/order selectors with actual Access181 rendering, registration, Story/Home, Overview, NVX V1/V2/V3 Garage, checked Review and current Checkout/confirmation/history. Retain and expand password, safe return, authorization, consent, focus/Escape, reduced motion, responsive and zero API coverage. |
| `tests/browser/admin_support.py` | Real UI login with explicit safe role destinations and session verification; current Admin Pro headings and accessible conversation queue. Preserve SSE, typing, unread/read receipts, image uploads, reconnection, retry/lost acknowledgement, product editing and responsive checks; verify real customer checkout and authorized read-only admin order detail. |
| `tests/browser/product_recommendations.py` | Await expected URL and settled product heading/breadcrumb/title and non-inert main. Record native BrowserRouter history, assert one PUSH and matching POP through actual browser Back, and verify unchanged bag after both directions. Preserve recommendation, vehicle, accessibility, responsive and motion coverage. |
| `tests/browser/account_fallback.py` | Companion Flow workflow regression now checks correctly sized Access181 poster, authentic rendering on Retry, real WebGL context loss, current Overview, mobile and reduced-motion login, zero API requests and uncaught errors. |
| `tests/browser/account.py` | Companion API workflow regression uses real Access181 registration, Story/Home, current Garage, Quick View/product, Review/Checkout, persisted orders, logout, safe deep-link return, accessibility and responsive views. |
| `tests/browser/api_failure.py` | Companion API outage regression asserts current Access181 connection error and Retry UI, no sign-in or Flow state/catalog fallback. |
| `docs/CI_FIX_B4_REPORT.md` | Inspection, rationale, per-file scope, validation results and limitations. |

No production checkout, payment, database, authentication or authorization
semantics were changed. Loader → Login → Story → Home remains intact.

## Validation environment

- Local Node 24.14.0; Python 3.13.14; Playwright 1.55.0 and installed Chromium.
- Compiled Flow served by Vite preview at `127.0.0.1:4173`; real scene assertions
  use SwiftShader. `VITE_EXPERIENCE_TESTS=true` enables existing camera telemetry.
- Real API checks use a separate native MongoDB 8.2 process on
  `127.0.0.1:27194`, with a fresh workspace-only data directory under
  `test-results/b4-mongo/data`. Only the existing `dth_*_test` /
  `dth_*_browser_test` disposable database names are used.
- No production MongoDB, real customer credentials/data, real payment or
  shipment were used.
- The task preview, API and disposable MongoDB listeners were stopped after
  verification; no listener remains on ports 4173, 5000 or 27194.

## Results

- `npm run check`: passed.
- Relevant non-database Node regressions: **1,031 passed, zero failures/skips**
  across the main 795-test run and 236 additional NVX/cart regressions.
  Includes baseline/domain/security/standalone, account/Flow, support,
  cinematic/experience/camera, Home/Shop motion, product decision/study/profile/
  recommendations, login/journey, Garage, full cart/review, checkout and loader;
  NVX catalog/migration/API query and cart drawer/quote/routes/order/adapters.
  Additional run log: `test-results/b4-node-additional.log`.
- Disposable MongoDB integration: **61 passed, zero failures/skips**:
  experience 18, account 21, support 22. Logs:
  `test-results/b4-mongo/*-integration.log`.
- `npm run build:flow` with existing experience telemetry: passed.
- `VITE_STORE_MODE=api VITE_EXPERIENCE_TESTS=true npm run build`: passed.
- `tests/browser/cinematic_home.py`: passed, 13 checkpoints, zero page errors;
  final evidence records `net::ERR_FAILED` for the intercepted GLB and HTTP 200
  on Retry, followed by a live WebGL drawing buffer.
- `tests/browser/product_recommendations.py`: passed, 11 checkpoints, zero page
  errors. Native history changes from Coilover `idx=0` to wheel `idx=1` and back
  to the exact original key/state at `idx=0`. URL, title, breadcrumb, rendered
  product and recommendations restore; bag remains unchanged. The application
  delays rendered route transitions after URL changes; no application routing
  defect was demonstrated locally, so no speculative routing change was made.
- Existing `tests/browser/app_loader.py`: passed, 28 assertions.
- `tests/browser/account_flow.py`: passed, 16 checkpoints, zero browser errors
  and **zero API requests**, including current NVX Garage, checkout/history,
  safe return/logout, accessibility and genuinely still reduced-motion WebGL.
- `tests/browser/account_fallback.py`: passed, seven checkpoints, zero browser
  errors and API requests; Retry and actual context loss verified.
- Python syntax compilation of all eight changed browser scripts: passed.
- `tests/browser/experience_studio.py`: passed, 22 checkpoints, zero page
  errors; real authentication, Story, camera, private drafts, publication,
  rollback, invalid-camera protection and versioned GLB fallback/Retry.
- `tests/browser/admin_support.py`: passed, 19 checkpoints, zero browser
  errors; actual SSE/HTTP, uploads, reconnection and lost acknowledgement,
  authorization, read-only order administration and product editing/preview.
- `tests/browser/account.py`: passed, 15 checkpoints, zero browser errors;
  actual registration, current Garage, Quick View, consent-based demo checkout,
  MongoDB history/reload, server logout and safe deep-link return.
- `tests/browser/api_failure.py`: passed; zero browser errors and no silent
  authentication/catalog fallback on API outage.
- `git diff --check` and independent review of all eight browser diffs: passed.
  No assertions were skipped or removed to obtain these results. Obsolete UI
  assertions were replaced by checks of the actual current interface/behavior.

All five primary browser regressions and their three workflow companion tests
pass locally. Screenshots, HTML on failures and JSON evidence are under the
corresponding ignored `test-results/` directories. Intermediate failures in the
rewritten Account test exposed obsolete Quick View assumptions, navigation
before asynchronous logout, a Flow/API-specific admin destination, and an
initially still renderer without a `data-running` attribute. These were fixed
with the actual controls/destinations, awaited logout and a direct check that
the native renderer's frame count stays unchanged under reduced motion.

## Additional failure outside the five target workflows

The optional, unchanged `tests/browser/nvx_step15.py` smoke test fails at its
first assertion: it expects `FLOW DEMO / NO DATABASE` on a guest `/shop` route,
but the current Login-first gate correctly renders Access181. The script also
still references the retired `data-nvx-garage` account UI. None of the five
target workflows invokes this script. Its failure is retained in
`test-results/nvx-step15/results.json`; it was not suppressed or counted as a
pass. Current NVX V1/V2/V3 behavior is covered by the rewritten Account Flow
browser regression and passing NVX/garage Node tests.

## Limits

Local verification uses Windows/native MongoDB; GitHub Actions uses Ubuntu and
MongoDB 8.0 containers. The PR's hosted workflows cannot be rerun for this patch
without a commit/push, which the user has not authorized. No commit, push, merge,
workflow dispatch or remote data mutation has been performed.
