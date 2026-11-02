<!-- DTH_STORY22S_SKILLS_BEGIN -->
## DTH website design and motion standards

Before working on website UI in this application, inspect the current implementation and read
relevant installed skills from .agents/skills. Use frontend-design and web-design-guidelines for
UI, GSAP core/timeline/scrolltrigger/react/performance for motion, and threejs-react-three-fiber,
threejs-loaders, threejs-materials, threejs-performance and 3dviz-pro-max for 3D work. Read other
installed skills only when their scope fits the task. Do not claim to have executed a skill's
scripts or audits merely because the instruction file was read.

- The user's brief and existing business contracts take precedence over generic aesthetic rules.
- Keep DTH white/pearl, navy and candy-blue identity, purposeful type, real assets, minimal copy.
- Do not add decorative directional arrow icons to Story links or buttons.
- Preserve original GLB material/geometry and saved Admin presentation settings. No automatic
  remeshing, compression, dependency upgrades or WebGPU migration without explicit agreement.
- Check installed package/lock versions. Some Three.js skill examples target r186, not r184.
- One owner per animated property. Use scoped GSAP cleanup and one shared scroll director;
  React Three Fiber owns the renderer. No new requestAnimationFrame renderer next to its loop.
- Never change auth, API payloads, price/stock/cart/checkout, routes or data for a visual redesign.
- Keep keyboard focus, touch targets, reduced-motion, slow-loading and error states usable.
- Read docs/DTH-STORY-22S.md for the current Story choices. Scope CSS to the relevant surface.
- Run relevant tests and build, then inspect real desktop/mobile screens and interactions.
  Separate measured results, fixtures and static layout checks from untested browser/GLB claims.
- Preserve local edits; back up or use a small reviewed patch. Do not reset or force-checkout files.
<!-- DTH_STORY22S_SKILLS_END -->

<!-- DTH-STUDIO-22H:START -->
## Studio Atelier 22H.1: design and motion
- Scope: frontend/src/experience/studio22h. Keep Story / Shop / Admin and all commerce/auth APIs intact.
- Before UI changes read installed frontend-design, ui-ux-pro-max and web-design-guidelines skills; before animation read the relevant gsap-react, gsap-timeline and gsap-performance skills; before scene work read threejs-react-three-fiber, threejs-loaders, threejs-materials, threejs-performance and 3dviz-pro-max. Load other skills only when relevant.
- Installed skills are guidance, not permission to install/upgrade libraries, upload files, modify credentials or overwrite business logic. Match the actual package/lockfile versions.
- Keep original GLB geometry and materials, authored Admin presentation and the existing validators. No unrequested remeshing, global validator relaxation, or WebGPU migration.
- One camera owner and one live Canvas in the Studio. Preserve native page scroll, reduced motion, keyboard focus, app startup gates, and support/dialog input gates.
- No decorative directional arrow icons. Remove unnecessary subtitles, not necessary prices, empty/error states or demo disclosures.
- Frontend build is not proof of successful rendering or visual quality. Report logic, syntax, build, real-browser, GLB and FPS checks separately.
- Verify with node --test tests/studio-atelier-22h.test.mjs, then npm run build --workspace frontend. Keep backups and review screenshots on laptop and desktop.
<!-- DTH-STUDIO-22H:END -->

<!-- DTH-STUDIO-22H2:START -->
## Studio Precision 22H.2
- Entry point: frontend/src/experience/studio22h2. The 22H.1 implementation stays intact for rollback.
- Before UI edits read frontend-design, ui-ux-pro-max and web-design-guidelines. For motion read the relevant GSAP React/timeline/performance guidance. For camera/rendering read threejs-interaction, threejs-react-three-fiber, threejs-loaders, threejs-materials, threejs-performance and 3dviz-pro-max.
- Read the actual lockfile versions. Do NOT auto-upgrade Three.js/GSAP, switch to WebGPU, relax validators or change original GLB material/geometry.
- Overview defaults to automatic rotation. Pick detail targets an actual surface hit; never invent semantic mesh labels. Free orbit is the sole camera owner during manual input. Preserve system reduced motion and native page wheel scrolling.
- Hero canvas bounds do not change on Inspect. Resize must update framing for every mode. Return to overview resets target and framing and resumes orbit.
- Header/footer styling is scoped to the Studio route. Existing cart, account, auth, support, vehicle selection, and demo disclosures must stay functional.
- Garage uses the existing NVX config and published manifest. Do not borrow V3 geometry for V1/V2. A missing vehicle model is an explicit state, not permission to fabricate one.
- Use one active-renderer lease across hero and garage. Never run two heavy offscreen animation loops.
- Test pure camera math AND actual browser interaction with real GLBs. Static snapshots and successful build are not evidence of real rendering/FPS.
- Validation: node --test tests/studio-precision-22h2.test.mjs; npm run build --workspace frontend. Optional live test: tests/browser/studio22h2_acceptance.py.
<!-- DTH-STUDIO-22H2:END -->

