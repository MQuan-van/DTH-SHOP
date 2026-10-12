# Loader Performance 17.2 — verification report

Date: 2026-10-07. Reference: `MQuan-van/DTH-SHOP`, `feat/shop-discovery`, `0e6d63faed2fe1f0eae70aecb4c6347f923baf33`.
The installer also accepts the previously supplied code-loader files from Experience16.2; unrelated Shop17 presentation edits stay intact.

## What this update actually changes

6 controlled module replacements (5 loader presentation/config files plus their choreography regression test), targeted integration edits at the Gate and 6 graphics entry points, and an optional synchronous cover hook for Experience16.2. New helpers contain the milestone scheduler and deferred-graphics context. Original logo bytes, `loader.logic.mjs`, `useAppReadiness.js`, data/auth/cart/checkout APIs, GLB assets, materials and camera settings are NOT rewritten.

The application/provider tree stays mounted. Text and catalog/session requests can continue behind the intro. Graphics capability probes and conditional renderer mounts at the integrated entry points are postponed until cover has completed. This is not a claim that all JavaScript parsing or all work on the page has been eliminated.

The old loader allowed dynamic clip-path animation and many decorative layers. The new desktop entry schedules 7 native WAAPI tracks (5 below 600px), with transform/opacity keyframes and static clipped/masked regions. A static mask can still incur rendering cost; compositor-only behavior on every device is not guaranteed.

## Executed checks

| Check group | Result | Scope |
|---|---:|---|
| Node policy, choreography, scheduler, cancellation and source contracts | 59 passed | New production logic; unchanged `loader.logic.mjs` snapshot verified by Git blob hash; scene source-contract checks use targeted anchor fixtures. |
| Offline installer | 13 passed | Check-only no writes, apply/reapply, CRLF, Unicode/spaces, optional integration, conflicts, symlink rejection, guarded undo and interrupted-journal recovery. |
| Offline browser — primary | 24 passed | Actual modified AppLoaderGate, AppLoader, useAppReadiness and startup hooks in React 19.1.1; normal/skip/Escape/navigation exits, retained shell, deferred graphics witness. |
| Offline browser — failure/recovery | 40 passed | Missing logo, catalog failure, timeout, absent WAAPI, denied session storage, unavailable WebGL, seen session and delayed page readiness. |
| Offline browser — layout/lifecycle | 29 passed | 7 viewport sizes, mobile track count, visible 44px Skip target, reduced motion and cleanup after unmount. |
| TypeScript JSX/JS syntax transpilation | 10 modules, no diagnostics | Changed/new loader integration and existing readiness module. Not a Vite full-project build. |

Browser verification used Playwright, locally installed Chromium and a bundled React **19.1.1 production runtime** available in the environment. The target project is React **19.2.x**: exact-version development and production integration still require validation on the user's machine.

The browser harness uses route/catalog fixtures and a visibly labelled synthetic transparent test image. It does NOT provide a new logo to the project. A lightweight graphics witness tests allowed timing; WebGL capability calls are observed, but a successful real GLB renderer is not asserted. The original project logo was not available as downloadable bytes to this container. No synthetic visual fixture or vendor runtime is shipped to the application.

The unmodified Gate/readiness/policy snapshots used for integration were verified against the fetched Git blob identities:

- `AppLoaderGate.jsx`: `af82b5b5e1b9ee2e8e7df0d2275ab940d2584a1d`
- `useAppReadiness.js`: `49ee3790825bb2f80d4a127372d233510d173151`
- `loader.logic.mjs`: `0d23cff340baf397f1fcfc6fd23dc1df58c42f1a`

## Not verified here

- Full dependency installation and full React19.2/Vite build: container cannot resolve npm/GitHub hosts for a full repository/dependency checkout. Connected GitHub reads were available; this is not a failure of the user's repo.
- User's API/MongoDB, login credentials or live order data. No connection or writes were attempted.
- Actual GLB rendering, production GPU FPS or improvement percentage on the user's PC/laptop.
- Dev StrictMode's exact extra-effect behavior in the target build. Unit tests exercise cancellation/resume and browser tests cover real unmount cleanup; StrictMode is NOT disabled by the patch.
- End-to-end Login → Story → Home with the real API. Redirect rules were left unchanged; the cover hook is now synchronous.

The earlier explanation of lag was a set of plausible sources visible in code, not a measured bottleneck ranking. Animation count alone is not a performance measurement. No before/after FPS claim is made in this report.

## Required local checks

Run the three loader test files, project check, baseline test suite and Vite build. Compare `npm run dev` on 5173 and `npm run preview` on 4173 with the same API mode. Inspect a cold load and a warmed-cache load, with/without DevTools. Check all affected 3D entry points after intro, missing-model/image fallback, normal navigation, keyboard skip, reduced motion and return-session behavior.

The included `tests/browser/loader172.py` is intended for the **actual compiled app**. It observes WebGL context attempts and rAF intervals and writes local test evidence; it has not been run against the full project in this environment. Its rAF statistics are not a replacement for a compositor/GPU trace.

## Technical references

Official primary documentation used for the implementation choices:

```text
https://web.dev/articles/animations-guide
https://react.dev/reference/react/StrictMode
https://r3f.docs.pmnd.rs/advanced/scaling-performance
```

Prioritize transform/opacity and profile paint/layout; preserve proper effect cleanup rather than disabling StrictMode; avoid unnecessary graphics work. These recommendations do not guarantee a particular frame rate.
