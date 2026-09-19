# Baseline v0.1.0 — independent source package

This directory is an independent development baseline derived from the DTH-3D-Store update bundle supplied in this conversation. It is not the completed FYP and not a production retailer.

The earlier bundle targeted MQuan-van/Final-Project_GRE / DTH-SCOOTER-TEAM. This copy has no .git folder, no remote, no installer and no references to the legacy Story/Home/Gallery components. The original repository has not been written to.

## Changes made for independence
- Real frontend, backend and root workspace package manifests, plus HTML/React entry points.
- Root commands: npm install, npm run dev, npm run dev:api, npm run seed, npm test, npm run check, npm run build.
- Express entry point no longer imports legacy API routes.
- MongoDB default changed to dth_3d_commerce; .env loaded relative to backend rather than current directory.
- Different cookie and localStorage key names to avoid sharing state with the earlier kit.
- Missing links to legacy pages removed, global document scroll reset, .gitignore and examples added.
- Ports remain 5173 (Vite), 4173 (Vite preview), 5000 (API); stop the old servers before running this copy on those ports.

## Dependency policy and limitation
The direct dependency ranges preserve the original repository's major versions for a focused migration; this is not a claim that these are the latest packages. Only used frontend libraries are included. No downloaded dependencies, fabricated lockfile, or copied node_modules are shipped. The first successful npm install must create the real root package-lock.json; review and commit it. Subsequent clean installs can use npm ci with the matching lockfile. Validate current dependency audit findings before public deployment; do not blindly use --force or --legacy-peer-deps to hide incompatibilities.

## Baseline features present in source
Storefront, category/price/search filters, make/model/year matching, GLB viewer with static fallback, bag and preview checkout, API account/session/cart-quote/order workflows, minimal admin JSON editor. In API mode the backend validates prices and compatibility. These have not all been runtime-verified in the generation environment.

## Explicit limits
20 illustrative products are five model families with four variants each; 8 synthetic vehicle configurations. They are NOT manufacturer-certified compatibility data. No real payments, physical installation validation, native app, AR camera overlay, real inventory reservation, email verification/reset, rich admin upload UI, or completed UAT. Wishlist/reviews remain future work. Research records/results are not generated.

The current code consolidates page components in frontend/src/shop/StoreApp.jsx. Split them into separate modules after obtaining a tested baseline; do not label a proposed future tree as already implemented.
