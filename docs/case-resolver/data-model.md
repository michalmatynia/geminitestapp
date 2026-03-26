---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver/settings.ts'
  - 'src/shared/contracts/case-resolver.ts'
  - 'src/features/case-resolver/server/ocr-runtime-job-store.ts'
  - 'src/features/case-resolver/utils/workspace-settings-persistence-helpers.ts'
---

# Case Resolver Data Model

## Settings Keys

Defined in `src/features/case-resolver/settings.constants.ts` and `src/features/case-resolver/utils/workspace-settings-persistence-helpers.ts`:

- `case_resolver_workspace_v2`
- `case_resolver_workspace_v2_history`
- `case_resolver_workspace_v2_documents`
- `case_resolver_tags_v1`
- `case_resolver_identifiers_v1`
- `case_resolver_categories_v1`
- `case_resolver_settings_v1`
- `case_resolver_default_document_format_v1`

The main workspace record is persisted separately from detached document and history payloads.
The active save/fetch path uses `/api/settings` with light/heavy scopes for the primary
workspace record plus dedicated keys for documents/history hydration.

## Workspace Shape

Primary workspace entity (`CaseResolverWorkspace`) includes:

- `version`
- `workspaceRevision`
- `lastMutationId`
- `lastMutationAt`
- `folders`
- `folderRecords`
- `folderTimestamps`
- `files`
- `assets`
- `relationGraph`
- `activeFileId`

Default workspace constructor: `createDefaultCaseResolverWorkspace()` in `settings.ts`.

Persistence notes:

- primary workspace record: `case_resolver_workspace_v2`
- detached document payloads: `case_resolver_workspace_v2_documents`
- detached history payloads: `case_resolver_workspace_v2_history`
- save path compacts and strips detached content before persisting the primary workspace record

## File Entity (Case/Document/Scan)

Core fields (from normalization path in `createCaseResolverFile`):

- identity and hierarchy: `id`, `fileType`, `name`, `folder`, `parentCaseId`
- links: `referenceCaseIds`, `relatedFileIds`
- content model: `originalDocumentContent`, `explodedDocumentContent`, `activeDocumentVersion`, `documentContent*`
- OCR scan fields: `scanSlots`, `scanOcrModel`, `scanOcrPrompt`
- metadata: `tagId`, `caseIdentifierId`, `categoryId`, `isLocked`
- timeline: `createdAt`, `updatedAt`, `documentHistory`

## Relation Graph

Relation graph is constructed/sanitized through:

- `src/features/case-resolver/settings-relation-graph.ts`
- `buildCaseResolverRelationGraph(...)`

Key metadata includes:

- node entity type and labels
- source file linkage
- structural vs semantic edges
- relation type labels

## OCR Runtime Job Record

Defined in `ocr-runtime-job-store.ts`:

- identity: `id`, `filepath`
- execution state: `status`, `dispatchMode`, `startedAt`, `finishedAt`
- request lineage: `model`, `prompt`, `retryOfJobId`, `correlationId`
- retry metadata: `attemptsMade`, `maxAttempts`
- result surface: `resultText`, `errorMessage`, `errorCategory`, `retryableError`
- timeline: `createdAt`, `updatedAt`

## Normalization Rules

1. All persisted workspace data is normalized before save.
2. Folder paths are sanitized and normalized to stable slash-separated form.
3. Invalid or duplicate IDs are removed during normalization.
4. OCR job records are parsed defensively and defaulted when fields are missing.
5. Inline node-file snapshot text is not allowed inside persisted workspace assets.
