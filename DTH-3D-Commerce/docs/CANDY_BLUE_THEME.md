# Candy Blue + Pearl White

## Scope
UI colour update for DTH-3D-Commerce, based on MQuan-van/DTH-SHOP at commit
8b2bf6b512702b60266b9e0d1966511303151447 (feature/3d-store).

Only stylesheet changes, one browser theme-colour meta tag, tests and this document.
No changes to HeroScene.jsx, HeroSection.jsx, home.config.mjs, Viewer3D.jsx,
React state, GLB/PNG files, product data, environment files, dependencies or lockfiles.
Existing ring geometry, keyframes, layout, responsive breakpoints and pause rules are retained.
This update does not reintroduce Inspect controls if they were removed locally.
It also does not fix any existing GLB loading/WebGL error in an older branch.

## Palette
- Candy blue: #0066E6
- Deep blue / hover: #003A8C
- Highlight / decoration: #53ABFF
- Pearl white: #F5F8FC
- Surface white: #FFFFFF
- Text navy: #0F1C2E
- Secondary text: #516174
- Success/warning/error retain separate semantic colours.

Global tokens and storefront overrides: frontend/src/theme/candy-blue.css.
Loaded by the first @import in frontend/src/index.css.
Home module colour overrides are appended, not substituted for layout rules.
The original --lime/--white/--ink variable names remain as compatibility aliases.

## Apply on the user's computer
Commit or safely back up current local changes first. Keep the current working branch;
do not switch to an older remote snapshot merely to obtain the theme.

From DTH-3D-Commerce:

```powershell
git status
git fetch origin
git cherry-pick origin/style/candy-blue-pearl
node --test tests/candy-theme.test.mjs
npm run build
npm run dev
```

The theme branch has one theme-only commit. Use the commit SHA shown in the PR
instead of the branch name if that branch later receives additional commits.
If cherry-pick reports a conflict, stop and inspect the CSS conflict; do not force,
reset --hard, or replace JavaScript files. Use git cherry-pick --abort to cancel
an unfinished cherry-pick. Do not apply both the Git commit and the copy package.

Alternatively, copy the package's frontend and tests folders into the existing
DTH-3D-Commerce root, merging directories after backing up the original CSS files.
Never delete the existing frontend directory. No npm install or external installer
script is required. Hard refresh the browser after saving.

## Important visual detail
Catalog PNG thumbnails already contain a dark photographic background. Their pixels
are intentionally unchanged. They remain dark image panels inside the light store.
The Hero preview PNG has transparency, so its surrounding stage becomes pearl white.
Product material colours and inline finish swatches are not recoloured blue.

## Validation performed
- 12 Node theme checks passed: palette, CSS entry import, contrast of core opaque
  text/background pairs, control outlines, no animation/transform override, ring rules.
- 61 existing dependency-free baseline Node tests passed in the local source fixture.
- Chromium CSS-only fixtures: Home at 320/390/768/1440/1920 px; Shop, product detail,
  bag and account at 390/1440 px. No document horizontal overflow in these fixtures.
- CSS ring movement, its paused state and prefers-reduced-motion were checked.
- The sample lime material swatch retained rgb(215, 245, 92).
- The large theme and Hero blobs uploaded to GitHub were hash-matched to tested files.

These were NOT full React end-to-end tests. Static HTML used the same CSS and PNG
stand-ins. Vite build could not run in the authoring environment because Vite was
not installed and npm registry DNS was unavailable. Re-run build and check actual
React/WebGL, route navigation, keyboard focus, vehicle modal and cart on your machine.
The theme is not a WCAG certificate. Existing small typography remains unchanged.

References used for colour checks:
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme
