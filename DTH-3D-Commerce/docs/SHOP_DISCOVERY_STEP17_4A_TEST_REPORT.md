# Step 17.4A — Verification report

## Scope and baseline
Repository read: MQuan-van/DTH-SHOP, branch feat/shop-discovery.
Reference commit: 91f1fcece076bbd7a5a3cac29e525fadde45c5e9.
Current remote ShopPage includes Shop UX17, and ProductMedia includes deferred graphics startup.
Local Cinematic17.3A changes are allowed: installer replaces one exact ShopPage import only.
It does not replace the StoreApp file, any route definitions, the loader, account, backend or database.

## Executed checks
- 72 Node tests passed: discovery query state, legacy deep links, layout/spotlight handling, NVX selection,
  filtered/empty/stale results, quantity boundaries, page-local shortlist isolation, finite motion cleanup,
  source-level integration assertions, and 16 actual WebP assets with provenance metadata.
  Source assertions do not execute the full application or prove an API transaction.
- 16 installer tests passed: read-only check, one original file changed, local edits preserved,
  idempotence, exact undo, edited-file undo refusal, new-file conflict, missing prerequisite,
  ambiguous import, CRLF, Unicode/spaced paths, wrong app/branch, symlink rejection, invalid arguments.
- 60 isolated browser assertions passed using Chromium 144.0.7559.96 and React 18.2.0:
  modes, photography, selected product, bounded media mounting, category/vehicle changes,
  one-category shortlist, double-click guard, rejected add feedback, account/vehicle isolation,
  URL-state round trips, all three catalog layouts, reduced motion and explicit mobile 3D opt-in.
  Explore and Build checked at 1920/1440/1024/768/390/360/320 pixels. Catalog layouts checked at
  1440/768/390/320 pixels. No page-level horizontal overflow or uncaught page errors in this harness.
- 12 new production JS/JSX/MJS/CSS files parsed successfully using TypeScript's parser and PostCSS.
- Installer syntax passed `node --check`. Final ZIP structure and CRC integrity checked during packaging.

## Boundaries of those results — important
The isolated browser executes the NEW React components, but substitutes React Router, StoreProvider,
existing catalog, existing product validation boundary and ProductMedia/WebGL with test adapters.
Its 3D area is explicitly labelled “ISOLATED UI PREVIEW · 3D SUBSTITUTE”. Product pictures there
come from the supplied Shop screenshot and are not installed into the real app.
Only the eight supplied vehicle photographs are packaged as new production imagery.

The container could not clone/install the full repository dependencies because network access was unavailable.
No full React 19.2 / Vite build, actual MongoDB request, live login, real GLB render, GPU profile or FPS
measurement has been executed here. A screenshot of the isolated layout is NOT proof of real 3D rendering.
Windows path spacing/Unicode was exercised through Node arguments, but not on a native Windows machine.

## Required verification on the user's current app
Run from DTH-3D-Commerce, one command at a time, stopping on any failure:

```bat
node --test "tests\discovery174.test.mjs"
npm run check
npm test
npm run build
```

Keep the real MongoDB instance and API configuration unchanged. Open:
- `/shop` (original catalog)
- `/shop?mode=explore`
- `/shop?mode=build`

Verify V1/V2/V3, filter retention, Quick View, product return link, real 3D rotate/zoom/reset,
mobile scrolling, paused/reduced motion, quantity limits, adding to bag, and unchanged old cart lines.
No server order should be created just to test presentation.

Optional actual browser smoke test (supplied but not executed against a real app in this report):
```bat
python tests\browser\discovery174.py --url http://127.0.0.1:5173 --require-webgl
```
`--require-webgl` demands a real ready media state; without it the script permits image fallback.

## Not implemented / not claimed
- No complete 3D scooter or physical parts installation simulation.
- No V3 photo invented from an unidentified community bike.
- No confirmed real-world compatibility, inventory assertion, automatic package sale or bulk add-to-cart.
- The shortlist is page-local, not an account-saved build or a comparison engine.
- Existing catalog remains the default `/shop`; Explore and Build use explicit mode URLs.
- No guaranteed 60/120/200 FPS claim. Measure on the real laptop/PC before expanding effects.

Primary implementation references reviewed:
https://react.dev/reference/react/useEffect
https://reactrouter.com/7.9.4/api/hooks/useSearchParams
https://r3f.docs.pmnd.rs/advanced/scaling-performance
These documents explain lifecycle/URL/rendering principles; they do not certify this implementation.
