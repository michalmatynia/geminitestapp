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
3. Every `docs/**/` directory with markdown content must have a `README.md` or
   `index.md` hub page.
4. Every child docs hub must be linked from its immediate parent hub unless the
   structure manifest explicitly exempts it.
5. Every `canonical: true` docs file must be listed in `requiredCanonicalDocs`
   in the structure manifest.
6. Every docs hub must follow its declared indexing policy: complete
   or curated.
7. Hand-written stable entry points surfaced by curated hubs should be canonical
   docs with metadata, not untyped markdown files.
8. Every artifact-only docs directory must either have a local hub or be
   declared in the structure manifest and linked from an owning markdown doc.
9. New dated docs belong in `docs/plans/`, `docs/decisions/`, feature-specific
   subfolders, or `docs/migrations/` when they are migration execution records.
10. New docs should not be added directly under `docs/` unless they are root
   entrypoints, governance docs, or agent overlays.
11. Generated docs should be updated through their scripts whenever possible, not
   by hand-editing outputs.
12. Machine-readable companions should live beside their canonical doc, and any
   retained compatibility copy must be updated in the same change.
13. Obsolete root aliases should be removed once repo-internal consumers are
   updated; do not keep partial shadow copies of canonical docs.
14. Manifest-defined compatibility mirrors should be synced by script when
   possible, not maintained by ad hoc manual copying.
15. Compatibility mirrors should be deleted once repo-internal consumers are
   removed.

## AI Update Protocol

When an AI adds or rewrites docs, it should:

1. Classify the scope and doc type before creating the file.
2. Place the file in the canonical folder for that class of document.
3. Update metadata and ownership fields.
4. If the doc is canonical, register it in `requiredCanonicalDocs`.
5. Update the relevant hub page and cross-links.
6. Add a hub page in the same patch if the change creates or expands a
   markdown-bearing docs directory.
7. If the change adds a child docs hub, link it from the immediate parent hub in
   the same patch unless the structure manifest documents an exemption.
8. Mark superseded docs explicitly instead of leaving ambiguous duplicates.
9. If a JSON or other machine-readable companion exists, update the canonical
   file first and keep any compatibility copy in sync.
10. Remove obsolete root aliases once repo-internal consumers are updated; do
    not keep them as a permanent parallel docs surface.
11. If the mirror pair is declared in the docs structure manifest, run
   `npm run docs:structure:sync-mirrors`.
12. Canonical docs should link to canonical destinations, not obsolete root
    aliases.
13. Keep the owning docs hub aligned with its indexing policy when the
    directory’s active docs surface changes.
14. If a docs directory contains only non-markdown artifacts, declare it in the
    manifest and link it from an owning markdown doc unless you are adding a
    local hub.
15. If the task is metadata cleanup, run `npm run docs:structure:audit:frontmatter`
    first and normalize one structural slice at a time.
16. For generated markdown under `docs/metrics/`, prefer
    `npm run docs:metrics:normalize-frontmatter` so frontmatter and canonical
    registration stay aligned with the generated metrics policy.
17. Treat `docs/metrics/**/README.md`, `docs/metrics/**/-latest.md`, and
    `docs/metrics/route-hotspots.md` as the canonical generated metrics surface;
    timestamped history snapshots are optional generated records, not canonical
    docs, and should be written only when a task explicitly needs them.
18. If a repo script owns markdown generation for a canonical docs surface,
    keep frontmatter in the generator itself through the shared helpers in
    `scripts/docs/` so regeneration does not strip metadata.
19. Managed generated-doc surfaces should match their shared-helper metadata
    contract under `npm run docs:structure:check`; change the helper first, not
    the generated file by hand.
20. If a historical docs folder no longer has live repo consumers, remove it
    instead of treating it as a permanent archive by default.
21. When a later dated plan or decision becomes the enforced baseline, delete
    older superseded variants after updating hubs, manifests, and tooling.
