# DTH Precision 24 — validation and handoff (2026-11-02)

Base: branch feat/story-shop-ultra-pc-20261026, commit c9cad73. No commit, push, pull, Git reset,
Atlas migration, backend startup, seed, user/order mutation or live support message was performed.
Existing untracked c28d7851-fb21-4c78-9a7b-4e4412ef6690 GLB/WEBP remain untouched.

## Delivered presentation

Shared precision tokens and press/focus states; full-width navigation with transform-only marker;
Studio pearl information beside the original 3D stage and one scoped entrance timeline; original
Story photography and study director; Shop Showcase/Catalog/search/filter controls; Build workbench
and page-local shortlist; Product viewer/purchase hierarchy; Login, Account and Orders/Profile;
Bag drawer, full Bag, Checkout; offline Support state; Admin shell, tables, product editor and Inbox.
Existing scene engines, authored presentation, source GLBs, API payloads, authentication handlers,
identity/revision guards, fitment and order validation remain authoritative.

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| Import/structure check | Pass | test-results/premium24/check-final.log and verification-final.log |
| Selected pure/source regression suites | 1566 passed, 0 failed, 0 skipped | test-results/premium24/verification-final.log |
| Production frontend build using existing local API configuration | Pass, 6.81s on final CSS | test-results/premium24/build-production-final.log |
| Isolated Flow build for browser acceptance | Pass, 6.87s | test-results/premium24/build-flow-final.log |
| Git whitespace check | Pass after removing one trailing space | git diff --check |
| Changed backend/shared data/dependencies/tracked public assets | None | git diff --name-only scope check |

Repeat the pure/source checks and production build with:

~~~powershell
node tools/verify-premium24.mjs
~~~

The script does not run database integrations or the browser. 1566 includes source contracts and
fixtures; it is not an end-to-end test count. Stale assertions were updated to follow the active
navigation/hotspot modules, preserve modified-click behavior and validate current Scene props.

## Real browser evidence

Browser tested the actual React app, real local GLBs and existing published Flow fixture
(demo@dth.test). Flow is explicitly labelled UI rehearsal/no database. No real credentials were used.

- Studio rendered one canvas. At 1440x900, stage document bounds stayed about 819.95x506px at
  (541.36,196) between overview, Inspect and Reset; viewport scroll is excluded from this comparison.
- Studio loaded at laptop 1366x768 and desktop 1920x1080 without document horizontal overflow.
- Mobile menu opened and navigated to Build. Studio, Build, Product, Checkout and Support inspected
  at 390x844. Catalog also inspected at 320x740; final header right edge 304px, document width320px,
  and no rendered Catalog button measured below43px (the CSS minimum is44px).
- Build V2 -> Suspension -> Studio Coilover -> Add to build opened the correct confirmation.
  Continue building retained one selected part and 3,550,000 VND estimate. Bag remained unchanged.
- Product loaded its GLB and compatibility disclosure. Add to bag opened drawer; increasing quantity
  produced two items and 7,100,000 VND. Drawer Tab wrapped to Close bag.
- Review order checked Flow catalog and required demo acknowledgement before Continue to checkout.
  Checkout opened with required fields and disabled Place demo order. No order was placed.
- Support opened its honest offline/preview state and closed with Escape.
- Account retained distinct no-saved-default vs shopping-with-V2 states. Orders empty view rendered.
  One canvas remained in the DOM across Account views; this alone does not certify GPU suspension.
- Catalog search coil preserved query/vehicle context and returned two matching demo parts.
- Existing app motion controls, loading states and native focus styles inspected. Native operating
  system reduced-motion emulation was unavailable in this browser control; code/CSS guards were
  reviewed, but no live native-preference pass or accessibility certification is claimed.

Screenshots are local, ignored evidence in test-results/premium24 (Studio desktop/laptop/mobile,
Story, Catalog, Product, Build confirmation, Login, Account, Bag, Checkout and Support).
Screenshots are not FPS/GPU measurements. No 60 FPS, Core Web Vitals or physical-device claim.

## Material findings still requiring separate work

- In the local Build preview, the asset labelled NVX V3 visually rendered as a suspension model.
  Evidence: build-v3-mobile.jpg. Its GLB header/hash validity does not establish motorcycle identity.
  Do not use it for verified mounting or silently substitute V2/V3 geometry. Original file and mapping
  were preserved. V2 displayed an actual scooter in Account; no semantic labels were inferred.
- No authored focus profiles are present. Precise focus/mounting must be authored on verified assets.
- Authenticated Admin and real API/MongoDB support/checkout were not browser-tested because the backend
  remains off under the user's no-real-data-write constraint. Admin source/pure tests/build passed.
- The default API-backed catalog and Ohlins cloud record remain dependent on the separate Atlas work.
- Python UI/UX search could not execute through WindowsApps python or missing py launcher. Written
  skill guidance was applied; no search-script/audit execution is claimed.

