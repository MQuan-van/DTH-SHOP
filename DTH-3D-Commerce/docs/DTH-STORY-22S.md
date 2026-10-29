# DTH Story Reborn 22S.1

## Scope
A replacement default `/story` experience, not a rewrite of the shop, admin or backend.
The original StoryPage implementation is retained as a named legacy export. The new
route reads the same `useStore` catalog and preserves `visitStory(MODE, user.id)`.

## Visual direction
- Photography is the opening hero, not a fabricated model of the user's bike.
- Existing `lineup` and `crew` WebP photos remain at their original URLs and are never overwritten.
- Cropping, contrast, saturation and overlays live only in Story CSS. No AI reconstruction,
  fake depth map, permanent recolouring, wheel replacement or generative image edit.
- White / deep navy / candy-blue. One type family with local fallbacks; no bundled font files.
- Five narrative beats: The ride, The crew, The form, The detail, Your next.
- Form and detail share a single canvas and an authored camera path. This is a visual study,
  not a mechanical simulation, fitment certification, explosion or cutaway.
- No directional arrow glyphs in new Story buttons or links. Necessary shell navigation
  and support controls outside Story are not modified.
- No prices or speculative engineering claims in the narrative. Actual product name/finish
  and a normal product link come from the current catalog.

## Motion architecture
`gsap.context` scopes DOM effects, with local cleanup and no global killAll. Native page scroll
owns a single study director. The Three.js camera reads this director in `useFrame`; GSAP never
writes to the camera or starts a second render loop. No React setState per animation frame.

Desktop uses a CSS sticky stage with one ScrollTrigger and explicit start/end holds. Small or
short/touch viewports use natural-flow sections. Typography and photos move only on scroll.
Pause/reduced-motion keep navigation working while removing spatial motion. Route exits remove
observers, listeners, subscriptions, timeouts and scoped GSAP objects. The existing modal/support
gate blocks camera updates. The route never intercepts wheel or touch events.

## 3D data and ownership
The new scene calls the EXISTING `useProfiledModel` and `useProduct3DProfile` rather than the old
Story's 16 MiB loader. Its limits, external-resource restrictions and preflight checks remain
in place. Do not disable them. Saved `presentation3d` settings are applied through the existing
presentation math. No source mesh/material/texture properties are rewritten. The loader owns
its parsed GLB; the new scene owns only its environment render target.

Desktop DPR is capped at 2; compact DPR at 1.35. This changes raster resolution, not mesh detail.
No automatic remeshing, lossy compression, WebGPU migration or dependency upgrade occurs.
The first visible render marks the model ready. Product information and navigation remain usable
when the model fails. No normal photo is silently presented as live 3D.

## Skills used and future changes
Relevant guidance was read from frontend-design, gsap-react, 3dviz-pro-max, Three.js/R3F material,
camera and performance guidance, plus the official GSAP context and R3F on-demand-rendering docs.
The project previously installed additional UI/UX skills; their presence alone is NOT evidence of
running their tools or audits. Use only relevant skills for each future task. Library versions in
local `package-lock.json` outrank examples targeting a newer release.

## Validation boundaries
See the package TEST-REPORT.md for what actually ran. Syntax, pure logic, packaging and static
layout checks do not prove the full application's GLB rendering or user approval of photography.
Run the included local tests and build, then inspect `/story` in the real application.
