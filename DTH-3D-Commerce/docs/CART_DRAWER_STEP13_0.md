# DTH Cart Drawer — Step 13.0

## Scope
The drawer shares StoreProvider's existing bag and storage keys. A successful add requests it; a failed add does not. Each line remains `{productId, vehicleId, quantity}`. Global vehicle changes do not reassign a line. No new backend endpoint, order submission, real payment, stock reservation, GLB instance, or client price snapshot is introduced.

The header bag link still has `/bag` as its href. Normal clicks open the drawer except when already on `/bag`. Modified clicks preserve the browser's link behavior. The footer goes to the existing `/bag` review/mock-checkout flow, not an invented `/checkout` endpoint.

## State and concurrency
`createCartState` is a synchronous transaction buffer, updated only by event handlers or effects through `useCartState`. Functional legacy `setBag` calls read its latest snapshot. Two adds before React renders cannot create duplicate keys or evade the per-line cap. Current catalog records are looked up by product ID rather than trusting a stale passed product object. Frozen snapshots make accidental external mutation visible.

The hook keeps ephemeral drawer requests separate from persisted bag data. Changing authenticated identity cancels a pending drawer. Route changes cancel it. It does not reopen merely because a stored cart was restored on page load. Multi-tab synchronization is not added in this milestone.

## Dialog handoff
QuickView latches successful submission, then closes through its existing animation controller. The drawer waits until no existing native dialog, Support panel, or ignition intro is visible. A queued request expires after 8 seconds rather than popping up minutes later. No unrelated dialog is forcibly closed.

The drawer uses native `showModal`, initial close-button focus, keyboard Tab boundaries, Esc, scrim click, scroll-lock cleanup and focus return. A queued old `close` event is ignored after reopening the same dialog. Opening another modal externally cancels the drawer. Fallback for unsupported native dialogs is `/bag`.

## Presentation
Desktop side panel: 440 ms entry, 260 ms exit; finite row entrance and cyan divider reveal. Below 640px: bottom sheet. Reduced motion and the triggering page's Motion off remove animated tracks. No infinite pulse, flying model or forced delay before click. Item images use the existing ProductImage fallback path. Screen-reader quantity/removal feedback is a local status region.

## Price and compatibility
The displayed subtotal uses the loaded catalog, NOT a fresh server quote. If any line has an unavailable product, missing/invalid price, invalidated fitment, or loading/error catalog state, the footer displays `Review needed`, not a partial total presented as the whole cart. Such rows remain removable and may be reduced but cannot be increased. The final order endpoint must still revalidate all fields. This step does not detect price changes since add time or reserve stock; those belong to Cart Revalidation.

## Regression scripts
Product and fitment browser scripts that resume outside the new modal now explicitly verify and close it. Original cart assertions are retained. Absent optional browser files are not invented. A dedicated compiled-Flow workflow tests actual Product/QuickView → drawer → bag navigation, updates and empty/invalid states. Never disable tests merely to get a merge check green.

## Verification for this delivery
- 62 Node tests executed against pure cart/state modules and integration-anchor source fixtures.
- 30 Chromium checks executed on actual dialog controller/CSS with static markup exported from CartDrawer JSX: focus, scroll lock, interruptions, resizing, overlay queue and cleanup; 10 viewport sizes.
- New JSX/JS/MJS transpiled for syntax checking and CSS parsed with PostCSS.
- React runtime integration, Vite build, compiled-Flow workflow, MongoDB, Windows GPU/browser and all previous suites were NOT run in the delivery environment: dependency downloads were unavailable. The HTML fixture is not the running DTH application.
- Installer tests and results are provided separately in the Checks archive.

Read the checks report before treating the package as release-ready. Run the included test/build commands and review a PR before merging. No remote writes were performed.

## Reference APIs
https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel
https://react.dev/reference/react/useState