## Backups and PC/laptop synchronization

Original source snapshots: backups/premium24-before. Exact tracked baselines from c9cad73:
backups/premium24-head-c9cad73. Both are ignored. No automatic rollback/reset is provided; review
individual diffs and restore only the intended source file if necessary, preserving newer edits.

On the machine receiving the final patch, run the verifier, inspect git diff, and stage only reviewed
UI/tests/docs/tools. Keep .env, backups and test-results out of Git. The two existing untracked assets
need their own provenance/review decision; this UI pass does not automatically stage them.

This pass was made on the laptop checkout. After a reviewed commit here:

~~~powershell
git push origin feat/story-shop-ultra-pc-20261026
~~~

On PC, from its application folder (only when local edits are committed or otherwise preserved):

~~~powershell
git status -sb
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
git lfs pull
node tools/verify-premium24.mjs
~~~

If Git reports divergence or an untracked-file collision, stop and compare; never use force/reset/clean.
This workspace has uncommitted UI work, so do not pull over it now. This patch has not been committed
or pushed by the agent. Secrets, MongoDB records and backend configuration do not sync through Git.

The review server is http://127.0.0.1:4173 and serves an isolated, labelled Flow build, not the
API-configured production output. The temporary Vite development server on5173 was stopped.
To recreate this review without editing .env or starting MongoDB:

~~~powershell
npm.cmd run build --workspace frontend -- --mode flow --outDir ../test-results/premium24/flow-dist
npm.cmd run preview --workspace frontend -- --outDir ../test-results/premium24/flow-dist --port 4173
~~~

## Changed files (53)

- docs/DTH-PREMIUM24-DESIGN.md
- docs/DTH-PREMIUM24-VALIDATION.md
- frontend/src/experience/access181/AccessScreen181.jsx
- frontend/src/experience/commerce23/Account23.jsx
- frontend/src/experience/commerce23/BuildExperience23.jsx
- frontend/src/experience/commerce23/DTHNavigation23.jsx
- frontend/src/experience/commerce23/Story23.jsx
- frontend/src/experience/commerce23/Studio23.jsx
- frontend/src/experience/premium24/premium24.css
- frontend/src/experience/premium24/studio-story24.css
- frontend/src/experience/premium24/usePrecisionStudioMotion.js
- frontend/src/experience/refinement232/Support232.jsx
- frontend/src/main.jsx
- frontend/src/shop/StoreApp.jsx
- frontend/src/shop/account/AccountPage.jsx
- frontend/src/shop/account/AccountPage.module.css
- frontend/src/shop/account/premium-account.css
- frontend/src/shop/admin/AdminLayout.jsx
- frontend/src/shop/admin/Orders.jsx
- frontend/src/shop/admin/Products.jsx
- frontend/src/shop/admin/Vehicles.jsx
- frontend/src/shop/admin/ops18b/InboxPro.jsx
- frontend/src/shop/admin/ops18b/ProShared.jsx
- frontend/src/shop/admin/premium-admin.css
- frontend/src/shop/admin/premium213/PremiumAdminShell213.jsx
- frontend/src/shop/admin/premium213/PremiumOverview213.jsx
- frontend/src/shop/cart/CartDrawer.jsx
- frontend/src/shop/cart/CartDrawer.module.css
- frontend/src/shop/cart/page/FullCartPage.jsx
- frontend/src/shop/cart/page/FullCartPage.module.css
- frontend/src/shop/catalog/ShopPage.jsx
- frontend/src/shop/catalog/components/QuickView.jsx
- frontend/src/shop/catalog/components/ShopIcon.jsx
- frontend/src/shop/catalog/fitment/FitmentStatus.jsx
- frontend/src/shop/catalog/fitment/VehicleFitmentStrip.jsx
- frontend/src/shop/catalog/search/SearchDiscovery.jsx
- frontend/src/shop/checkout/CheckoutPage.jsx
- frontend/src/shop/checkout/CheckoutPage.module.css
- frontend/src/shop/components/StoreIcon.jsx
- frontend/src/shop/discovery174/DiscoveryPage.jsx
- frontend/src/shop/discovery174/premium-shop.css
- frontend/src/shop/garage/NVXPicker.jsx
- frontend/src/shop/product/ProductDecisionPage.jsx
- frontend/src/shop/product/ProductMedia.jsx
- frontend/src/shop/product/recommendations/ProductRecommendations.jsx
- frontend/src/shop/product/recommendations/RecommendationCard.jsx
- frontend/src/shop/story214/ShopStoryPage214.jsx
- tests/admin-calm19b.test.mjs
- tests/cart-drawer.test.mjs
- tests/shop17.test.mjs
- tests/spatial-commerce-23.test.mjs
- tests/standalone.test.mjs
- tools/verify-premium24.mjs
