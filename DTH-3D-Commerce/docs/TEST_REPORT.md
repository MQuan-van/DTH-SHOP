# Standalone baseline — actual verification record

This report applies to DTH-3D-Commerce 0.1.0, not the earlier overlay installer.

## Executed in the generation container

Environment: Node.js 22.16.0, npm 10.9.2, Linux. The recommended Windows development environment has not been reproduced here.

| Check | Actual result | Scope |
|---|---|---|
| `npm test` | 61 passed, 0 failed | Existing domain/data/security primitive checks plus independent-workspace structural checks. |
| `npm run check` | Passed | Baseline files and relative source imports resolve. |
| TypeScript syntax parsing | 18 JS/JSX/MJS files; 0 syntax errors | Parser only; no type checking or dependency loading. |
| PostCSS parsing | 2 stylesheets; 0 syntax errors | CSS parse only; no layout/accessibility validation. |
| Asset checks | Included in Node suite; all 20 GLB headers/lengths and preview file presence passed | Not a visual or GPU rendering test. |

Raw test output: `node-test-output.txt`.

## Not executed successfully / still required

Registry connectivity check failed with `Could not resolve host: registry.npmjs.org`. React/Vite/Express/Mongoose dependencies are absent in this container. Therefore no dependency installation, real lockfile generation, npm audit, Vite build, browser UI/WebGL run, Express/MongoDB integration, complete auth/order flow or deployment has been verified here. No npm install success, runtime performance, accessibility conformance, functional-test percentage or user evaluation score is claimed.

The bundle deliberately contains no invented package-lock.json. Run npm install on the development machine, resolve any compatibility errors without blindly forcing peer dependencies, commit the generated lockfile, then record build and runtime results.

A syntax pass and 61 unit/structural passes are NOT the proposal's functional evaluation or UAT. Conduct and document those separately with real participants and results. See MANUAL_TEST_PLAN.md.
