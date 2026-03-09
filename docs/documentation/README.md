---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'repo'
canonical: true
---

# Documentation Architecture

This file defines how documentation in this repository should be organized going
forward. It is the canonical placement and maintenance guide for humans and AI
agents.

## Why This Exists

The docs tree has grown large and mixed:

- `5` markdown files directly under `docs/`
- `1564` total files under `docs/`
- `1078` files under `docs/metrics/` alone

The main problem is not volume by itself. The problem is mixed document classes
at the same level: entrypoints, policies, feature docs, dated plans, runbooks,
decision records, and generated artifacts all compete for the same surface.

## Validation

Use the structure gate before or after docs changes:

```bash
npm run docs:structure:check
```

Use the frontmatter audit when you want a non-gating view of metadata debt:

```bash
npm run docs:structure:audit:frontmatter
```

If you touch generated markdown under `docs/metrics/`, normalize it structurally
through the metrics normalizer instead of hand-editing hundreds of snapshots:

```bash
npm run docs:metrics:normalize-frontmatter
```

If a docs change affects machine-readable compatibility mirrors, sync them from
the canonical sources first when mirror pairs are still declared:

```bash
npm run docs:structure:sync-mirrors
```

This check currently enforces:

- root-level docs allowlist compliance
- docs directories with markdown content expose a README/index hub
- parent hubs reference their child docs directories
- every `canonical: true` docs file is registered in `requiredCanonicalDocs`
- required frontmatter on canonical docs
- existence of the main governance and hub docs
- canonical docs and configured reference guides do not point at obsolete root
  aliases
- artifact-only docs directories are explicitly declared and linked from an
  owning markdown doc
- docs hubs follow their declared index policies
- declared compatibility mirrors, when present, stay byte-identical to their canonical source

The GitHub Actions workflow `.github/workflows/docs-structure.yml` runs the same
check on docs-related changes.

## Core Principles

### 1. Nearest-owner first

Put docs as close as possible to the team or feature that owns them.

- Feature-specific docs go under `docs/<feature>/`
- Cross-feature docs go in shared class folders such as `docs/platform/`,
  `docs/runbooks/`, `docs/plans/`, or `docs/decisions/`

### 2. Doc-type second

After choosing the owner scope, choose the document class:

- index
- overview
- architecture
- reference
- runbook
- plan
- decision
- generated artifact

### 3. Root stays narrow

The root `docs/` directory is for:

- repo entrypoints
- governance docs
- agent overlays

Do not add new dated or feature-specific files directly under `docs/`.

### 4. Generated docs stay generated

Metrics, inventories, semantic grammars, manifests, catalogs, and reports
produced by scripts belong in generated areas and should be updated through the
relevant scripts when possible.

Machine-readable companions that are part of a decision or policy surface should
live beside that canonical doc. Compatibility copies should be temporary and
removed once internal consumers are gone.

### 5. No orphan docs

Any new doc must update its nearest hub page. A doc that is not discoverable
from an index is effectively documentation debt.

### 5a. No orphan directories

Any `docs/**/` directory that contains markdown should expose a `README.md` or
`index.md` hub page, even when the folder is generated or mostly historical.

### 5aa. Child hubs must be discoverable

If a docs folder has its own hub, the immediate parent hub should link to that
child directory unless the structure manifest explicitly exempts it.

### 5b. Docs hubs need an index policy

Each docs hub should follow one of two models:

- complete: enumerate every direct markdown file in that folder
- curated: link the stable entry points and state clearly that the hub is
  curated rather than exhaustive

The docs structure manifest defines which model applies per docs folder, and the
checker validates those expectations.

Hand-written stable entry points exposed by curated hubs should carry
frontmatter and be registered as canonical docs. Generated latest reports can be
tracked through the frontmatter audit until their generators are upgraded.
Generated metrics markdown under `docs/metrics/` should be normalized with
`npm run docs:metrics:normalize-frontmatter`, which keeps frontmatter and the
canonical metrics manifest entries aligned in one pass.
If a script owns a canonical generated markdown surface, update the generator to
preserve frontmatter at write time through the shared helpers in `scripts/docs/`
instead of depending on a later cleanup pass.
Managed generated-doc surfaces should also stay aligned with those helper rules
under `npm run docs:structure:check`; do not fork their metadata ad hoc in the
generated file body.

