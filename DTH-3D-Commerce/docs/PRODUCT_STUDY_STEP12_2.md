# Product Study — Step 12.2

This feature changes presentation only. It does not establish mechanical dimensions, fitment, spring rate, material composition, product safety or installation procedure.

## Modes
- Explore keeps the original PBR maps and normal camera tools.
- Surface adds a finite cyan sweep and a neutral directional-light adjustment; lighting changes the rendered appearance, not the stored material maps.
- Technical performs a 3.6-second top-to-bottom reveal into a shaded wireframe study. Wireframe uses duplicate, private triangle geometry with barycentric antialiasing. The source geometry is not altered. The slider is a display position, not load progress. Replay starts one scan; scans never queue or loop indefinitely.
- Hotspots are authored annotations. The first built-in profile has three annotations for the original demo Apex suspension model. Same-origin filename AND the SHA-256 of positions, indices, hierarchy transforms and mesh names must match. Modified or substituted geometry cannot inherit this profile.

A single spherical controller owns orbit, focus target and zoom. A bounded look-at target keeps the camera outside the normalized model sphere throughout camera transitions. The three named demo points use ray intersections on the supplied demo mesh, not guesses generated from the product name. Stage pins are projected in 3D and occluded using raycasts; the accessible list remains available even when a point is hidden behind the surface.

## Optional effect support
Only static, opaque, ordinary MeshStandardMaterial/MeshPhysicalMaterial meshes are patched. Skinned/instanced/morph geometry, custom shader hooks, alpha materials or transmission use the ordinary viewer. Mesh count, vertex count and triangle count are bounded in `advanced/study.logic.mjs` (120,000 triangles, 240,000 vertices, 80 meshes). These are feature allocation limits, not performance guarantees. Optional shader compilation failure restores ordinary materials and disables Surface/Technical rather than discarding commerce UI.

Original geometry and texture maps are borrowed, not disposed by the effects layer. Private materials and wire geometry are removed and disposed once. The existing owned model loader continues to own the source GLB and its resources.

## Motion and interaction
- Scroll/wheel never zooms the camera.
- Dragging requires Inspect; touch scrolling is restored by Done inspecting.
- Modes stop autorotation but preserve the view. Auto rotate is enabled only in Explore.
- Reset returns Explore, clears hotspot selection/light adjustment and stops autorotation.
- Hidden tab, offscreen media, open dialog/Support or loader `inert` pauses rendering. Activity is reconciled from current bounds on scroll/resize, not only a cached IntersectionObserver flag.
- Motion off completes a pending scan, disables Replay, and permits static manual scan positioning.
- No fitment data, price, stock, cart state, checkout or backend code is changed.

## Future real assets
Do not declare AI-generated reconstruction a measurement-accurate scan. Real assets require their own provenance, orientation and authored annotation profile. Do not reuse Apex coordinates on another model. The full database/API asset-management contract is a later milestone; this patch does not implement an Admin upload or profile editor.

## Verification scope
See the accompanying checks archive. Unit tests, offline UI with an explicitly substituted renderer and native OpenGL shader compilation are different tests. Only the included CI browser test requires actual WebGL rendering. It must be run on the developer machine or GitHub runner before merge. Do not treat a poster screenshot as a WebGL result.
