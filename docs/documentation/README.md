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

- `36` markdown files directly under `docs/`
- `1522` total files under `docs/`
- `1055` files under `docs/metrics/` alone

The main problem is not volume by itself. The problem is mixed document classes
at the same level: entrypoints, policies, feature docs, dated plans, runbooks,
decision records, and generated artifacts all compete for the same surface.

Migration backlog:

- [`docs/documentation/root-doc-migration-backlog.md`](./root-doc-migration-backlog.md)

## Validation

Use the structure gate before or after docs changes:

```bash
npm run docs:structure:check
```

If a docs change affects machine-readable compatibility mirrors, sync them from
the canonical sources first when mirror pairs are still declared:

```bash
npm run docs:structure:sync-mirrors
```

This check currently enforces:

- root-level docs allowlist compliance
- required frontmatter on canonical docs
- existence of the main governance and hub docs
- superseded root docs stay short and explicitly marked `canonical: false`
- canonical docs and configured reference guides do not point at root
  compatibility stubs, except for explicit migration inventory exemptions
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
- a small number of legacy docs pending migration

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

### 6. Migrate with compatibility stubs when needed

When moving a legacy root doc to its canonical folder:

- move the full content to the new canonical path
- update the nearest hub page
- leave a short root stub at the old path when existing links, scripts, or human
  habits would otherwise break abruptly
- mark the root stub as `superseded` and point to the new canonical location
- do not update canonical docs to point back at the root stub; link to the
  canonical destination instead

For non-markdown artifacts such as JSON manifests or exception registers:

- create or keep the canonical file in the structured folder
- if an old root path must remain temporarily, treat it as a compatibility copy
  rather than the source of truth
- keep compatibility copies byte-identical to the canonical file until they are
  removed
- update any manifest or script that should learn the canonical path

## Canonical Taxonomy

| Class | Canonical Location | Use For | Notes |
| --- | --- | --- | --- |
| Repo entrypoints / governance | `docs/` | root index, owners, agent overlays, documentation system, legacy entrypoints pending migration | root is allowlisted, not general-purpose |
| Documentation system | `docs/documentation/` | docs IA, standards, migration plan | governs doc structure itself |
| Cross-cutting platform docs | `docs/platform/` | architecture, shared patterns, handbook, shared API policy | new platform docs go here |
| Feature docs | `docs/<feature>/` | feature overview, architecture, APIs, examples, local runbooks | prefer nearest owner |
| Cross-feature runbooks | `docs/runbooks/` | repo-wide or multi-feature operational procedures | feature-local runbooks stay inside feature dirs |
| Cross-feature plans | `docs/plans/` | implementation plans, closeouts, refactor waves | feature-local plans can live in feature subfolders |
| Cross-feature decisions | `docs/decisions/` | ADR-style records, exception registers, matrices | date-stamped records belong here |
| Machine-readable decision companions | `docs/decisions/` | exception register JSON, decision manifests tied to one owning record | keep root copies only as temporary compatibility mirrors |
| Migration execution | `docs/migrations/` | wave execution, verification, reports | keep execution artifacts together |
| Generated metrics | `docs/metrics/` | scans, baselines, trend outputs | generated only |
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
4. Update the nearest index or hub page.
5. If the new doc supersedes an older one, mark that explicitly.
6. If the doc is generated, update the generator or source contract when needed.
7. If a machine-readable compatibility copy exists, update it in the same change.
8. Prefer `npm run docs:structure:sync-mirrors` over manual copy/paste when the
   manifest already defines the compatibility mirror pair.
9. Link to canonical destinations, not root compatibility stubs, unless a
   migration inventory doc explicitly needs to record the legacy path.

After the change:

1. Check for broken links or duplicate canonical docs.
2. Ensure the new doc is discoverable from at least one index page.
3. Run `npm run docs:structure:check`.
4. Leave a clear breadcrumb in the final summary if legacy docs still need
   migration.

## Structuralization Plan

### Phase 0: Governance and scaffolding

- create canonical folders for platform docs, plans, decisions, runbooks, and
  documentation governance
- update `docs/README.md`, `docs/AGENTS.md`, and `docs/OWNERS.md`
- stop adding new unclassified docs to the root

### Phase 1: Stop root growth

- all new cross-cutting plans move to `docs/plans/`
- all new cross-cutting decisions move to `docs/decisions/`
- all new cross-cutting runbooks move to `docs/runbooks/`
- all new stable shared guides move to `docs/platform/`

### Phase 2: Opportunistic migration

Migrate legacy root docs when they are touched for real work:

- platform guides such as `DEVELOPER_HANDBOOK.md` and `API_CACHING.md`
- root-level plans and migration plans
- root-level runbooks
- duplicated date-stamped root docs

Do not bulk-move everything in one refactor unless link impact is understood.
Use compatibility stubs when gradual migration is safer than a hard cut.

### Phase 3: Stronger validation

- implemented: `npm run docs:structure:check` for root allowlist compliance,
  canonical frontmatter, and required hub-doc presence
- implemented: `.github/workflows/docs-structure.yml` to run the structure gate
  on docs-related changes
- implemented: root compatibility stub reference detection for canonical docs and
  configured repo reference guides
- next: expand validation to detect more unindexed docs and deeper feature-level
  metadata gaps where practical

## Definition of Done for a Docs Change

A docs change is structurally complete when:

1. the doc is in the right folder
2. metadata is present
3. the nearest index is updated
4. generated docs were changed via the correct path
5. superseded docs are called out instead of silently drifting
6. canonical docs point at canonical destinations, not root compatibility stubs
