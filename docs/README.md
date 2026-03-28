---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
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

- Repo quick start: [`README.md`](../README.md)
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
- Cross-feature build and toolchain docs belong in [`docs/build/README.md`](./build/README.md)
- Feature-owned docs belong in feature folders such as
  [`docs/case-resolver/`](./case-resolver/index.md),
  [`docs/validator/`](./validator/README.md), and
  [`docs/kangur/`](./kangur/README.md)
- Cross-feature runbooks belong in [`docs/runbooks/`](./runbooks/README.md)
- Cross-feature plans and closeouts belong in [`docs/plans/`](./plans/README.md)
- Cross-feature decisions and exception registers belong in
  [`docs/decisions/`](./decisions/README.md)
- Migration execution docs stay in [`docs/migrations/`](./migrations/README.md)
- Generated metrics stay in [`docs/metrics/`](./metrics/README.md)

## Major Feature Entry Points

### AI Features
- **AI Features Overview**: [`docs/ai-features/README.md`](./ai-features/README.md) — Comprehensive guides for all AI capabilities
  - Agent Runtime: [`agent-runtime-overview.md`](./ai-features/agent-runtime-overview.md) — Autonomous agent execution
  - Chatbot: [`chatbot-overview.md`](./ai-features/chatbot-overview.md) — Conversational AI
  - Image Studio: [`image-studio-overview.md`](./ai-features/image-studio-overview.md) — Image generation platform
  - AI Insights: AI-generated analytics and insights
  - Agent Creator: Persona and agent configuration

### Core Features
- AI Paths: canonical feature docs under
  [`docs/ai-paths/README.md`](./ai-paths/README.md)
- Case Resolver: [`docs/case-resolver/index.md`](./case-resolver/index.md)
- Validator: [`docs/validator/README.md`](./validator/README.md)
- Kangur: [`docs/kangur/README.md`](./kangur/README.md)
- StudiQ app shell (Kangur integration): [`docs/kangur/studiq-application.md`](./kangur/studiq-application.md)
- Kangur mobile app runtime and commands: [`apps/mobile/README.md`](../apps/mobile/README.md)
- Kangur mobile-web workspace boundary: [`apps/mobile-web/README.md`](../apps/mobile-web/README.md)
- Kangur shared packages:
  [`packages/kangur-contracts/README.md`](../packages/kangur-contracts/README.md),
  [`packages/kangur-core/README.md`](../packages/kangur-core/README.md),
  [`packages/kangur-api-client/README.md`](../packages/kangur-api-client/README.md),
  [`packages/kangur-platform/README.md`](../packages/kangur-platform/README.md)
- Prompt Exploder: canonical feature docs under
  [`docs/prompt-exploder/README.md`](./prompt-exploder/README.md)

## Cross-Cutting Engineering Docs

These are canonical platform guides.

- [`docs/platform/accessibility.md`](./platform/accessibility.md) — WCAG 2.1 Level AA patterns, screen reader support, keyboard navigation
- [`docs/platform/developer-handbook.md`](./platform/developer-handbook.md)
- [`docs/platform/testing-policy.md`](./platform/testing-policy.md)
- [`docs/platform/best-practices.md`](./platform/best-practices.md)
- [`docs/platform/component-patterns.md`](./platform/component-patterns.md)
- [`docs/platform/architecture-guardrails.md`](./platform/architecture-guardrails.md)
- [`docs/platform/api-caching.md`](./platform/api-caching.md)
- [`docs/platform/data-fetching-caching.md`](./platform/data-fetching-caching.md)
- [`docs/build/README.md`](./build/README.md)
- [`docs/build/bazel.md`](./build/bazel.md)
- [`docs/build/bun.md`](./build/bun.md)
- [`docs/platform/bun-support.md`](./platform/bun-support.md)
- [`docs/runbooks/testing-operations.md`](./runbooks/testing-operations.md)

Future platform-wide docs should land under [`docs/platform/`](./platform/README.md).

## Generated and Managed Artifact Areas

- Route and architecture metrics: [`docs/metrics/README.md`](./metrics/README.md)
- AI Paths semantic grammar: [`docs/ai-paths/semantic-grammar/`](./ai-paths/semantic-grammar/)
- Validator semantic grammar: [`docs/validator/semantic-grammar/`](./validator/semantic-grammar/)
- Migration execution docs: [`docs/migrations/README.md`](./migrations/README.md)
- Migration reports: [`docs/migrations/reports/`](./migrations/reports/)
- Supporting screenshots/assets: [`docs/images/`](./images/)

Generated docs should be refreshed by scripts when possible instead of edited
manually.

## Residual Program Surfaces

These folders still exist only when they expose an active cross-feature docs or
artifact surface. Completed historical archives should be removed instead of
kept as passive shelfware.

- UI consolidation: [`docs/ui-consolidation/README.md`](./ui-consolidation/README.md)

## Structural Rules

- Do not add new dated files directly under `docs/`.
- Do not add new root docs unless they are repo entrypoints, governance, or
  agent-overlay files.
- Remove obsolete root aliases once repo-internal consumers are updated.
- Every new doc should update its nearest hub page and, when cross-cutting, this
  index.
- If a doc supersedes an older doc, mark the relationship explicitly instead of
  leaving duplicates to drift.

## Documentation Governance

- Ownership matrix: [`docs/OWNERS.md`](./OWNERS.md)
- Documentation structure rules: [`docs/documentation/README.md`](./documentation/README.md)
- All feature/API changes must update relevant docs before merge.
- Runbooks must be reviewed after incidents and on their stated cadence.

## Agentic coding

Platform-level guidance for AI-first concurrent coding now lives under `docs/platform/`:

- `docs/platform/agentic-coding-overview.md`
- `docs/platform/resource-leasing.md`
- `docs/platform/forward-only-execution.md`
- `docs/platform/agent-discovery.md`
- `docs/platform/shared-lease-service.md`

- [Platform: AI Paths resume vs handoff](./platform/ai-paths-resume-vs-handoff.md)
