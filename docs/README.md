---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'index'
scope: 'repo'
canonical: true
---

# Central Documentation Index

This is the top-level documentation index for the repository. It should stay
thin: point people to the right hubs, explain the documentation structure, and
avoid becoming another dumping ground.

## Start Here

- Agent guide: [`docs/AGENTS.md`](./AGENTS.md)
- Deep architecture reference: [`GEMINI.md`](../GEMINI.md)
- Documentation system and placement rules:
  [`docs/documentation/README.md`](./documentation/README.md)

## Agent Overlays

- Claude overlay: [`docs/CLAUDE.md`](./CLAUDE.md)
- Copilot overlay: [`docs/COPILOT.md`](./COPILOT.md)

## Canonical Top-Level Structure

- Repo entrypoints and governance stay at `docs/`
- Cross-cutting platform docs belong in [`docs/platform/`](./platform/README.md)
- Feature-owned docs belong in feature folders such as
  [`docs/case-resolver/`](./case-resolver/index.md),
  [`docs/validator/`](./validator/README.md), and
  [`docs/kangur/`](./kangur/README.md)
- Cross-feature runbooks belong in [`docs/runbooks/`](./runbooks/README.md)
- Cross-feature plans and closeouts belong in [`docs/plans/`](./plans/README.md)
- Cross-feature decisions and exception registers belong in
  [`docs/decisions/`](./decisions/README.md)
- Migration execution docs stay in [`docs/migrations/`](./migrations/)
- Generated metrics stay in [`docs/metrics/`](./metrics/)

## Major Feature Entry Points

- AI Paths: canonical feature docs under
  [`docs/ai-paths/README.md`](./ai-paths/README.md)
- Case Resolver: [`docs/case-resolver/index.md`](./case-resolver/index.md)
- Validator: [`docs/validator/README.md`](./validator/README.md)
- Kangur: [`docs/kangur/README.md`](./kangur/README.md)
- Prompt Exploder: canonical feature docs under
  [`docs/prompt-exploder/README.md`](./prompt-exploder/README.md)

## Cross-Cutting Engineering Docs

These are canonical platform guides. Root-level legacy entrypoints may remain as
compatibility stubs during migration.

- [`docs/platform/developer-handbook.md`](./platform/developer-handbook.md)
- [`docs/platform/best-practices.md`](./platform/best-practices.md)
- [`docs/platform/component-patterns.md`](./platform/component-patterns.md)
- [`docs/platform/architecture-guardrails.md`](./platform/architecture-guardrails.md)
- [`docs/platform/api-caching.md`](./platform/api-caching.md)
- [`docs/platform/data-fetching-caching.md`](./platform/data-fetching-caching.md)

Future platform-wide docs should land under [`docs/platform/`](./platform/README.md).

## Generated and Managed Artifact Areas

- Route and architecture metrics: [`docs/metrics/`](./metrics/)
- AI Paths semantic grammar: [`docs/ai-paths/semantic-grammar/`](./ai-paths/semantic-grammar/)
- Validator semantic grammar: [`docs/validator/semantic-grammar/`](./validator/semantic-grammar/)
- Migration reports: [`docs/migrations/reports/`](./migrations/reports/)

Generated docs should be refreshed by scripts when possible instead of edited
manually.

## Structural Rules

- Do not add new dated files directly under `docs/`.
- Do not add new root docs unless they are repo entrypoints, governance, or
  agent-overlay files.
- Every new doc should update its nearest hub page and, when cross-cutting, this
  index.
- If a doc supersedes an older doc, mark the relationship explicitly instead of
  leaving duplicates to drift.

## Documentation Governance

- Ownership matrix: [`docs/OWNERS.md`](./OWNERS.md)
- Documentation structure rules: [`docs/documentation/README.md`](./documentation/README.md)
- Root migration backlog:
  [`docs/documentation/root-doc-migration-backlog.md`](./documentation/root-doc-migration-backlog.md)
- All feature/API changes must update relevant docs before merge.
- Runbooks must be reviewed after incidents and on their stated cadence.

## Agentic coding

Platform-level guidance for AI-first concurrent coding now lives under `docs/platform/`:

- `docs/platform/agentic-coding-overview.md`
- `docs/platform/resource-leasing.md`
- `docs/platform/forward-only-execution.md`
- `docs/platform/agent-discovery.md`
- `docs/platform/shared-lease-service.md`
