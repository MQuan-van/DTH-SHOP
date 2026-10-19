# DTH — Step 17.4A / Shop Discovery

## Routes
- `/shop`: original fast catalog (kept deliberately for existing links and browser regressions).
- `/shop?mode=explore`: rider photography, showroom spotlight, category navigation, journal.
- `/shop?mode=build`: NVX context, compatible parts, 3D spotlight, page-local build shortlist.
- `/shop?mode=shop&layout=wide` or `layout=compact`: alternate catalog layouts.

Only one import in `frontend/src/shop/StoreApp.jsx` changes. The existing ShopPage, search, filters,
Quick View, ProductMedia, startup gate, API, cart and checkout are reused. No dependency or database migration.
The wrapper does not modify Login/Story/Home/Garage/loader code.

## Build rules
- Selection updates the active shopping vehicle; it does not write the account default or old cart lines.
- Vehicle IDs come from the current catalog. V1/V2/V3 never acquire a fabricated compatibility mapping.
- Purchase uses the existing `purchaseState`, `validatePurchase` and `store.add` boundaries.
- Checkout still performs server validation through the existing flow.
- `Keep in this build` keeps one product per category (maximum five) while this Shop page stays mounted.
  Pinning another part in the same category replaces the earlier one. This is not an order or a saved Garage build.
- Switching vehicle/account clears the page-local shortlist. Navigation away or refresh also clears it.
- Estimate is the displayed catalog price of one of each pinned part, not a stock check or final server quote.
- To purchase multiple parts, inspect/add each separately. There is no bulk-order shortcut.

## Photos
Eight owner-supplied images are preserved as content (resize/orientation/WebP conversion only).
Sixteen responsive files total approximately 2.48 MB. Most are lazy-loaded.
Sources and checksums: `frontend/public/discovery174/provenance.json`.
Only `v1.jpg` and `NVX V2 xám titan.png` identify a version in the supplied filename.
There is no confirmed V3 photo: Build displays a plainly labelled placeholder, not a different bike.
Photos are not evidence that a catalog part is installed. Existing 3D assets remain illustrative parts.
No generated scooter, extracted third-party model, external hotlinked image or video is installed.

## Performance
Desktop showroom mounts one ProductMedia only when visible, after startup has released and a 520ms quiet period.
Mobile, data saver and reduced motion require explicit `View in 3D`.
After explicit data-saver opt-in, only that selected product is allowed to load.
ProductMedia retains its own GLB failure/retry/view controls, rendering policy and activity gate.
Mode changes unmount the earlier mode. Grid and thumbnails never get individual canvases.
New DOM animation uses finite transform/opacity effects and bounded pointer parallax with cleanup.
This is not a guarantee of any measured FPS on an untested computer.

## PC / CMD
```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
node "C:\DTH-ShopDiscovery-Step17_4A\install.mjs" --project "." --check
```
After CHECK OK and a safe checkpoint:
```bat
node "C:\DTH-ShopDiscovery-Step17_4A\install.mjs" --project "." --apply
node --test "tests\discovery174.test.mjs"
npm run check
npm test
npm run build
```
Run each separately; stop at the first failure. No seed or NVX migration for this update.
Use two terminals for `npm run dev:api` and `npm run dev`; keep the existing MongoDB instance running.
Do not start a second mongod or switch database directories.

## Optional actual browser check
Requires Playwright Python + Chromium in your development environment, not a new production dependency:
```bat
python tests\browser\discovery174.py --url http://127.0.0.1:5173 --require-webgl
```
A fresh browser context is used. No orders or account edits are performed.
The `--require-webgl` option fails if the real ProductMedia does not reach ready; without it, fallback is allowed.

## Undo
Stop Vite, keep source unchanged since installation, then:
```bat
node "C:\DTH-ShopDiscovery-Step17_4A\install.mjs" --project "." --undo-latest
```
Backup is in the repository's real Git directory under `dth-discovery174-backups`.
Undo verifies every installed file before touching any file. Modified files require manual review.
No database state is restored or deleted. Empty newly created folders may remain.

## Checkpoint
Once tests, build and manual Shop/Build/3D checks pass, inspect staged files (no .env/secrets):
```bat
git status
git diff --check
git add .
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add explore shop and NVX build discovery modes"
git push origin feat/shop-discovery
```
Sync source on the laptop using the existing branch, not a second clone. MongoDB is separate on each machine.
