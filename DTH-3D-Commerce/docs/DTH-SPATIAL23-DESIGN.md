# DTH Spatial Commerce 23.1 — implementation record

## Baseline and scope
Reference: MQuan-van/DTH-SHOP, feat/story-shop-ultra-pc-20261026, commit
2d3bfa022e2e5a1a1fa34925d7dd49c72db63552. This is a source upgrade candidate,
not a claim that it was installed or visually approved on the user's PC.

The payload adds an isolated `frontend/src/experience/commerce23` module and
changes six integration targets. Existing implementations remain for rollback.
No package versions, .env, API, database, GLB bytes, source materials or cart
contracts are changed. Classic Studio/Account paths remain in their original wrappers.

## Visual decisions implemented
- Integrated full-width header, not the previous floating white rounded plate.
  Dark and light surface variants share geometry and font. Build receives a real
  primary navigation entry at the existing `/shop?mode=build` URL.
- Navy/slate #0a1c27 / #132f40, pearl #edf4f6, ink #17364a, action blue #2563eb,
  ice accent #9ed8ee. Existing Manrope `--one-font` is reused; no font binary is included.
- Larger Studio product stage; information and controls use a consistent scale.
  Repeated giant category lettering is removed. The lower invitation uses the
  existing lineup photo; original photos are not rewritten or AI-altered.
- Shop keeps its real filtering, price, pagination and scroll/camera implementation.
  The redundant mode/brand bar is replaced; visible view labels are Showcase and
  Catalog while existing query values remain `story` and `grid`.
- Explore becomes a compatibility redirect: filter-bearing Explore URLs go to
  Shop with their query preserved; pure editorial Explore goes to Story.
- Story keeps real photos, intro visit behavior and the existing scroll director.
  Full-bleed opening, restrained chapter navigation and a Build call to action are added.
- Account retains its real member handlers and Garage revision/identity guards.
  A horizontal account rail, larger NVX stage, stronger light field and a compact
  context column replace the side-heavy layout. Preview/default/shopping remain distinct.

## Build contract
The existing DiscoveryPage continues to own the shortlist, filters and selected
shopping vehicle. The new presentation receives exactly those callbacks.

`Vehicle -> choose system -> matching products -> individual part study -> shortlist`

The shortlist is page-local. It is NOT saved to an account and is NOT the cart.
Totals are catalogue estimates for one each; API checkout remains authoritative.
The new page does not reserve stock, take payment, or certify physical fitment.

Vehicle and part-study canvases are not rendered together. Returning from part
study may reparse the vehicle to conserve memory. No instant restoration claim.
Previewing the default V3 is labeled as a preview until the user chooses it.
Missing V1 is explicit and never replaced with V3 geometry.

## Honest hotspot authoring
No semantic anchor coordinates ship in this package. The actual LFS model bytes
could not be read in the build environment. The local editor marks visible model
triangles and exports a JSON profile bound to vehicle ID, URL, SHA-256, authored
orientation and normalization version. See DTH-SPATIAL23-FOCUS.md.

Until a profile exists, category buttons and matching parts work, but the page
stays in a full-vehicle view for that category. It does not pretend a generic zoom
is a calibrated suspension view. Invalid/stale profiles are rejected.

Once authored, projected labels and lines follow the model. Occlusion is checked
at a limited rate, with hidden/behind-model anchors omitted. The profile author
must inspect labels and camera paths on the actual GLB at several viewport sizes.

## Camera and render ownership
- One standalone Three renderer for the new Build stage, consistent with the
  existing NVX engine. It is not mounted inside a second R3F renderer.
- Full-view framing uses actual model bounds and a complete yaw sweep. This is
  numerically tested; final visual framing still requires actual GLBs.
- Automatic rotation, scripted focus and manual orbit have mutually exclusive
  camera authority. Wheel events do not zoom the vehicle; native scroll is preserved.
- Explicit zoom/rotation controls, Reset, Escape, resize, context-loss/retry,
  late fetch guards, offscreen/hidden tab suspension and resource disposal exist.
- Moving render frames are requested while movement is needed; merely enabling
  manual orbit does not create a permanent animation loop.
- High-quality originals are retained. DPR is bounded; geometry is not remeshed.
- Diagnostics report renderer counters and CPU submission time. Those values are
  NOT GPU time, FPS, VRAM bytes or a physical compatibility result.

## Not shipped
Physical part replacement, automatic semantic recognition, cloud-saved build
configurations, an Ultra fluid shader, and cross-route shared WebGL ownership are
not implemented. They require verified asset preparation / API work / benchmarks.
This release does not rewrite Admin, checkout or product-detail business logic.

## Acceptance on the user's machine
1. CHECK/INSTALL/VERIFY must pass without forced overwrite.
2. Open Studio, Story, Shop Showcase, Shop Catalog, Build and Account at 100% zoom.
3. Verify header active state, Back/Forward, modified clicks, cart and vehicle picker.
4. Select NVX V2/V3, test loaded/missing/error states, rotate, zoom, resize and Reset.
5. Author real focus points and test actual line/label projection and occlusion.
6. Choose matching product, inspect it, return, shortlist/remove, change vehicle.
7. Exercise account tabs, default versus shopping selection and sign-out cleanup.
8. Measure actual frame time and memory across repeated model changes.
9. Test 320/390/768/1024/1440/1920/2560 CSS widths, reduced motion, keyboard,
   dialogs/support overlays and browser zoom. A static screenshot is not this test.
