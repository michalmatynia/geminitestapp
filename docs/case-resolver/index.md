---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
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

This folder is the maintained documentation hub for Case Resolver.

## Canonical entry points

- Overview: [./overview.md](./overview.md)
- Architecture: [./architecture.md](./architecture.md)
- API reference: [./apis.md](./apis.md)
- Data model: [./data-model.md](./data-model.md)
- Performance: [./performance.md](./performance.md)
- Security: [./security.md](./security.md)
- FAQ: [./faq.md](./faq.md)
- Changelog: [./changelog.md](./changelog.md)
- Runbooks hub: [./runbooks/README.md](./runbooks/README.md)

## Verified operator route map

Current admin routes:

- `/admin/case-resolver`
- `/admin/case-resolver/cases`
- `/admin/case-resolver/capture`
- `/admin/case-resolver/categories`
- `/admin/case-resolver/identifiers`
- `/admin/case-resolver/preferences`
- `/admin/case-resolver/settings`
- `/admin/case-resolver/tags`

Use the overview for how those routes divide responsibilities.

## Verified API map

Feature-owned API routes under `/api/case-resolver/*` currently cover:

- assets upload and PDF extraction
- document export to PDF
- OCR job creation, retry, model listing, and observability

Important boundary:

- workspace persistence is not a `/api/case-resolver/*` contract
- the main workspace persists through shared settings-backed storage described in the architecture and data-model docs

## Runbooks

- [./runbooks/performance-stability.md](./runbooks/performance-stability.md)
- [./runbooks/ocr-failures-and-retry.md](./runbooks/ocr-failures-and-retry.md)
- [./runbooks/workspace-conflict-recovery.md](./runbooks/workspace-conflict-recovery.md)
- [./runbooks/case-list-degradation.md](./runbooks/case-list-degradation.md)
- [./runbooks/prompt-exploder-capture-handoff.md](./runbooks/prompt-exploder-capture-handoff.md)
- [./runbooks/release-and-rollback.md](./runbooks/release-and-rollback.md)
- [./runbooks/data-integrity-checks.md](./runbooks/data-integrity-checks.md)

## Related docs

- [../prompt-exploder/README.md](../prompt-exploder/README.md)
- [../ai-paths/overview.md](../ai-paths/overview.md)
- [../platform/architecture-guardrails.md](../platform/architecture-guardrails.md)
