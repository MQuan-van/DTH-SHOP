# DTH Studio Atelier — 22H.1

## Scope and visual system
New Studio module: `frontend/src/experience/studio22h`. HomePage still loads Published Experience configuration and honors its enabled state; only the cinematic component choice changes. The original cinematic home remains available at `/?studio=classic`. The Story, Shop, Admin, login, checkout and DB are not patched.

Design: full-stage graphite/navy showroom, original live GLB centrally displayed, lower-left product cluster, camera preset rail, category selector tied to actual active products. White asymmetrical editorial gallery; selected-vehicle garage. No decorative arrow icons, endless light trails, fake ratings, fabricated discounts or meaningless counters. The item index and category counts represent real available assets.

Tokens: background #0B1119, secondary #121C27, ink #ECF2F6, muted #A6B5C2, action #386FE9, ice #A2D6ED, paper #FAFBFC, dark-on-light #152633. Existing project font stack; no downloaded font binaries. Stage typography 40–70px desktop / 38px mobile. Controls min-height 44px (product chips included). Existing source finish is authoritative; blue light is an atmospheric background, not a material recoloring.

## Data and navigation
Uses `useStore`, `useOutletContext().chooseVehicle`, `setVehicle`, shared `fitment` and `vehicleLabel`. Selected vehicle remains the same store state used by Shop and checkout. Garage links to `/shop?mode=shop&fit=match` after selection; no unverified real fitment claim. Products retain original slug, price and active status. No MongoDB export, seed, schema change or API call is introduced. Does not auto-save the vehicle to an account; this remains the existing selection behavior.

The initial hero respects the published Experience productId. Selection never edits the configuration. With an absent published hero, a live featured model is used. Photo-only products can appear in the editorial gallery but not the live model selector. Version binding is applied only to the exact matching URL and a valid SHA-256.

## 3D and motion
One Canvas; inner loaded model changes on selection. Existing High Fidelity useProfiledModel and asset profiles supply validated geometry and Admin presentation. The loader owns disposal. No vertex, texture, source color or material edits. The environment uses neutral white lighting consistent with the existing presentation view.

GSAP owns DOM transitions; one R3F frame callback owns camera motion. OrbitControls writes only during manual inspection. Returning from manual inspection has a bounded pose transition (unless motion is disabled). Wheel scrolling stays native because OrbitControls zoom is disabled; named Zoom in/Zoom out buttons provide zoom. Escape leaves inspect unless a dialog/support panel owns the input. When hidden/offscreen/blocked, idle rendering is stopped. Canvas is demand-driven; no setState per animation frame.

Desktop quality caps DPR at 2; compact caps at 1.5; Save-Data caps at 1. Geometry is unchanged. These are pixel budgets, not an FPS guarantee. Do not raise resolution or enable bloom before measuring real GPU costs.

Reduced motion: no intro/reveal tween, no idle camera turn, no CSS shimmer/transition. Camera presets and controls remain available. All visible action labels are English to match the current website.

## Intentional limits
No brand-new full-bike GLB, fabricated exploded assemblies, comparisons, saved builds, checkout changes or AI generation. The editorial gallery uses existing preview images, not three extra live canvases. Advanced assembly controls remain in the original Studio view; this step does not reconstruct mechanical subassemblies from a fused AI mesh.

## Verification
Run `node --test tests/studio-atelier-22h.test.mjs` and `npm run build --workspace frontend` locally. Verify actual models, especially X1R GTR and X1R GT4, with their saved Admin orientations. Check rapid category changes, repeated same-product clicks, absent model, failed request, route back/forward, Pause, Inspect, touch scroll, camera presets, and selecting each NVX version. Check Story and Shop still render.

The package's static layout QA uses the actual JSX with substituted hooks/router/store and a labeled SVG model fixture; it is not React/R3F/GSAP integration testing. No runtime, visual fidelity or FPS claim can be inferred from unit test/build success alone.
