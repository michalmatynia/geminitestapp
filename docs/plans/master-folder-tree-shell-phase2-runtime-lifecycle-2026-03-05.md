---
owner: 'Folder Tree Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'feature:foldertree'
canonical: true
---

# Master Folder Tree Shell Migration Phase 2: Runtime Lifecycle Churn Hardening

Date: 2026-03-05  
Scope owner: Folder tree maintainers

## Phase 2 Objective

Harden providerless shell runtime behavior under cross-route churn by locking:

1. shared runtime identity stability after route switches,
2. instance registration cleanup when route trees unmount,
3. keyboard handler cleanup so stale route handlers cannot receive hotkeys.

## Phase 2 Delta Added

1. Added cross-route churn suite:
- `src/features/foldertree/v2/__tests__/shell-runtime-route-churn.test.tsx`

2. Added coverage for:
- providerless shared-runtime identity stability across route remount (`route-a` -> `route-b`)
- stale-instance registration removal (`getInstanceIds` no longer contains prior route)
- focused-instance reassignment after route switch (`getFocusedInstance`)
- Delete-key routing to active route only (no stale handler replay)
- repeated mount/unmount churn guard (21 route swaps) with keyboard dispatch assertions

## Verification Gate For Phase 2

Run:

1. `npx vitest run src/features/foldertree/v2/__tests__/shell-runtime-route-churn.test.tsx`
2. `npx vitest run src/features/foldertree/v2/__tests__/runtime-provider.test.tsx`
3. `npx vitest run src/features/foldertree/v2/__tests__/useFolderTreeInstanceV2.external-sync.test.tsx`
4. `npx vitest run src/features/foldertree/v2/__tests__/useFolderTreeUiState.metrics.test.tsx`
5. `npx vitest run src/features/foldertree/v2/components/__tests__/FolderTreeViewportV2.metrics.test.tsx`

## Remaining Risk (Post-Phase 2)

1. Browser-level tab suspension/resume coverage required a dedicated Playwright lifecycle stress flow (implemented in Phase 3).
