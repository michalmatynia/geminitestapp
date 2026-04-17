---
owner: 'Case Resolver Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:case-resolver'
canonical: true
---

# Case Resolver Runbooks

This folder contains the operational runbooks for the Case Resolver feature.
Use these docs for incident response, operational diagnosis, and release-safe
change handling.

## Open This Hub When

- the issue is operational and specific to Case Resolver rather than cross-feature platform behavior
- you need the exact runbook for OCR, workspace conflicts, case-list degradation, release rollback, or data integrity
- you need to know whether a runbook belongs here or under [`docs/runbooks/`](../../runbooks/README.md)

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

## Which Runbook To Use

| If you need to... | Open |
| --- | --- |
| diagnose performance or stability degradation | [`performance-stability.md`](./performance-stability.md) |
| recover from OCR failures or retry issues | [`ocr-failures-and-retry.md`](./ocr-failures-and-retry.md) |
| recover from workspace persistence or conflict issues | [`workspace-conflict-recovery.md`](./workspace-conflict-recovery.md) |
| respond to degraded case-list behavior | [`case-list-degradation.md`](./case-list-degradation.md) |
| troubleshoot Prompt Exploder capture handoff | [`prompt-exploder-capture-handoff.md`](./prompt-exploder-capture-handoff.md) |
| perform release-safe rollout or rollback work | [`release-and-rollback.md`](./release-and-rollback.md) |
| run integrity verification | [`data-integrity-checks.md`](./data-integrity-checks.md) |

## Usage Rule

- Keep feature-specific operational procedures in this folder.
- Promote cross-feature operational procedures into [`docs/runbooks/`](../../runbooks/README.md).
- Update [`docs/case-resolver/changelog.md`](../changelog.md) after incidents that result in a code or process change.
