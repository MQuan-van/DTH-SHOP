# DTH Step 12.4 — Compatible Alternatives / Complete Your Build

## Scope
An additive, client-side recommendation section after the Product Decision hero, before long-form description/specification sections. Data comes from the same catalog and selected vehicle as the existing product page. There are no new API calls, database fields, GLB requests, cart operations, fake products, fake inventory or ratings. Home, Story, loader, 3D asset profiles, shader code and checkout are not modified.

The module relies on the Product Decision and Vehicle Fitment foundations. The released integration was tested on the supplied Step 12.1–12.3 packages over a saved workspace snapshot. It is not a copy of the user's current filesystem.

## Selection states
- No vehicle: a Select vehicle action, no recommended products.
- Vehicle missing/ambiguous in catalog: unknown-vehicle message, no products.
- Current product incompatible: only other products in the same category which are mapped to the selected vehicle.
- Current product compatible: one mapped product per OTHER category, at most four. Each product matches the vehicle individually; no pairwise part/kit compatibility is inferred.
- Current product mapping unknown: keep the unknown result and show mapped same-category peers when they exist. Never relabel unknown as incompatible.
- Current product unavailable or invalid category/identity: no suggestions.
- Empty eligible pool: explicit message and links; never fill with unrelated or incompatible products.

Use `explainFitment` from Step 11.2, which wraps the shared domain rule and rejects malformed mappings. This keeps the recommendation result aligned with the current FitmentStatus panel, including arrays containing non-string IDs.

## Eligibility and deterministic ranking
Candidates must have safe product IDs/slugs, a known category, non-empty name, active !== false, positive integer VND price <= 1,000,000,000 and a compatible mapping. Missing currency/active fields retain existing catalog conventions. Duplicate IDs or slugs are excluded entirely to avoid directing users to a different record. The current ID and slug are excluded.

Alternatives: featured === true first, then absolute price difference to the current part, then normalized name and ID. Invalid current price skips the distance criterion. Complete Your Build applies this ranking WITHIN each other category and shows categories in shared CATEGORIES order. Price comparisons across categories never decide category order. Featured is a merchandising flag, not a quality or safety score.

The selector does not mutate the original arrays or objects and does not accept fitment from a model/AI inference.

## Navigation
Cards are native React Router Links to `/products/:slug`; they do not open Quick View or add to cart. Ctrl/Cmd-click, keyboard activation and browser history remain available. `fromShop` is sanitized with the existing `safeShopReturn` and propagated, so Back to parts preserves the original Shop query through product-to-product navigation. Selected vehicle remains in StoreProvider, not in a potentially stale link override.

The section is intentionally independent of Shop search/price filters. Its caption explains its own scope. The explicit category link starts `/shop?fit=match&category=...` (or just `fit=match` for build) without silently editing the stored Back-to-Shop URL.

## Motion and accessibility
- New rows: 420ms finite entrance, 65ms stagger, at most three stagger offsets.
- Header cyan sweep: 650ms, one pass per new recommendation signature while visible.
- Old rows are removed immediately after data changes. No stale interactive recommendation is retained solely for an exit effect.
- Only image planes tilt (max rotateX 3deg / rotateY 4deg); titles/prices stay flat. Images may scale to 1.025 and lift 16 CSS px.
- Finite WAAPI animations; at most one pending pointer frame per card. Cancel on unmount, offscreen/background state, Motion off, reduced motion or modal/Support gate.
- A single polite status region announces the section result; per-card mappings are ordinary text.
- Semantic headings and a list of native links; visible keyboard focus. When a focused card is removed, restore heading focus only if focus has actually fallen to the document body.
- Desktop: up to four columns. A single alternative has a compact horizontal card rather than three empty placeholders. Tablet: two columns. <=650px: native horizontal proximity snap with previous/next controls; no auto-advance and no wheel interception.

## Integration
New folder: `frontend/src/shop/product/recommendations/` (five files).
Existing file: `ProductDecisionPage.jsx`, only an import and a section mount.
New tests: `tests/product-recommendations.test.mjs` and `tests/browser/product_recommendations.py`.
New GitHub workflow: `.github/workflows/product-recommendations-quality.yml` at repository root.

The installer preflights every change, verifies packaged checksums and expected helper code, keeps an external backup and stops on conflicting source. Do not overwrite the whole ProductDecisionPage with an older template. Restore refuses to remove subsequent edits.

## Verification
See supplied checks JSON and logs for results actually executed. Browser tests in the provided remote workflow target compiled Flow over HTTP and the real BrowserRouter. That workflow is supplied, not run remotely by this package.

Local visual/interaction verification used Chromium offline, React StrictMode, actual ProductDecisionPage/StoreProvider and recommendation modules; a MemoryRouter fixture shell, memory storage and image data URLs were used because localhost navigation was blocked. WebGL was unavailable, so ProductMedia displayed its real poster fallback. This does not certify live database/auth/support, real vehicle fitment, production performance or actual 3D output.

Technical references (accessed 2026-10-05):
- https://react.dev/reference/react/StrictMode
- https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
- https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type
