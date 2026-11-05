# Studio Product Gallery — local design preview

2026-11-02, preview revision 02. The running demo is **http://127.0.0.1:5174/studio-gallery-demo.html**. It also works on the normal frontend port when that dev server is running. The current Studio route is unchanged.

```powershell
npm.cmd run dev --workspace frontend -- --port 5174
```

This is a working, isolated design preview: continuous pearl stage, navy type, candy-blue actions, original GLBs, image thumbnail selection, category filters and an Inspect toolbar. It is not installed as the production Studio route.

## Files added

- `frontend/studio-gallery-demo.html`: separate HTML entry; noindex.
- `frontend/src/experience/galleryDemo24/main.jsx`: demo bootstrap.
- `frontend/src/experience/galleryDemo24/GalleryDemo.jsx`: read-only public catalog, selection, controls, loading and motion lifecycle.
- `frontend/src/experience/galleryDemo24/GalleryStage24.jsx`: isolated copy of the existing Studio renderer; preview camera defaults and bounded poster capture. The shared renderer remains unchanged.
- `frontend/src/experience/galleryDemo24/gallery-demo.css`: styles for this standalone document.
- `frontend/src/experience/galleryDemo24/gallery-demo.logic.mjs`: pure catalog/selection adapter and explicit local asset study.
- `frontend/vite.gallery-demo.config.mjs`: separate build verification; output under ignored `test-results/gallery-demo/build`.
- `frontend/public/previews/gallery24/`: two 512px PNGs captured from actual rendered X1R/TTX GLBs and a manifest recording their source GLB SHA-256 values. Original catalog photos are preserved.
- `tests/gallery-demo24.test.mjs`: eleven focused adapter/camera/transition tests.
- This document.

No existing application source, shared renderer, routes, package manifests, locks or GLBs were edited for this preview. Existing uncommitted work is preserved.

## Actual data and rendering

The preview only GETs `/api/shop/products` without account credentials. X1R GTR MONOSHOCK is the real record returned by the local API. Its name, price, demo disclosure and authored presentation remain authoritative. Live catalog links use existing `/products/:slug` pages. No cart or checkout is simulated by this page.

Ohlins TTX is an explicitly labelled **local asset study**, using the existing `0262d0bd-690d-439e-8132-8b07088abadb.glb`. It has no invented price or product-page link. If the API later returns that same model URL as a product, the real record takes precedence. No MongoDB record is created.

On public API failure, the existing illustrative fixture is labelled as an offline demo catalog and live product links are suppressed. This fallback branch has not been forced in the browser.

Revision 02 uses an isolated copy of `ProductStage22H2` without editing the shared source: one live R3F Canvas, existing validation/normalization and Admin presentation, original materials/geometry, camera ownership, native wheel scrolling, first-render readiness and retry handling. Known X1R/TTX assets get a three-quarter preview camera only when no Admin presentation or spatial profile exists. Versioned/unknown asset URLs retain the existing camera and image defaults.

Product switching has a cancellable 150ms exit followed by poster/GLB reveal; rapid input cannot commit an obsolete selection. DOM entry motion uses scoped GSAP cleanup, with CSS owning the separate scene wrapper opacity/translation. Reduced motion commits selections immediately and suppresses entry motion/automatic rotation. Thumbnail selection scrolls only its own strip. The original tiny metadata was enlarged and unnecessary watermark/study labels removed.

Expand is a separate command from Inspect. It enlarges the same mounted Canvas and lets the existing camera reframe on resize; it does not create a second scene. It traps keyboard focus, makes the background inert, temporarily locks background scroll, and restores focus/scroll on close. Escape closes expanded view first; another Escape returns Inspect to Overview. Normal Inspect retains the hero bounds.

Thumbnails are images. The first settled complete scene frame can be copied once into a 512px 2D canvas after the R3F renderer finishes; no extra WebGL renderer or animation loop is created. The frame is cached only in page memory and can be saved via "Save preview image". The X1R/TTX files included with this preview were captured this way. Other catalog thumbnails retain their original images until viewed; this release does not generate a full collection offline or upload/save anything to the API. IntersectionObserver suspends rendering offscreen and the scene handles hidden tabs.

