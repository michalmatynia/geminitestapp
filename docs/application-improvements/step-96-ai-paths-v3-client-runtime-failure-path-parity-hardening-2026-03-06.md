---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 96 Execution: v3 Client Runtime Failure-Path Parity Hardening

Date: 2026-03-06

## Objective

Harden client-native runtime parity by adding deterministic regression coverage for async failure branches in `model` and `agent` execution paths.

## Implemented

1. Client parity failure-path test expansion:
   - `src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Added deterministic coverage for:
     - `model` wait-path poll failure (`status=failed`, propagated error).
     - `model` enqueue contract failure (missing/invalid `jobId`).
     - `agent` wait-path poll failure (`status=failed`, bundle failure status).

## Validation

1. Updated client subset suite:
   - `npx vitest run src/shared/lib/ai-paths/core/runtime/__tests__/client-native-code-object-registry-contract-subset.test.ts`
   - Result: pass (23 tests).

## Outcome

- Client-native parity coverage now includes both success and failure branches for async `model` and `agent` flows.
- Regression confidence improved for job enqueue/poll contract edge cases.
