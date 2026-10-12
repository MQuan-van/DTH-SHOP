# Step 18.1 — DTH Login & Entry

## Scope
A dedicated access boundary and a full-screen branded sign-in experience. The white DTH mark was traced from the user-supplied `nxv cùa a hải.png` artwork and extruded into geometry. The additional coil, nut and disc are abstract decorative props, not products for sale.

No backend, database, deposit, email/Messenger integration, Admin CRUD, account/profile storage or loader animation is changed by this package.

## Routing contract
- Guest opens `/`: the existing startup loader remains; the new sign-in scene is underneath it. WebGL waits for the existing startup-release policy.
- Verified customer sign-in from `/`, `/login` or plain `/account`: `/shop`.
- Verified administrator sign-in without a specific return destination: `/admin`.
- A valid direct intent (`/checkout`, `/bag`, `/products/...`, `/shop?...`, a specific Account view, or a permitted Admin route) is retained.
- Already signed-in visitors to `/` see the existing Studio/Home. They are not logged out or asked for their password again.
- Story is optional. Existing Story links/content remain; Step17.3A no longer automatically redirects the Home entry into Story.
- Unknown URLs retain the existing route/404 behavior.
- UI gating does not replace API authorization. Existing backend sessions, role checks and CSRF protection remain unchanged.
- Preview entry explains API setup. Read-only preview browsing is explicit. Flow mode is labelled rehearsal and uses the existing fixture-auth adapter. API errors NEVER switch mode.

## Why a new boundary
The old storefront Shell renders its catalog loading/error view before the route Outlet. Sign-in inside that Outlet could therefore disappear when catalog readiness fails. The new boundary is INSIDE StoreProvider and OUTSIDE the storefront route Shell. The Login form is no longer blocked by a product-catalog error; API/session failures are still reported and must be resolved.

## Visual behavior
- One native WebGL2 canvas for the extruded logo, with a local lighting shader and pointer response. It is not a video or an image pretending to be a rotating model.
- Atmospheric background uses restrained opacity/transform motion, a projected grid and pointer offset. It does not add full-screen WebGL postprocessing.
- Input focus sends a phase (`identify` / `secure`) only. Credentials, their lengths and email contents are never inputs to the scene.
- Input focus, Pause, hidden tabs and offscreen stages stop continuous rendering. A static frame may update when a phase/size changes.
- Mobile, reduced motion and data-saver require a deliberate `View in 3D` click. Reduced motion remains still after opting in.
- Renderer failure never disables sign-in. Retry mounts a new canvas. No `forceContextLoss` is called during StrictMode cleanup.

## Install on the PC (CMD)
Extract the ZIP into `C:\`. It contains its own `DTH-LoginEntry-Step18_1` directory.

```bat
cd /d "C:\Của Quân\GRE\Final-Project_GRE\DTH-3D-Commerce"
git status
node "C:\DTH-LoginEntry-Step18_1\install.mjs" --project "." --check
```
Only after CHECK OK:

```bat
node "C:\DTH-LoginEntry-Step18_1\install.mjs" --project "." --apply
node --test "tests\login181.test.mjs"
npm run check && npm test && npm run build
```
No npm install/seed/migration is needed solely for this patch. Stop Vite while installing. Keep MongoDB and the existing API running as usual.

## Environment
Do not replace or commit private .env files. Confirm these two settings in the correct app's `frontend/.env.local` and restart Vite if changed:

```dotenv
VITE_STORE_MODE=api
VITE_SHOP_API_URL=/api/shop
```
Backend and frontend remain two separate terminals at the app root:

```bat
npm run dev:api
```

```bat
npm run dev
```
Open `http://127.0.0.1:5173/` in a fresh InPrivate window for a signed-out test. `/login` is also intercepted by the new boundary. The existing session is deliberately preserved in a normal tab.

## Validation on the real site
Verify customer and Admin sign-in, invalid credentials, registration/confirmation, current account/garage views, direct checkout returns, logout/session expiry, preview-vs-API messages, Pause, mobile/reduced-motion fallback and Retry 3D. Check Shop/Product/Cart/Admin remain functional. Production build must exit 0; Vite's `built` line followed by a libuv crash is not a PASS.

## Undo
At the same app root, after stopping Vite:

```bat
node "C:\DTH-LoginEntry-Step18_1\install.mjs" --project "." --undo-latest
```
All affected paths are checked before restore. Undo stops rather than overwriting edits made after installation. Backups live inside the actual Git directory, under `dth-access181-backups`. No database is rolled back.

## Checkpoint
After successful tests/build and manual verification, review the staged file list and keep secrets out before committing:

```bat
git diff --check
git add .
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add branded 3D login and shop-first entry"
git push origin feat/shop-discovery
```

## Boundaries
Shipping addresses, deposits/COD/pickup, notifications and the outstanding product CRUD work are not implemented or advertised as working here. No real payment is accepted by this patch.
