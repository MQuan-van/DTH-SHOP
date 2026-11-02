# Skill application — 23.3

Baseline inspected: attached Step23 Spatial Commerce ZIP and GitHub commit
2d3bfa022e2e5a1a1fa34925d7dd49c72db63552. User confirms 23.2 stable;
the 23.2 installer/source is not mounted and not present in that remote commit.
Only a checksum-recognized VehicleStage23 export is replaced. Business owners stay intact.

Guidance read this task:
- .agents/skills/frontend-design/SKILL.md: deliberate hierarchy, sparse functional copy,
  meaningful controls instead of cosmetic labels. Scoped h233 CSS; 44px target minimum.
- .agents/skills/threejs-interaction/SKILL.md: canvas-relative picking, real surface ray hits,
  drag/tap distinction, camera ownership. Examples target r186; implementation avoids
  r186-only Timer/API and uses the existing r184-compatible imports.
- .agents/skills/gsap-react/SKILL.md: scoped gsap.context with revert on cleanup.
  No @gsap/react install, no unscoped selectors, no new camera animation library.
- Existing context includes 3dviz-pro-max / performance guidance: preserve original
  GLBs/materials, separate semantic authoring from numerical validation, measure cost.

Official API references checked:
https://threejs.org/docs/pages/Raycaster.html
https://threejs.org/docs/pages/OrbitControls
https://threejs.org/docs/pages/Vector3.html
https://gsap.com/docs/v3/GSAP/gsap.context()/

No UI UX Pro Max Python search, Impeccable command, Hallmark audit, or full 35-skill
execution is claimed. No dependency upgrade, remeshing, material replacement or WebGPU migration.

Validation labels:
- Pure-function tests: schema, camera planning, label placement, pointer gating, cache rules.
- Installer/publisher tests: isolated fixtures, checksums, no overwrite, backups/rollback.
- Browser layout checks (where reported): CSS/DOM fixture, not the real React app or NVX GLB.
- No real NVX render/FPS claim without actual asset/browser evidence.