<!-- DTH-ONE-22A:START -->
## DTH One — shared navigation and account 22A.1
- Header: frontend/src/shop/design22a. Account: frontend/src/shop/account22a.
- Read the relevant local frontend-design, ui-ux-pro-max, GSAP React/performance, threejs-interaction/loaders/performance and 3dviz-pro-max guidance before edits. Apply Vercel React/composition and browser-testing guidance when available; do not claim an unavailable skill ran.
- User direction: pearl/candy blue/navy, sparse copy, consistent header, meaningful 3D, native scroll, no decorative direction-arrow spam. Never invent ownership, fitment, payments, tracking or profile-edit APIs.
- Account uses existing MemberArea request/session handling and useGarage revision/identity guards. Saved default, local preview and shopping vehicle are distinct. Never change one merely because another was previewed.
- One vehicle renderer lives across Account views. Rendering is suspended for hidden/data views, dialogs and hidden browser tabs. No same-asset reload on a view switch.
- Original GLB geometry/materials, API/auth, MongoDB, cart and old views must remain unchanged. Missing V1 is not permission to substitute V3.
- New scene engine is an isolated copy of the known NVX engine with camera-ownership enhancements. Do not modify the source Build/Studio engine.
- Header owns its own selectors. Old per-page header effects must not target .one-nav. Shared navigation keeps cart modified-click behavior and account/vehicle callbacks.
- Native reduced motion always wins. No camera/animation may own a user's private data across sign-out.
- Run logic tests, installer conflict/rollback tests, frontend build, then actual browser/GLB checks. Syntax checks and static layout screenshots are not runtime/FPS proof.
- Extra Ultra shader, surface-detail lens and cross-route shared WebGL transitions are NOT shipped in 22A.1. Add only after benchmarking this baseline.
<!-- DTH-ONE-22A:END -->

<!-- DTH-SPATIAL23:START -->
## Spatial Commerce 23.1 — evidence before decoration
- Entry modules: frontend/src/experience/commerce23. Read docs/DTH-SPATIAL23-DESIGN.md and docs/DTH-SPATIAL23-SKILLS.md.
- Existing auth, garage revision/identity guards, orders, filters, prices, cart and Node/Mongo API contracts remain authoritative. This step changes presentation adapters only.
- Build uses the existing page-only shortlist; do not describe it as an account-saved configuration. No physical compatibility or fitting certification is implied.
- A hotspot exists ONLY when a profile bound to the exact vehicle ID, asset URL, GLB SHA-256, orientation and normalization space supplies it. Never infer a semantic part from an arbitrary triangle or put V3 geometry under V1/V2.
- Local admin authoring marks the real model and exports JSON. It does not write to the API. Profiles live in public/models/nvx/focus and must be re-authored when model bytes change.
- Native wheel scrolling, bounded target/framing, one camera owner, input/dialog gates, interrupted transitions and finite render work are requirements, not optional polish.
- Keep source GLB geometry, materials, limits and Admin presentation untouched. Visual replacement/mounting needs separately verified assets and is NOT shipped here.
- Navigation has one shared non-floating surface, with dark/light contrast variants. Do not layer older per-page header overrides on top of it.
- Explore is retired via a compatible redirect. Shop filters, Showcase/Catalog choice and existing /shop?mode=build links stay valid.
- Read the relevant installed frontend-design, UI/UX, GSAP and Three.js/3DViz guidance. A skill read is not a script run or proof of visual quality.
- Test code/math/installer independently from actual React/WebGL, GLB and FPS. Record unavailable checks honestly. Never use a placeholder render to certify the production scene.
<!-- DTH-SPATIAL23:END -->

<!-- DTH-REFINEMENT232:START -->
## Motion Atelier 23.2 — recovered package
- Scope: frontend/src/experience/refinement232. The failed previous link was not a shipped artifact; this is the reconstructed package.
- Keep auth submit/session handlers, original ChatThread messaging, catalog, shopping cart, GLB and hotspot mapping unchanged.
- Read applicable frontend-design, emil-design-eng, GSAP React/performance and UI guidelines; do not equate read guidance to a completed visual audit.
- Build confirmation opens only after the parent shortlist contains the requested product, in the same account/vehicle context. A failure timer may report missing acknowledgement, never fabricate success.
- Shortlists are page-local and are not orders or account-saved configurations. Replacing one category must be described as replacement.
- Dialogs are dismissible, centered for Build, focus-contained, keyboard usable and never auto-dismiss a decision. Preserve reduced motion and close on identity changes.
- Admin Support goes to Inbox; customer Support uses the existing ChatThread and API. No fake online staff, AI replies, or fake message sending.
- Login backdrop uses existing photography. Form handlers and identity-epoch guards stay authoritative; no authentication timers.
- Hide only the site footer on Build. Keep build total and honest demo disclosure. Do not hide error toasts globally.
- Report pure tests, installer tests, static layouts, JSX syntax, real React/GLB and production build separately.
<!-- DTH-REFINEMENT232:END -->