### 5c. Artifact-only directories need ownership

If a `docs/**/` directory contains only non-markdown artifacts such as JSON,
CSV, or screenshots, it may remain hubless only when:

- it is declared in the docs structure manifest as an artifact bucket
- an owning markdown doc links to it or to its canonical artifacts

Silent artifact buckets are documentation debt.

### 6. Remove root aliases after migration

When moving a legacy root doc to its canonical folder:

- move the full content to the new canonical path
- update the nearest hub page
- update repo-internal links, registries, and scripts to the canonical path in
  the same patch when practical
- delete the old root alias once repo-internal consumers are updated
- if an exceptional temporary alias is unavoidable, keep it short, mark it
  `superseded`, and remove it quickly

For non-markdown artifacts such as JSON manifests or exception registers:

- create or keep the canonical file in the structured folder
- if an old root path must remain temporarily, treat it as a compatibility copy
  rather than the source of truth
- keep compatibility copies byte-identical to the canonical file until they are
  removed
- update any manifest or script that should learn the canonical path
- if an artifact-only directory has no local README, declare it in the manifest
  and link it from an owning markdown doc

## Canonical Taxonomy

| Class | Canonical Location | Use For | Notes |
| --- | --- | --- | --- |
| Repo entrypoints / governance | `docs/` | root index, owners, agent overlays, documentation system | root is allowlisted, not general-purpose |
| Documentation system | `docs/documentation/` | docs IA, standards, migration plan | governs doc structure itself |
| Cross-cutting platform docs | `docs/platform/` | architecture, shared patterns, handbook, shared API policy | new platform docs go here |
| Feature docs | `docs/<feature>/` | feature overview, architecture, APIs, examples, local runbooks | prefer nearest owner |
| Cross-feature runbooks | `docs/runbooks/` | repo-wide or multi-feature operational procedures | feature-local runbooks stay inside feature dirs |
| Cross-feature plans | `docs/plans/` | implementation plans, closeouts, refactor waves | feature-local plans can live in feature subfolders |
| Cross-feature decisions | `docs/decisions/` | ADR-style records, exception registers, matrices | date-stamped records belong here |
| Machine-readable decision companions | `docs/decisions/` | exception register JSON, decision manifests tied to one owning record | keep root copies only as temporary compatibility mirrors |
| Migration execution | `docs/migrations/` | wave execution, verification, reports | keep execution artifacts together |
| Generated metrics | `docs/metrics/` | scans, baselines, trend outputs | generated only |
| Artifact-only generated buckets | nested under the owning docs area | JSON schemas, reports, CSV exports, screenshots, and other non-markdown outputs | either add a local hub or declare the bucket in the manifest with an owning markdown reference |
| Historical program folders | `docs/<program>/` | legacy or ongoing cross-feature program histories such as application-improvements or ui-consolidation | still require a hub page; not the default location for new shared docs |
| Temporary TODO backlogs | `docs/todo/` | short-lived debt queues and work-in-progress checklists | promote durable work into canonical folders |
| Feature-generated references | feature-specific generated folders | semantic grammars, manifests, catalogs | keep near the feature that owns them |

## Placement Decision Tree

When adding or rewriting docs:

1. Is it generated?
   - If yes, place it in the feature’s generated area or `docs/metrics/`.
2. Is it feature-specific?
   - If yes, place it under that feature’s folder.
3. Is it cross-cutting but operational?
   - Use `docs/runbooks/`.
4. Is it cross-cutting and forward-looking?
   - Use `docs/plans/`.
5. Is it a decision, exception register, or matrix?
   - Use `docs/decisions/`.
6. Is it a machine-readable companion to a decision or policy doc?
   - Put it beside that canonical doc unless compatibility requires a mirror.
7. Is it a stable shared platform guide?
   - Use `docs/platform/`.
8. Is it a repo entrypoint or governance doc?
   - Use the root `docs/` allowlist.

If two locations seem possible, prefer the one with the clearest owner and the
shortest path from the code being changed.

## Naming Rules

- Stable canonical docs use stable names: `overview.md`, `architecture.md`,
  `apis.md`, `reference.md`, `README.md`, `security.md`.
- Date-stamped names are allowed for plans, decisions, closeouts, and migration
  execution records.
- Do not create new root-level date-stamped files under `docs/`.
- Prefer consistent lowercase kebab-case for non-index files.

