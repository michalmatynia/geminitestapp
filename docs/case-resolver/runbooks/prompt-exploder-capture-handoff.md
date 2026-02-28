---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
related_components:
  - 'src/features/prompt-exploder/bridge.ts'
  - 'src/features/prompt-exploder/context/DocumentContext.tsx'
  - 'src/features/case-resolver/hooks/useCaseResolverState.ts'
  - 'src/features/case-resolver/hooks/useCaseResolverState.prompt-exploder-sync.ts'
  - 'src/features/case-resolver/hooks/prompt-exploder-transfer-lifecycle.ts'
  - 'src/features/case-resolver/pages/AdminCaseResolverPage.tsx'
---

# Runbook: Prompt Exploder -> Case Resolver Capture Handoff

## Purpose

Use this runbook when Prompt Exploder output does not apply cleanly to Case Resolver, applies to the wrong target, or capture mapping/cleanup behavior is inconsistent.

## Flow Contract

Each transfer payload carries:

- `transferId` (stable transfer identity)
- `payloadVersion`
- `checksum`
- `status`
- `createdAt` and `expiresAt`
- Case Resolver context (`fileId`, `fileName`, optional `sessionId`, optional `documentVersionAtStart`)

## Expected Flow

1. Case Resolver sends document content to Prompt Exploder with bound file/session context.
2. Prompt Exploder applies reassembled text back with transfer metadata and capture payload.
3. Case Resolver receives pending payload and validates document/session binding.
4. Text apply runs against the bound file only.
5. If capture proposal exists, modal opens for explicit mapping decision.
6. `Apply Mapping` commits field mapping + source cleanup.
7. `Dismiss (No Mapping)` closes without mutating party/date fields.

## Triage Matrix

### Symptom: pending output shows but cannot apply

Checks:

- Verify mismatch badges in Case Resolver banner (`document` or `session` mismatch).
- Inspect transfer diagnostics (`status=blocked` and `reason`).
- Confirm payload still within `expiresAt`.

Action:

- Open the bound target document from the banner.
- Reopen Prompt Exploder from the same Case Resolver document/session if mismatch persists.

### Symptom: mapping appears to apply to wrong document

Checks:

- Confirm transfer target file in diagnostics.
- Confirm capture apply diagnostics target vs resolved target.

Action:

- Verify `proposalTargetFileId` in capture modal.
- Ensure capture mutation path uses proposal target only (no fallback target resolution).

### Symptom: mapping modal close still mutates fields

Checks:

- Confirm user action was `Dismiss (No Mapping)` and not `Apply Mapping`.
- Check capture diagnostics and workspace events for `capture_mapping_dismissed` vs apply events.

Action:

- If any field changed on dismiss, treat as regression and rollback to previous known-good commit.

### Symptom: same transfer reapplies after refresh

Checks:

- Compare `transferId` in diagnostics/events.
- Verify duplicate transfer is discarded with `reason=duplicate_transfer_id`.

Action:

- Clear stale payload key from storage if needed.
- Validate applied-transfer id cache behavior.

### Symptom: pending transfer never appears and user reports no-op after handoff

Checks:

- Inspect diagnostics for `status=expired` and `reason=payload_expired`.
- Verify pending banner shows expired stage and transfer metadata.

Action:

- Use `Discard Pending Output` to clear stale payload.
- Re-send from Prompt Exploder to issue a fresh transfer (`transferId` must differ).

## Diagnostics to Capture

- Pending banner badges:
  - target
  - session
  - transfer ID
  - stage/status
- Prompt transfer diagnostics:
  - `transferId`, `payloadVersion`, `payloadStatus`, `checksum`
  - resolution strategies and reasons
- Capture mapping diagnostics:
  - stage (`precheck|mutation|rebase`)
  - attempts
  - target vs resolved target
  - cleanup/mutation/total apply durations (ms)

## Validation Commands

- `npx vitest run src/features/prompt-exploder/__tests__/bridge.test.ts`
- `npx vitest run src/features/case-resolver/__tests__/prompt-exploder-transfer-lifecycle.test.ts`
- `npx vitest run src/features/case-resolver/__tests__/prompt-exploder-sync-target.test.ts`
- `npm run test:case-resolver:regression`
- `npx playwright test e2e/features/case-resolver/case-resolver.spec.ts` (Node 22 runtime required)

## Rollback Criteria

Rollback when any of the following persists for > 15 minutes:

- wrong-target apply incidents
- `blocked` mismatch rate spikes after deployment with no operator path to recover
- dismiss path mutates mapped fields

## Post-Incident Tasks

1. Attach affected `transferId` samples and diagnostics.
2. Add regression test for the exact failure mode.
3. Update this runbook and `docs/case-resolver/changelog.md`.