The pre-upgrade demo component, stylesheet and logic are backed up under ignored `backups/gallery-demo24-before-upgrade/`. No commit or push has been performed.

Guidance used: local frontend-design, UI/UX, web-design-guidelines, GSAP React/performance/timeline, Three.js/R3F/loaders/materials/performance/interaction and 3DViz. Reading guidance is not an automated skill audit or performance measurement.

## Verification

- `node --test tests/gallery-demo24.test.mjs tests/studio-precision-22h2.test.mjs tests/studio-suspension-uploads-only.test.mjs`: **70/70 passed**, including eleven preview tests and existing camera/filter checks. These pure tests do not certify WebGL performance.
- `npm.cmd run build --workspace frontend`: **passed**.
- `npm.cmd run build --workspace frontend -- --config vite.gallery-demo.config.mjs`: **passed**. The isolated demo bundles Three.js in a large JS chunk (about 1.35 MB before gzip); Vite emits a chunk warning. Its build deliberately does not copy the public GLBs and is not a standalone deployment package.
- Actual browser at **1440 × 900**: X1R and TTX GLBs visibly rendered. Inspect, rotate, zoom, actual surface picking, reset, thumbnail selection and Brakes/Suspension filters exercised. One Canvas observed after product changes. No captured console errors during these interactions.
- Actual browser at **390 × 844**: TTX rendered, Inspect toolbar fit, Escape returned to overview/focus, no page horizontal overflow after correcting the light field. Native scroll preserved.
- Screenshots: ignored `test-results/gallery-demo/desktop-1440.png` and `test-results/gallery-demo/mobile-390.png`.
- **Not measured:** FPS, GPU/memory budgets, physical mobile hardware, OS reduced-motion toggling, forced WebGL/context-loss and API failure. Build and screenshots do not certify these.

Revision 02 actual browser evidence (separate from the earlier baseline): X1R and TTX rendered, their exported PNGs visually inspected, expanded desktop/mobile scenes and zoom exercised, Shift+Tab wrapped from Close to Reset, Escape restored focus to Expand and background overflow to visible. Observed one Canvas and no page overflow at 1440x900 and 390x844. Rapid TTX/X1R selection finished on X1R with the correct catalog price. Fresh final tab captured no console errors. Screenshots are under ignored `test-results/gallery-demo-02/`: `gallery-desktop.png`, `gallery-mobile.png`, `expanded-desktop.png`, `expanded-mobile.png`.

The earlier frontend dev process stopped during testing. The separately launched preview is on port 5174 with the existing API on 5000; no backend process or data was changed. A browser download attempt timed out; the exported PNG link's DOM data URL was read and saved locally instead. No download completion is claimed.

## PC / laptop transfer

No commit or push has been performed. The current branch is `feat/story-shop-ultra-pc-20261026`; use the same branch on both machines. The Git root is the parent `DTH-SHOP`, so first verify `git status` and `git rev-parse --show-toplevel`.

On this machine, review and stage only these new preview paths from the parent Git root:

```powershell
git add -- DTH-3D-Commerce/frontend/studio-gallery-demo.html DTH-3D-Commerce/frontend/vite.gallery-demo.config.mjs DTH-3D-Commerce/frontend/src/experience/galleryDemo24 DTH-3D-Commerce/frontend/public/previews/gallery24 DTH-3D-Commerce/tests/gallery-demo24.test.mjs DTH-3D-Commerce/docs/DTH-STUDIO-GALLERY-DEMO24.md
git diff --cached
git commit -m "Add isolated Studio product gallery demo"
git push origin feat/story-shop-ultra-pc-20261026
```

Check `git diff --cached` for previously staged unrelated files before committing. Do not use `git add .`, reset, clean, forced checkout or force push to handle the other ongoing edits.

On the other machine, first preserve/review its local edits. When its branch is ready for a fast-forward:

```powershell
git pull --ff-only origin feat/story-shop-ultra-pc-20261026
```

Run the existing frontend/backend development commands, then open the demo URL. This preview adds no dependencies. Keep each machine's `.env` local. Missing GLBs require a separate deliberate asset transfer; Git/catalog sync does not invent or migrate MongoDB records. Atlas migration remains unapproved and has not run.
