---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'overview'
scope: 'feature:case-resolver'
canonical: true
related_components:
  - 'src/features/case-resolver/pages/AdminCaseResolverPage.tsx'
  - 'src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx'
  - 'src/features/case-resolver/hooks/useCaseResolverState.ts'
---

# Case Resolver Overview

Case Resolver is the admin legal/case workspace for document-centric case handling, OCR-assisted ingestion, metadata curation, and Prompt Exploder round-trips.

## Verified admin routes

- `/admin/case-resolver`
- `/admin/case-resolver/cases`
- `/admin/case-resolver/capture`
- `/admin/case-resolver/categories`
- `/admin/case-resolver/identifiers`
- `/admin/case-resolver/preferences`
- `/admin/case-resolver/settings`
- `/admin/case-resolver/tags`

## Route responsibilities

### Main workspace: `/admin/case-resolver`

The main route lazy-loads the Case Resolver workspace through `AdminCaseResolverPage` and the page/provider context stack. This is the document-first editing surface.

### Case inventory: `/admin/case-resolver/cases`

The cases route is the higher-volume list and create/edit surface. It owns:

- case creation and editing
- parent/folder assignment
- category, identifier, tag, and status metadata
- reference-case linking
- active document-version selection

### Supporting admin routes

- `capture`: capture mapping and review workflows
- `categories`, `identifiers`, `tags`: supporting metadata catalogs
- `preferences` and `settings`: operator-level defaults and workspace configuration

## Verified feature API surface

Case Resolver’s feature-owned API routes currently include:

- `POST /api/case-resolver/assets/upload`
- `POST /api/case-resolver/assets/extract-pdf`
- `POST /api/case-resolver/documents/export-pdf`
- `GET /api/case-resolver/ocr/models`
- `POST /api/case-resolver/ocr/jobs`
- `GET /api/case-resolver/ocr/jobs/{jobId}`
- `POST /api/case-resolver/ocr/jobs/{jobId}` for retry
- `GET /api/case-resolver/ocr/observability`

## Important persistence boundary

The main Case Resolver workspace does not persist through a dedicated `/api/case-resolver/workspace` route family.

Instead, the workspace uses shared settings-backed persistence with revision checks and sidecar keys, as documented in:

- [./architecture.md](./architecture.md)
- [./data-model.md](./data-model.md)

This is the main distinction operators and maintainers need to remember when reading the API reference.

## Core user flows

1. Create and organize cases and folders.
2. Upload case assets and extract source text from PDFs.
3. Run OCR jobs, retry failures, and inspect OCR observability.
4. Edit document content with conflict-aware persistence.
5. Export document content to PDF.
6. Round-trip content through Prompt Exploder and, when needed, Case Resolver Capture.

## Reliability characteristics

- revision-aware workspace persistence
- conflict recovery and retry flows
- queued OCR where available, with inline fallback behavior
- OCR retry classification and observability
- guarded Prompt Exploder apply flows bound to document/session context

## Integrations

- **Prompt Exploder**: Case Resolver can send bound content to Prompt Exploder and accept structured content back with transfer metadata and capture-review paths.
- **OCR runtime**: OCR jobs and observability are first-class operational surfaces under `/api/case-resolver/ocr/*`.
- **Shared settings persistence**: workspace state lives on shared settings infrastructure, not a feature-only persistence service.

## Related docs

- [./apis.md](./apis.md)
- [./architecture.md](./architecture.md)
- [./runbooks/prompt-exploder-capture-handoff.md](./runbooks/prompt-exploder-capture-handoff.md)
