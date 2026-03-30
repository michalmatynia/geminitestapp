---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver/settings.ts'
  - 'src/features/case-resolver/settings-relation-graph.ts'
  - 'src/features/case-resolver/server/ocr-runtime-job-store.ts'
---

# Runbook: Data Integrity Checks

## Purpose

Use this runbook for proactive or incident-driven integrity checks of Case Resolver workspace and OCR job data.

## Check Areas

1. Workspace revision and mutation fields:
   - `workspaceRevision`
   - `lastMutationId`
   - `lastMutationAt`
   - shared settings records for the main workspace and detached documents/history payloads
2. File hierarchy consistency:
   - valid `parentCaseId`
   - no self/looping parent references
3. Reference integrity:
   - `referenceCaseIds` must point to existing case IDs
   - `relatedFileIds` must point to existing non-case file IDs and be bidirectional
4. Folder consistency:
   - folder records and folder path normalization
5. Relation graph consistency:
   - edges reference existing nodes
6. OCR job lineage:
   - retry chains via `retryOfJobId`
   - attempts fields (`attemptsMade`, `maxAttempts`)

## Validation Actions

1. Run case resolver tests:
   - `npx vitest run src/features/case-resolver/__tests__ --reporter=dot`
2. Validate normalization paths in `settings.ts` with known-bad fixture payloads.
3. Validate sampled `/api/settings` payloads for light/heavy workspace fetches when the
   incident involves hydration drift.
4. Validate OCR job records parse and defaults with missing or legacy fields.

## Incident Workflow

1. Capture suspicious record samples.
2. Classify issue:
   - serialization issue
   - migration/legacy payload issue
   - runtime mutation race
3. Apply corrective normalization or targeted repair script.
4. Re-validate with tests and sample audits.

## Exit Criteria

- no broken parent/reference links in sampled workspace
- relation graph edge/node integrity restored
- OCR retry lineage and attempts fields valid for sampled jobs

## Post-Incident

- add permanent regression test
- update this runbook and `docs/case-resolver/changelog.md`