## Frontmatter Contract

All new or substantially rewritten docs should include:

```yaml
---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'architecture'
scope: 'repo'
canonical: true
---
```

Recommended values:

- `status`: `draft`, `active`, `generated`, `superseded`, `archived`
- `doc_type`: `index`, `overview`, `architecture`, `reference`, `runbook`,
  `plan`, `decision`, `policy`, `generated`, `agent-guide`
- `scope`: `repo`, `platform`, `cross-feature`, `feature:<name>`, `generated`

Optional fields:

- `related_components`
- `generated_from`
- `supersedes`

## AI Documentation Workflow

Before editing docs:

1. Read `docs/README.md`.
2. Read this file.
3. Read the nearest feature index or relevant canonical doc.
4. Verify whether the target doc is hand-written or generated.

When making the change:

1. Update existing canonical docs before creating new ones.
2. If a new doc is needed, place it using the taxonomy above.
3. Add metadata.
4. If the doc is canonical, add it to `requiredCanonicalDocs` in the structure manifest.
5. Update the nearest index or hub page.
6. If the change creates or expands a markdown-bearing `docs/**/` directory,
   make sure that folder has a `README.md` or `index.md`.
7. If the change creates a child docs hub, link it from the immediate parent
   hub in the same patch unless the manifest documents an exemption.
8. If the new doc supersedes an older one, mark that explicitly.
9. If the doc is generated, update the generator or source contract when needed.
10. If a machine-readable compatibility copy exists, update it in the same change.
11. Prefer `npm run docs:structure:sync-mirrors` over manual copy/paste when the
   manifest already defines the compatibility mirror pair.
12. Link to canonical destinations, not obsolete root aliases.
13. Keep the folder hub aligned with its declared index policy: complete hubs
    enumerate direct docs; curated hubs expose the stable entry points.
14. If the change creates an artifact-only docs directory, either add a local
    hub or declare an artifact directory policy plus owning markdown reference in
    the same patch.
15. If the task is metadata normalization rather than a targeted docs edit, run
    `npm run docs:structure:audit:frontmatter` first and normalize one
    structural slice at a time.

After the change:

1. Check for broken links or duplicate canonical docs.
2. Ensure the new doc is discoverable from at least one index page.
3. Run `npm run docs:structure:check`.
4. Note any remaining invalid, finished, or duplicate docs that still need
   pruning.

## Steady-State Maintenance

The structural migration is complete. The ongoing model is:

- new cross-cutting plans go to `docs/plans/`
- new cross-cutting decisions go to `docs/decisions/`
- new cross-cutting runbooks go to `docs/runbooks/`
- new stable shared guides go to `docs/platform/`
- root `docs/` stays limited to repo entrypoints, governance, and agent overlays
- obsolete root aliases should be removed in the same patch that updates their
  remaining repo-internal consumers
- finished or incompatible docs should be pruned instead of left as dormant
  clutter

Validation already enforces:

- `npm run docs:structure:check` for root allowlist compliance,
  canonical frontmatter, required hub-doc presence, and recursive hub coverage
- manifest-driven docs-hub index policies for complete versus
  curated folder indexes
- manifest-driven artifact-bucket policies for non-markdown docs
  directories
- parent-hub discoverability checks so child docs hubs cannot stay
  structurally hidden from their immediate parent index
- canonical-doc registration checks so `requiredCanonicalDocs`
  stays exhaustive for active canonical docs
- `.github/workflows/docs-structure.yml` to run the structure gate
  on docs-related changes
- obsolete-root-alias reference detection for canonical docs and configured repo
  reference guides
- next: expand validation to detect more unindexed docs and deeper feature-level
  metadata gaps where practical

## Definition of Done for a Docs Change

A docs change is structurally complete when:

1. the doc is in the right folder
2. metadata is present
3. the nearest index is updated
4. any markdown-bearing docs folder has a hub page
5. generated docs were changed via the correct path
6. superseded docs are called out instead of silently drifting
7. canonical docs point at canonical destinations, not obsolete root aliases
8. the nearest docs hub still satisfies its declared indexing policy
9. any artifact-only docs directory introduced by the change is explicitly owned
10. any new child docs hub is discoverable from its immediate parent hub
11. any canonical doc touched by the change remains registered in `requiredCanonicalDocs`
