# DTH 3D Commerce

Independent academic baseline for a 3D parts storefront with synthetic vehicle compatibility and simulated checkout.

**Vietnamese setup guide:** [README_VI.md](README_VI.md)

React + Vite + Three.js/React Three Fiber · Node.js + Express · MongoDB/Mongoose.

```sh
# Run from the repository root. First install generates the real root lockfile.
npm install
npm run check
npm test
npm run dev
```

Preview: http://127.0.0.1:5173 — no database required for preview; no fake registration/server persistence.

For API mode: configure `backend/.env`, run MongoDB, run `npm run seed`, keep `npm run dev:api` running, set `frontend/.env.local` to `VITE_STORE_MODE=api`, then restart Vite. Use only test accounts and synthetic data.

This is not a production retailer, certified fitment database, completed FYP or verified full-stack build. Read [actual test coverage](docs/TEST_REPORT.md), [baseline changes](docs/BASELINE.md), [roadmap](docs/ROADMAP_VI.md) and [asset provenance](docs/ASSET_ATTRIBUTION.md).

The original repository is a reference, not a runtime dependency. This package does not create or modify a remote GitHub repository.
