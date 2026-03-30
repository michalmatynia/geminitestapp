---
owner: 'Prompt Exploder Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'overview'
scope: 'feature:prompt-exploder'
canonical: true
---

# Prompt Exploder Overview

Prompt Exploder is the admin workflow for turning large prompt text into structured, editable segments, validating parser quality, and sending the edited result back to upstream tools such as Image Studio and Case Resolver.

## Verified routes

- `/admin/prompt-exploder`
- `/admin/prompt-exploder/projects`
- `/admin/prompt-exploder/settings`

## Verified page structure

### Main workspace: `/admin/prompt-exploder`

The main page mounts three tabs:

- `Workspace`
- `Library`
- `Docs`

The workspace tab includes the current operational panels:

- Source Prompt
- Explosion Metrics
- Warnings
- Prompt Projects
- Segment Editor
- Bindings
- Reassembled Prompt
- Pattern Runtime
- Parser Tuning
- Benchmark Report

The page also owns:

- a docs-tooltips switch in the header
- return-to-source navigation for Image Studio or Case Resolver launches
- docs-backed tooltip enhancement via the shared documentation module

### Projects page: `/admin/prompt-exploder/projects`

The projects surface manages saved Prompt Exploder projects and lets operators open them back into the main workspace.

### Settings page: `/admin/prompt-exploder/settings`

The settings surface manages runtime, learning, benchmark, and AI routing configuration for Prompt Exploder.

## Key integrations

### Image Studio

- Prompt Exploder can be opened from Image Studio with `source=image-studio` and a `returnTo` target.
- Prompt output can be applied back into Image Studio.
- `/api/image-studio/prompt-extract` is the active extraction helper used in studio-side prompt flows.

### Case Resolver

- Prompt Exploder can be launched against Case Resolver content and apply content back to a bound Case Resolver document.
- Bridge payloads include transfer metadata such as `transferId`, `payloadVersion`, `checksum`, `status`, `createdAt`, and `expiresAt`.
- Case Resolver apply flows validate document/session alignment before accepting returned content.

### Prompt Validator / validation scopes

Prompt Exploder resolves prompt-validation stacks against the prompt-validator system.

Current canonical stack IDs:

- `prompt-exploder`
- `case-resolver-prompt-exploder`

Current runtime scopes used inside the parser/runtime layer:

- `prompt_exploder`
- `case_resolver_prompt_exploder`

Important distinction:

- user-facing stack IDs are hyphenated
- runtime scope enums are still snake_case
- legacy alias normalization is no longer part of the runtime contract

## Bridge contract status

Prompt Exploder bridge sources and targets are validated against canonical enums in the shared prompt-exploder contracts.

Common operational targets are:

- `image-studio`
- `case-resolver`
- `prompt-exploder`

The runtime no longer treats legacy aliases such as `studio` or `prompt_exploder` as canonical inputs.

## Storage and persistence keys

- Prompt Exploder settings: `prompt_exploder_settings`
- Prompt Exploder project library: `image_studio_prompt_exploder_library`
- Draft prompt bridge key: `prompt_exploder:draft_prompt`
- Apply-to-studio bridge key: `prompt_exploder:apply_to_studio_prompt`

## Verified supporting APIs

- `GET /api/prompt-runtime/health`
- `GET /api/prompt-runtime/health?reset=true`
- `POST /api/image-studio/prompt-extract`

## Docs tooltip system

The docs-tooltip workflow is active on:

- `/admin/prompt-exploder`
- `/admin/prompt-exploder/projects`
- `/admin/prompt-exploder/settings`

Canonical tooltip content lives in [`./tooltip-catalog.ts`](./tooltip-catalog.ts), and the docs tab renders the same shared catalog.

## Maintenance rule

When Prompt Exploder gains a new operator control or panel:

- update the maintained docs in this folder
- update tooltip mappings where needed
- keep route, stack-ID, and bridge-contract language aligned with the shared prompt-exploder contracts
