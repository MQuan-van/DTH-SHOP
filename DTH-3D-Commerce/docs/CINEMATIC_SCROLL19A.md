# Step 19A — Cinematic scroll

Source baseline: MQuan-van/DTH-SHOP, feat/shop-discovery, 38098aa26c5f45b1d223ca50d926ee7308cd262d (2026-10-19).

Home uses a single native-scroll GSAP driver feeding the existing camera director. `useChapterTransition` imports the new compatible hook; its timed copy entrance is reserved for manual mode. Continuous copy opacity/translation comes from scroll progress and chapter midpoints. Existing Home turntable, camera frames, OrbitControls, product rig, loader and fallback are retained.

Motion is lifted to Home so the same pause also governs collection reveals. Data Saver, reduced motion and compact policy avoid the long scroll-linked Home. No wheel capture, forced snap, smooth-scroll engine, dependency changes or extra canvas.

Product gets scoped disclosure/recommendation reveals and media-column sticky layout when it fits. It does not acquire scroll-controlled camera poses. The existing purchase workflow and renderer remain unchanged.

Files modified: Home JSX; Home presentation config; chapter transition import/copy-mode guard; Product JSX; cinematic unit test import; cinematic browser regression assertions. New files: scroll19 module, pure tests, browser supplement and this note.

Validation on user checkout:

    node --test tests/scroll19.test.mjs
    npm run check
    npm test
    npm run test:cinematic
    npm run build

Browser: use existing Flow build + Playwright workflow; `python tests/browser/cinematic_home.py`. No new auth bypass. The existing assertions for no-scroll chapters are updated to native-scroll geometry; Inspect, fallback/retry, compact and reduced-motion coverage is retained.

Generated-package QA is NOT a full application build or real WebGL browser pass. No migration, seed, API route, environment file, repository merge or deployment is included.
