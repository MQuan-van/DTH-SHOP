# Step 18.0 — Admin Operations Experience

Scoped presentation upgrade for `/admin` and `/admin/inbox`.

## Changes

- Operational overview using actual `/admin/studio/overview` counts and current-page conversation data, no fabricated charts or revenue trends.
- CSS-depth hero visual with reduced-motion fallback and dark navy / candy-blue shared direction.
- Recent conversation queue with direct thread links.
- Catalog visible / total ratio from actual backend values.
- Inbox search, status filters, page-local unread prioritisation, thread read/reply, resolve/reopen, customer context, mobile drawer.
- Uses the existing `ChatThread`, SSE `SupportProvider`, authenticated `studioRequest`, CSRF and MongoDB endpoints.
- Dashboard/inbox only: Admin Products Add/Edit and Delete are not changed. Complete CRUD and asset uploads belong in Step 18.1/18.2.

## Constraints

- No DB seed, migration, backend route or package install.
- No WebGL canvas in Admin; CSS 3D optics only, animations pause under `prefers-reduced-motion`.
- Count labels distinguish overall API totals from metrics calculated only for the current loaded inbox page.
- Do not imply simulated orders are real payments or shipments.

## Validate

```sh
node --test tests/admin-ops18.test.mjs
npm run check
npm test
npm run build
```

Then manually verify `/admin`, `/admin/inbox`, thread reply/read/resolve/reopen, empty queue, error retry, search/status filters, mobile, keyboard navigation, and the existing `/admin/products` Add/Edit forms.
