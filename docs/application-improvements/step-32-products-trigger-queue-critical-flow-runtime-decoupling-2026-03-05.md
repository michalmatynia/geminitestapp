---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 32 Execution: Products Trigger-Queue Critical-Flow Runtime Decoupling

Date: 2026-03-05

## Objective

Remove the pre-existing `next/server` module-resolution failure from the AI Paths runtime critical-flow test lane and confirm strict critical-flow gating stays green together with Product Trigger Button -> enqueue -> queue refresh integration.

## Root Cause

`path-run-executor` imported `listAiPathsSettings` via the AI Paths server barrel:
- `@/features/ai/ai-paths/server`

That barrel re-exported auth access modules, which transitively loaded `next-auth` and `next/server` in the unit runtime path. In this environment, that dependency chain failed in Vitest with:
- `Cannot find module 'next/server' imported from next-auth/lib/env.js`

## Implemented Fix

1. Narrowed runtime dependency boundary in executor:
   - Updated import in `src/features/ai/ai-paths/services/path-run-executor/index.ts`
   - From:
     - `@/features/ai/ai-paths/server`
   - To:
     - `@/features/ai/ai-paths/server/settings-store`

2. Removed ineffective temporary test alias:
   - `vitest.config.ts`
   - Deleted alias:
     - `'next/server': path.resolve(__dirname, './node_modules/next/server.js')`

## Validation

1. Reproduced and verified fixed failing suite:
   - `npx vitest run __tests__/features/ai/ai-paths/services/path-run-executor.test.ts`
   - Result: pass (`17` tests).

2. Strict critical-flow gate:
   - `npm run test:critical-flows:strict -- --ci --no-history`
   - Result: pass (`6/6` critical flows, including AI Paths runtime + Products trigger-queue).

3. Dedicated trigger-queue integration gate:
   - `npm run test:ai-paths:trigger-queue:integration`
   - Result: pass (unit lane `20` tests + E2E lane `6` tests).

## Outcome

The previously known strict critical-flow blocker is resolved. Product Trigger Button -> enqueue -> queue refresh coverage remains intact and green in both dedicated and shared quality gates.
