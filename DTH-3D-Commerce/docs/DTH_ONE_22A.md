# DTH ONE 22A.1 — Unified header & Account spatial baseline

## This release
- One shared, pearl-glass storefront header with consistent geometry and typography. It uses its own internal selectors so the older Studio header-movement hook cannot take ownership of it. The real sticky header includes its visual padding; existing header-height observers continue to measure its bottom correctly.
- Member presentation is delegated from the existing AccountPage MemberArea, preserving authentication/session/order requests, pagination, search, sign-out locking and the existing password-confirmed delete dialog.
- One mounted vehicle renderer survives Account views. Overview/Garage change a bounded spherical camera pose; Orders/Profile hide the stage and suspend rendering. Changing user unmounts the entire member instance as before.
- Real NVX model mapping is reused. Missing V1 remains an explicit missing state. Asset URLs are local or the per-version published endpoints only.
- Native wheel scrolling, manual orbit, keyboard-accessible zoom/reset, reduced-motion handling, same-model request deduplication in the wrapper, and original GPU resources disposed on unmount.
- Pointer-responsive pearl/blue light layers using GSAP quickTo. Transform/opacity layers, not a second WebGL renderer. No texture/geometry edits or fake physical compatibility.
- Existing useGarage is authoritative for saved versions/revision/default writes. Local preview is separate from saved default and shopping selection.
- Orders/Profile use genuine data and original order detail/deletion components. No email/password edit endpoint is invented.

## Deliberately not part of this release
The Ultra fluid/refraction shader, detail-lens second render pass, 3D part-study mode inside Account and cross-route shared-model transfer are deferred until the baseline has passed real-device checks. This release does not claim those planned features are complete.

## Contracts
- Header integration: `frontend/src/shop/StoreApp.jsx` — replaces ONLY the recognized header JSX with DTHNavigation22A and passes the existing chooseVehicle/openCart callbacks. Routes, dialogs, main, footer contents, store and providers remain.
- Account integration: `frontend/src/shop/account/AccountPage.jsx` — early presentation branch consumes the original MemberArea state/handlers. Auth gates and legacy member JSX stay intact. `/account?account=classic` displays the old member view; the header stays unified.
- Backend, MongoDB, GLBs, materials, lockfile, dependency versions, Store provider, Studio/Story/Shop sources and existing NVX renderer are not modified.
- The isolated renderer fork starts from `createNVXStage.mjs`, Git blob `7be6451d1a3a920b9cfc3e3bead269f54d09b0e5`, rather than changing the renderer used by Build Studio.
- Raw missing/network/context errors are displayed with Retry; no fake completion progress or silent replacement with another model.

## Visual direction
Manrope UI typography requested via Google Fonts CSS, with local Segoe UI/Arial fallbacks; no font file is bundled. Pearl/ice blue surfaces, midnight ink, one cobalt action color. One title per view, no decorative outbound arrows. Normal focus rings, real status feedback, stable hit areas.

## Guidance used
Read relevant frontend-design, GSAP React/context/performance, 3DViz and Three.js interaction guidance available in the conversation/project. The design follows the planned Vercel React/composition patterns (transient pointer data stays out of React state; presentation layers share existing state).
No external skill installer/hook was executed on the user's laptop. No claim is made that Impeccable CLI or a UI-UX search database ran. The optional future skills can be installed/reviewed separately.

## Validation commands
`node --test tests/account-one-22a.test.mjs`
`npm run build --workspace frontend`
Optional actual browser: `python tests/browser/account22a_smoke.py --headed`
The browser script performs read-only navigation/inspection and writes screenshots outside the repo at `~/DTH-QA/account22a`. It never saves login credentials or deletes records. Screenshots may contain personal account details; do not commit them.

## Required real-device checks before acceptance
Sign in; confirm default vs shopping state; test add/cancel/set-default/remove using a test account; verify 401/409 feedback; move pointer; switch Overview/Garage repeatedly and inspect GLB network requests; resize during orbit; press Escape/Reset; open Support then close; test no-model V1, valid V2/V3, lost WebGL, mobile navigation, reduced motion, search/pagination/back URL and sign out.
No FPS promise is made before recording timings with the actual assets on the laptop/PC.
