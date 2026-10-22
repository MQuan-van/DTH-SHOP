# NVX Build 3D — integration notes

## Scope and verified integration target

Repository inspected: `MQuan-van/DTH-SHOP`, `feat/shop-discovery`, commit
`38098aa26c5f45b1d223ca50d926ee7308cd262d`.
The application is inside `DTH-3D-Commerce` in that repository.

The existing `frontend/src/shop/discovery174/BuildExperience.jsx` renders the
“Choose your next detail.” heading, NVX selector and “Start with your NVX.”
The installer changes only its selector block and adds one import. Other
content and all existing handlers are preserved.

`DiscoveryPage.jsx` still owns `onVehicle`: validation, StoreProvider selection,
query/fitment changes and existing build-list behavior remain in that handler.
The initial V3 preview does NOT silently select the shopping vehicle. Clicking
V3 or using the version navigation calls the existing `onVehicle` handler.
Changing vehicle continues to clear the temporary build list as before.

## Files

- `frontend/src/shop/discovery174/nvx3d/NVXBuildStudio.jsx`: selector, inspection controls and separate swipe strip.
- `frontend/src/shop/discovery174/nvx3d/NVXStage.jsx`: React lifecycle, lazy import, visibility/startup gating and error UI.
- `frontend/src/shop/discovery174/nvx3d/createNVXStage.mjs`: one persistent Three.js renderer, loading, camera, model transitions and cleanup.
- `frontend/src/shop/discovery174/nvx3d/nvx3d.config.mjs`: paths, orientation, limits and presentation settings.
- `frontend/src/shop/discovery174/nvx3d/nvx3d.logic.mjs`: pure testable math and GLB header validation.
- `frontend/src/shop/discovery174/nvx3d/nvx3d.css`: Build-only presentation.
- `tests/nvx-build-3d.test.mjs`: Node unit and source-contract tests, not browser/WebGL tests.

## Model and controls

Place the real V3 asset at `frontend/public/models/nvx/nvx-v3.glb`.
The ZIP does not contain the owner's GLB. No model identity or asset quality
was inferred from the screenshot.

The camera fits normalized bounding geometry; no model-specific scale like
`scale={1.8}` is assumed. Rotation correction can be configured per model in
`nvx3d.config.mjs`: radians in `[X, Y, Z]` order. Keep Y up for ordinary exports.
The asset's authored materials and textures are preserved. Embedded animation
clips are not played automatically; this feature animates the whole vehicle
for navigation, rather than spinning wheels or opening arbitrary GLB parts.

Drag the canvas to orbit, wheel/pinch to zoom, and right-drag or two-finger move
to pan. Buttons provide left/right rotation, zoom and reset. Reset pauses local
auto rotation. The original page's Pause motion button and reduced-motion
preference suppress automatic motion; manual inspection remains usable.

Swipe on the dedicated strip BELOW the inspection toolbar, not on the canvas.
The strip also supports left/right arrow keys and adjacent accessible buttons.
This deliberately prevents the same pointer drag from both rotating a vehicle
and switching its version.

V1/V2 have `file: null` until their real assets exist. They show an explicit
placeholder; the normal parts-selection flow still works. Adding their correct
model paths activates the same 3D loading and slide/turn transitions.

## Rendering and resources

This component uses the existing `three` dependency directly. It does not add
Framer Motion, replace the product viewer or alter package/lock files. The
Build stage keeps one renderer across version changes. It is independent from
any product viewer rendered elsewhere on the page; the whole page may still
have more than one WebGL context.

The stage defers startup until the existing loader gate allows it and its frame
is near the viewport. Rendering stops offscreen/in a hidden tab and settles
when automatic motion is paused. The quality cap is 1.5 device pixels per CSS
pixel on desktop and 1 on the compact/save-data policy.

The lighting environment is generated from Three.js RoomEnvironment. No remote
HDR is required. The floor effect is a procedural soft contact shadow, not a
physical dynamic shadow or reflection simulation.

GLTFLoader is configured for Draco, Meshopt and KTX2. The installer copies Draco
and Basis transcoder files from the project's own installed Three.js package
to `frontend/public/decoders/nvx3d`; it also copies Three.js LICENSE. These binary
files are not included in this downloadable source package.

A fetch size guard is set to 128 MiB and the main GLB fetch timeout to 90 seconds.
These are safety settings, not performance targets. Decoding and texture upload
can still take time after the fetch finishes. A dense vehicle with large
textures may require optimization on the owner's hardware.

Error UI covers missing/invalid GLBs, loader errors, missing texture resources,
and WebGL context loss. Geometry, materials, textures, observers, controls and
renderer resources are cleaned up when replaced or unmounted. Late/stale loads
cannot become the currently selected vehicle.

## Installation and local validation

Run the standalone installer from the application root:

```bat
node "C:\DTH-NVX3D-Build.mjs" --project "." --check
node "C:\DTH-NVX3D-Build.mjs" --project "." --apply
node --test tests/nvx-build-3d.test.mjs
npm run build --workspace frontend
npm run dev --workspace frontend
```

To import a GLB from another location, supply `--model "C:\path\actual-file.glb"`
to BOTH check and apply. The source file is not moved or deleted. The installer
will not overwrite a different existing V3 model. A self-contained GLB is
required for this copy option; export embedded resources or copy referenced
resources manually when your GLB uses external files.

A missing GLB at the default location is a warning, not a reason to block code
installation. The 3D frame will show a helpful error until the real asset exists.
Missing Three.js dependencies are a blocking check because local decoders cannot
be prepared without them. Run the project's normal `npm install`, then retry.

Open the existing Shop parts > Build interface, or `/shop?mode=build` on the
running frontend origin. Test V3 load, orbit, pan, wheel/pinch and Reset, then
V3→V2→V1→V3 with clicks, arrows and the swipe strip. Inspect the shared selected
vehicle and matching parts. Verify that a canvas drag never changes version.
Also test rapid navigation, reload, return from another route, a narrow viewport,
Pause motion, OS reduced motion, a missing GLB and an inactive browser tab.

## Backup and conflict behavior

The default installer mode is `--check`; it makes no changes. Apply validates
ALL planned changes first. Existing unrelated changes are retained. It refuses
ambiguous/different selector code or overwriting a locally edited new module.
It never resets Git, commits, pushes, seeds MongoDB or modifies account data.

Backups are stored outside the repository in your home directory under
`DTH-NVX3D-Backups`. The apply output prints an exact undo command. Undo refuses
to overwrite edits made after installation. Keep the backup until validation
is complete.

## What was and was not verified

The supplied unit/source-contract tests and installer fixture checks are
reported separately in TEST_REPORT.md in the package. JSX syntax is checked
with the available TypeScript parser. This is not a claim that the full site
passed a production build or a browser test. The owner's actual NVX V3 GLB and
complete working checkout were not available in the execution container.

## Primary implementation references

- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Three.js OrbitControls: https://threejs.org/docs/pages/OrbitControls.html
- Vite public assets: https://vite.dev/guide/assets.html

Repository source was read with the connected GitHub tool, not guessed from a
screenshot. Apply is still guarded because a local checkout can differ from
that inspected GitHub commit.
