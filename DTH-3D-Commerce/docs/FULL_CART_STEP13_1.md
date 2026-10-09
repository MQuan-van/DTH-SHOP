# Step 13.1 — Full Cart Page 2.0

## Scope
Adds `/bag` UI under `frontend/src/shop/cart/page/`. It consumes the Step 13.0 transaction-backed StoreProvider and uses the existing createOrder adapter and existing confirmation route. No backend endpoint, database migration, payment integration, scan service or WebGL code is added.

## Invariants
- Bag storage remains `{productId, vehicleId, quantity}`. Browser-supplied prices are not trusted.
- Catalog total is derived from the loaded catalog, not a fresh server quote or inventory reservation.
- Each line retains its vehicle. The header vehicle does not retarget existing items.
- Explicit line-vehicle selection validates mapping, merges matching lines and refuses a quantity total above 10 without silently clamping it.
- Inactive/missing products, unknown/mismatching vehicles, invalid prices and catalog errors remain visible. Any blocking line disables review and the full total is shown as Review needed.
- Review and acknowledgement are bound to the exact actor, quantities, unit prices and vehicle labels. Edits and catalog changes invalidate acknowledgement.
- Price comparison is only against the last review made during this mounted cart visit, not against the original add time or a server-side price history. Refreshing/remounting starts a new local comparison baseline.
- Checkout uses the existing adapter: `createOrder(items, idempotencyKey, true, catalog, expectedTotal)`.
- One pending request per mounted controller. Ambiguous failure retains the intent for same-bag retry. Late responses after unmount/account switch do not clear the bag or navigate. A bag changed while waiting is not cleared on success.
- No new address/payment form. Review → acknowledgement → existing simulated order → existing confirmation. Flow mode still requires the Flow demo account.

## Motion / accessibility
Finite row FLIP and short total opacity/position transition; no fake animated monetary counting. Only the inner product image gets CSS perspective hover. No added GLB. Reduced motion, page pause, hidden tab and open dialogs/support disable presentation animation. A single polite status region announces edits. Remove restores focus to another row or the main heading.

## Files and integration
Only StoreApp.jsx is patched: one import after CartDrawer, and the /bag element becomes FullCartPage. The old Bag function is retained untouched for safe rollback but is not routed. Existing Drawer, Product, Build, Account, Completed and backend sources are not replaced.
Requires the Step 13.0 cart files. Installer validates critical helper hashes and exact route patch anchors before writing.

## Next milestone
Step 13.2 can add a fresh server quote/validation endpoint and persistent price-change acknowledgement. Those are not claimed as implemented here.
