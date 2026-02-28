---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
related_components:
  - 'src/features/case-resolver'
  - 'src/app/api/case-resolver'
  - 'src/features/jobs/workers/caseResolverOcrQueue.ts'
---

# Runbook: Release and Rollback

## Purpose

Define the release gate and rollback process for Case Resolver changes.

## Pre-Release Checklist

1. Tests:
   - `npx vitest run src/features/case-resolver/__tests__ --reporter=dot`
2. Lint (touched files):
   - `npx eslint <touched case resolver files>`
3. API smoke:
   - OCR create/status/retry endpoints
   - document export and extract endpoints
4. Manual functional smoke:
   - case create/edit/delete
   - save conflict handling
   - OCR dispatch and result polling

## Rollout Plan

1. Deploy to staging.
2. Execute smoke checklist.
3. Canary production rollout (10% -> 50% -> 100%).
4. Observe key metrics at each stage before advancing.

## Rollback Triggers

- Save latency critical threshold breached > 15 minutes.
- Conflict recovery < 97%.
- OCR final failure ratio > 4% after mitigation.
- Blocking user flow regressions.

## Rollback Procedure

1. Stop rollout and freeze further changes.
2. Revert/deploy previous known good artifact.
3. Verify core flows in production.
4. Confirm metric recovery and close incident state.

## Post-Rollback

1. Open incident report with timeline and impact.
2. Create fix-forward plan and regression tests.
3. Update docs/changelog before next release attempt.
