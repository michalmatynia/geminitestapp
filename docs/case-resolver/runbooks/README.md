---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'index'
scope: 'feature:case-resolver'
canonical: true
---

# Case Resolver Runbooks

This folder contains the operational runbooks for the Case Resolver feature.
Use these docs for incident response, operational diagnosis, and release-safe
change handling.

The current incident surface is concentrated in three lanes:

- shared-settings-backed workspace persistence and conflict recovery
- OCR runtime job creation, status, retry, and observability
- Prompt Exploder handoff and capture-apply lifecycle

## Current Runbooks

- [`performance-stability.md`](./performance-stability.md)
- [`ocr-failures-and-retry.md`](./ocr-failures-and-retry.md)
- [`workspace-conflict-recovery.md`](./workspace-conflict-recovery.md)
- [`case-list-degradation.md`](./case-list-degradation.md)
- [`prompt-exploder-capture-handoff.md`](./prompt-exploder-capture-handoff.md)
- [`release-and-rollback.md`](./release-and-rollback.md)
- [`data-integrity-checks.md`](./data-integrity-checks.md)

## Usage Rule

- Keep feature-specific operational procedures in this folder.
- Promote cross-feature operational procedures into [`docs/runbooks/`](../../runbooks/README.md).
- Update [`docs/case-resolver/changelog.md`](../changelog.md) after incidents that result in a code or process change.
