# Step 14 — Checkout & Order 1.0

## Scope

This step adds a separate `/checkout` route after the Step 13.2 server cart quote.
It remains an FYP demonstrator: no real payment and no real shipment are performed.

## Flow

`/bag` → server quote → acknowledge demo → `/checkout` → fresh quote → contact/delivery demo form → final `/orders` revalidation → `/order-complete`.

## Server authority

- Frontend totals are never authoritative.
- `/orders` revalidates current product status, current integer VND price, quantity and each product/vehicle mapping.
- A reviewed quote fingerprint is required by the new checkout flow.
- Checkout details are normalized on both client and server.
- The server does not accept card numbers or payment credentials. Payment method is fixed to `demo-cod`.
- Idempotency binds both the normalized bag and normalized checkout details, so a lost response can be safely retried while changed details require a new key.

## Stored order snapshot

The simulated order stores line snapshots, checked quote metadata and the demo checkout snapshot:
recipient name, phone, email, address, city, optional note, `demo-delivery`, and `demo-cod`.
Use fictitious evaluation data.

## Out of scope

Payment gateways, card data, stock reservation, shipping APIs and manufacturer fitment verification remain out of scope.
