# Master Folder Tree Shell Migration Phase 3: Browser Lifecycle Stress Coverage

Date: 2026-03-05  
Scope owner: Folder tree maintainers

## Phase 3 Objective

Close the remaining runtime lifecycle gap by validating shell runtime behavior in a real browser loop with:

1. background tab switch + foreground resume,
2. runtime keyboard dispatch continuity after resume,
3. route-level mount/unmount churn in the same browser session.

## Phase 3 Delta Added

1. Added public browser harness route:
- `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx`
- Provides deterministic folder-tree runtime lifecycle sandbox with:
  - shared shell runtime usage (providerless),
  - explicit runtime keyboard handler registration,
  - runtime state telemetry attributes (`instanceIds`, `focusedInstance`, keyboard dispatch, selected node),
  - route remount toggles (`alpha`/`beta`) that swap instance ownership.

2. Added Playwright lifecycle stress spec:
- `e2e/features/foldertree/foldertree-runtime-lifecycle.spec.ts`
- Verifies:
  - keyboard-driven selection progression before background switch,
  - continuity after background/foreground tab switch,
  - runtime instance ownership swap and recovery across route remount churn.

## Verification Gate For Phase 3

1. Start app server with supported Node runtime (Node 22).
2. Run:
   - `PLAYWRIGHT_USE_EXISTING_SERVER=true npx playwright test e2e/features/foldertree/foldertree-runtime-lifecycle.spec.ts`

## Remaining Risk (Post-Phase 3)

1. Lifecycle stress is currently validated on Playwright Chromium; cross-browser parity (WebKit/Firefox) is not yet locked by CI.
