# DTH Studio Precision 22H.2

## Scope

This increment replaces only the Studio 22H.1 lazy-import target in `HomePage.jsx` and appends a scoped block to `AGENTS.md`. The previous Studio remains on disk. `?studio=classic` still selects the legacy CinematicHome. Story Reborn, Story Shop, Admin, API handlers, product/vehicle records, asset validators, GLBs, and package manifests are not edited.

## Interface decisions

The old Front/Detail/Rear rail and redundant Pause motion/Browse the edit links are removed. Full view, Pick a detail, and Free orbit have distinct jobs. Full view fits the complete authored model and defaults to automatic orbit. Pick a detail stops rotation and aims at a real raycast hit on the displayed model. It does not infer spring/reservoir/mount semantics from a generic AI mesh. Center detail is an explicitly named keyboard alternative. Free orbit is deliberate manual inspection with zoom/rotate/reset buttons. Reset and Escape restore full framing and automatic rotation.

The hero rectangle stays identical between modes. Header navigation retains every original link and cart/vehicle handler; a route-scoped floating frame and a sliding hover/focus capsule improve hierarchy without moving hit areas. Control surfaces use bounded inner-icon motion and pointer-following light. Touch gets visible active/pressed states, not hover-only interactions. Normal automatic rotation stops while the tab is hidden, a modal/support panel blocks interaction, or OS reduced motion is enabled. There is no global Pause control.

Garage is a real vehicle stage using the project's existing NVX renderer/config and approved model manifest. It shows only the correct supplied version; missing V1/V2 assets remain explicit missing states. Previewing the default version does not secretly select it. Counts and category links are calculated from active product mappings. Compatibility remains demonstration data, not installation guidance.

## Camera ownership and framing

`studio22h2.logic.mjs` is a pure camera state machine. Its mutually exclusive owners are the scripted transition, manual OrbitControls, and automatic overview orbit. It interpolates yaw/pitch/distance/target, chooses the short yaw path, and enforces clearance outside the complete transformed bounding sphere throughout transitions. It never linearly flies through the object. Full-fit distance uses the smaller vertical/horizontal half-FOV, with margin. Inspect resizing recomputes framing in every mode, not only before the first frame. Camera bounds derive from the loader's measured bounds after the existing presentation transform. No geometry or material is rewritten.

`ProductStage22H2.jsx` keeps one Canvas across product switches, replacing only its product-owned contents. It uses the existing profiled model hook and its High Fidelity validation; owned-scene disposal remains with that hook. Ready is emitted after a mesh actually renders, not on a timer. Picking raycasts once per intentional click/tap, never on every pointer move. Wheel zoom and panning are disabled for product inspection so page scrolling stays native.

A visibility-based lease gives either the hero or Garage the active renderer. The vehicle stage releases its GLB/GPU resources on departure; returning may require reloading/parsing. This is a deliberate memory trade-off, not a promise of instant transitions or zero transient GPU allocation during teardown.

## Compatibility and provenance

No dependency upgrade or WebGPU migration is performed. Code targets the installed WebGL/R3F APIs, not every newer API described by skills targeting Three r186. The reference GitHub commit declared Three `^0.184.0`, R3F `9.8.1`, GSAP `3.15.0`; local lockfiles remain authoritative.

Guidance used: the project's frontend-design, GSAP React, UI/UX Pro Max, Three.js interaction/R3F guidance, and 3Dviz's separation of authoring, observation and claims. No claim is made that every installed skill/database record was executed. Skills are advisory and do not authorize changing business rules or source assets.

Primary technical references:
- https://threejs.org/docs/pages/OrbitControls.html
- https://r3f.docs.pmnd.rs/advanced/pitfalls
- https://gsap.com/resources/React/

## Acceptance

Run `node --test tests/studio-precision-22h2.test.mjs` and `npm run build --workspace frontend` locally. Then inspect an actual standard GLB and an AI GLB in a GPU-enabled browser. Exercise Full view → Inspect → zoom/rotate → Reset, surface picking, resize, rapid mode/product switching, header links, cart, vehicle picker, Garage model switching, absent versions, and returning from Garage to Hero. OS reduced motion and keyboard focus must work.

An optional live Playwright test is at `tests/browser/studio22h2_acceptance.py`. It is not required for installation and is not invoked by the installer. The user may sign in manually with `--headed --login`; do not commit auth-state files or credentials. Diagnostics are available only when the project's Vite environment sets `VITE_EXPERIENCE_TESTS=true`. The numeric test is reported as not run when this flag is absent.

## Known limits

The package was syntax checked and pure logic/installer/static layout tested in the authoring environment. Full dependency installation, Vite build, actual React/R3F integration, supplied GLB rendering, and GPU FPS were not executed there. The optional browser test is provided for local acceptance, not claimed as passed. Static QA images use conspicuously labelled SVG stand-ins and are not evidence of real 3D output.

A browser with WebGL disabled still cannot render 3D. The Retry action can recreate the stage after a transient failure; it cannot override browser/GPU policy. Existing browser-extension errors, a missing favicon, or the R3F dependency's deprecated Clock warning are not fixed by this increment. The original GLB detail level remains unchanged; this patch cannot create geometry absent from a source model.
