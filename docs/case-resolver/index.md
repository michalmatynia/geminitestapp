---
owner: 'Case Resolver Team'
last_reviewed: '2026-04-17'
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

## Open This Hub When

- you need to know which Case Resolver doc covers architecture, APIs, data model, or operations
- you are working in the Case Resolver admin routes or `/api/case-resolver/*`
- you need the right runbook for OCR, workspace conflicts, list degradation, or releases
- you need to distinguish stable feature docs from operational runbooks or changelog history

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

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| What is Case Resolver and how do the operator routes divide responsibility? | [./overview.md](./overview.md) |
| How is the feature wired internally? | [./architecture.md](./architecture.md) |
| Which APIs does the feature own? | [./apis.md](./apis.md) |
| What are the main persisted models and state boundaries? | [./data-model.md](./data-model.md) |
| How should I reason about performance constraints? | [./performance.md](./performance.md) |
| What are the security boundaries? | [./security.md](./security.md) |
| What operational recovery or release procedure do I need? | [./runbooks/README.md](./runbooks/README.md) |
| What changed recently, as history rather than current policy? | [./changelog.md](./changelog.md) |

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

Use the runbooks for operational response. Use the architecture, APIs, and
data-model docs for stable feature behavior.

## Related docs

- [../prompt-exploder/README.md](../prompt-exploder/README.md)
- [../ai-paths/overview.md](../ai-paths/overview.md)
- [../platform/architecture-guardrails.md](../platform/architecture-guardrails.md)
