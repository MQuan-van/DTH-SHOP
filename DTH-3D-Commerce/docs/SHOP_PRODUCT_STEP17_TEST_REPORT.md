# Step 17 — Verification report

Date: 2026-10-07. Reference: 0e6d63faed2fe1f0eae70aecb4c6347f923baf33.

## What was actually tested

- **56/56 Node tests**: presentation helper validation, category patches, counts, price display,
  safe shop return paths, fitment labels, disclosure hashes, plus explicit source-structure assertions
  in tests/shop17.test.mjs. These are NOT purchase/API/MongoDB end-to-end tests.
- **21/21 offline installer tests**: read-only check, prerequisites, anchor conflicts/duplicates,
  unrelated edits, collision preservation, CRLF, idempotency, apply/undo, edited-after-install guard,
  symlinks, locks and CLI flags. Exact before/after byte comparison for the purchase function,
  Scene JSX and viewer keyboard handler. Only three original source files are patched.
- **32/32 isolated Chromium assertions**: delivered compact React components run with React 16.0.0
  available in this environment, mocked router/store/catalog/image boundaries, and fixture layout.
  Includes NVX selection, multi-category switching, separate quick action, link state,
  keyboard disclosure open/close, hash reveal, motion off/reduced motion, repeated mounts,
  and document overflow checks at 320–1920 px. No uncaught JS error in this isolated harness.
- **10 JS/JSX/CSS files parsed**: modified route/media sources plus added modules/tests.
  TypeScript parser/transpile was used as a syntax tool, not as a production dependency.
- Python browser test file was parsed with Python's compiler.

The three original route/media files were read from the pinned GitHub commit and reconstructed
byte-for-byte for offline transformation tests. Their Git blob SHA-1 values were checked:

- ShopPage.jsx: 2c85f9b6adee88f76a94e6948f673b1d48ffbcd5
- ProductDecisionPage.jsx: 60e8baf2240ee38e00f3e517de68b3f8771c9f94
- ProductMedia.jsx: a6d2e07338eaf71d063cfe24770e856be036cae5

## Not tested here

External package/repository download failed (DNS unavailable). The complete repository and its
React 19 / Vite / Three.js dependencies were not installed or built. Therefore:

- No claim that full npm test or npm run build has passed.
- No actual GLB/WebGL rendering, GPU/FPS measurement, full modal/grid integration or backend API test.
- No live MongoDB/account/cart/checkout mutation or persistence test.
- No React 19 StrictMode end-to-end claim from the React 16 isolated component harness.
- The provided tests/browser/shop17.py is a runnable compiled-site regression script, not a completed
  full-site test result. Existing browser suites that assumed always-visible 3D study controls need
  to open the new 3D tools disclosure before interacting with those controls.

Preview/evidence screenshots contain fixture illustrations and a visible testing label. They are
layout evidence, not screenshots of the user's live site. No fixture illustrations, placeholder
assets, React library copies or mocked data are installed into the actual application.

## Required local acceptance

Run the new Node suite, npm run check, npm test and npm run build. Then verify real search,
filter dialog focus restoration, keyboard navigation, NVX + URL state, product navigation,
viewer controls/failure handling, advanced 3D tools, add-to-bag validation, mobile layouts and
reduced motion. Keep the code backup until acceptance. Do not reset/drop MongoDB.
