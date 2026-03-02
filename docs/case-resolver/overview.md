---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
related_components:
  - 'src/features/case-resolver/pages/AdminCaseResolverPage.tsx'
  - 'src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx'
  - 'src/features/case-resolver/hooks/useCaseResolverState.ts'
---

# Case Resolver Overview

## Purpose

Case Resolver is the legal/case workspace module for:

- Managing hierarchical case files and related metadata.
- Capturing and editing content in document-first workflows.
- Uploading source assets (images/PDFs) and extracting OCR text.
- Maintaining relation graphs and context metadata for downstream workflows.

## Core User Flows

1. Create, edit, and organize cases/folders.
2. Upload scans/documents and run OCR.
3. Open case content in editor, save with conflict-safe persistence.
4. Filter/search/sort high-volume case lists.
5. Export documents to PDF.
6. Round-trip content through Prompt Exploder and optionally apply Case Resolver Capture mapping.

## Runtime Guarantees

- Workspace persistence uses revisioned optimistic concurrency (CAS-like behavior).
- Save conflicts return server state and support client-side retry flows.
- OCR jobs run via queue where available, with inline fallback if Redis is unavailable.
- OCR uses timeout + retryable classification + retry attempts.
- Prompt Exploder transfers are bound to file/session context and guarded against wrong-target apply.

## Current Health Targets

- Save latency `p95 < 700ms`.
- Conflict recovery success `>= 99%`.
- Case list interaction `p95 < 100ms`.
- OCR completion success `>= 98.5%` (including retries).

## Entry Points

- UI pages: `src/features/case-resolver/pages/*`
- State orchestration: `src/features/case-resolver/hooks/useCaseResolverState.ts`
- Persistence/telemetry: `src/features/case-resolver/workspace-persistence.ts`
- APIs: `src/app/api/case-resolver/*`
- OCR worker: `src/features/case-resolver/workers/caseResolverOcrQueue.ts`
