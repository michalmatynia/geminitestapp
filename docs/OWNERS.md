---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'repo'
canonical: true
---

# Documentation Owners

## Ownership by Scope

| Scope | Primary Owner | Secondary Owner | Review Cadence |
| --- | --- | --- | --- |
| Repo entrypoints and governance | Platform Team | Feature Leads | Quarterly |
| Cross-cutting platform docs | Platform Team | Frontend/Backend Leads | Quarterly |
| Feature docs | Owning Feature Team | Platform Team | Monthly or major release |
| Cross-feature runbooks | Feature Team On-Call | Platform Operations | Monthly + post-incident |
| Cross-feature plans / closeouts | Originating Team | Platform Team | At milestone boundaries |
| Cross-feature decisions / exception registers | Originating Team | Platform Team | When superseded or quarterly |
| Generated docs / artifacts | Owning generator script team | Platform Team | On generator change |

## Feature Areas

| Area | Primary Owner | Secondary Owner | Review Cadence |
| --- | --- | --- | --- |
| Case Resolver | Case Resolver Team | Platform Operations | Monthly + post-incident |
| AI Paths | AI Paths Team | Platform Operations | Monthly |
| Prompt Exploder | Prompt Exploder Team | Platform Operations | Monthly |
| Kangur | Kangur Team | Platform Team | Monthly |
| Validator | Products / Platform Team | Platform Team | Monthly |

## Metadata Contract

All new or substantially rewritten docs should include:

- `owner`
- `last_reviewed`
- `status`
- `doc_type`
- `scope`

Use these when relevant:

- `canonical`
- `generated_from`
- `supersedes`
- `related_components`

Missing metadata is documentation debt and should be fixed in the same change
when the doc is touched meaningfully.

## Structural Update Rules

1. Every doc change must follow [`docs/documentation/README.md`](./documentation/README.md).
2. Every new doc must update its nearest index or hub page.
3. New dated docs belong in `docs/plans/`, `docs/decisions/`, feature-specific
   subfolders, or `docs/migrations/` when they are migration execution records.
4. New docs should not be added directly under `docs/` unless they are root
   entrypoints, governance docs, or agent overlays.
5. Generated docs should be updated through their scripts whenever possible, not
   by hand-editing outputs.
6. Machine-readable companions should live beside their canonical doc, and any
   retained compatibility copy must be updated in the same change.

## AI Update Protocol

When an AI adds or rewrites docs, it should:

1. Classify the scope and doc type before creating the file.
2. Place the file in the canonical folder for that class of document.
3. Update metadata and ownership fields.
4. Update the relevant hub page and cross-links.
5. Mark superseded docs explicitly instead of leaving ambiguous duplicates.
6. If a JSON or other machine-readable companion exists, update the canonical
   file first and keep any compatibility copy in sync.
