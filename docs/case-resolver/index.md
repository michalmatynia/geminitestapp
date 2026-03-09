---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
doc_type: 'index'
scope: 'feature:case-resolver'
canonical: true
related_components:
  - 'src/features/case-resolver'
  - 'src/app/api/case-resolver'
  - 'src/features/case-resolver/workers/caseResolverOcrQueue.ts'
---

# Case Resolver Documentation

This section is the centralized source of truth for the Case Resolver feature.

## Start Here

- [Overview](./overview.md)
- [Architecture](./architecture.md)
- [Data Model](./data-model.md)
- [APIs](./apis.md)
- [Performance](./performance.md)
- [Security](./security.md)
- [FAQ](./faq.md)
- [Changelog](./changelog.md)

## Runbooks

- [Performance and Stability](./runbooks/performance-stability.md)
- [OCR Failures and Retry](./runbooks/ocr-failures-and-retry.md)
- [Workspace Conflict Recovery](./runbooks/workspace-conflict-recovery.md)
- [Case List Degradation](./runbooks/case-list-degradation.md)
- [Prompt Exploder Capture Handoff](./runbooks/prompt-exploder-capture-handoff.md)
- [Release and Rollback](./runbooks/release-and-rollback.md)
- [Data Integrity Checks](./runbooks/data-integrity-checks.md)

## Related Platform Docs

- [Developer Handbook](../platform/developer-handbook.md)
- [API Caching](../platform/api-caching.md)
- [Architecture Guardrails](../platform/architecture-guardrails.md)
- [AI Paths Docs](../AI_PATHS.md)

## Ownership and Review

- Primary owner: Case Resolver Team
- Secondary owner: Platform/Operations Team
- Review cadence: monthly, and after every incident with production impact
- Change policy: all Case Resolver API/schema/queue changes must update docs in this section
