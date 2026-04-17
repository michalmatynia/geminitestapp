---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'platform'
canonical: true
---

# Platform Documentation

This directory is the canonical home for stable cross-cutting platform docs:

- architecture guides
- shared engineering patterns
- platform-wide API policies
- developer handbooks
- shared UI/data conventions

## Open This Hub When

- you need stable repo-wide engineering guidance rather than feature-specific docs
- you are changing shared architectural patterns, API conventions, caching, or accessibility behavior
- you need the current platform baseline instead of a historical scan or one-off plan
- you need the canonical home for concurrent agentic-coding rules and shared platform practices

## Placement Rule

New cross-cutting platform docs should land here instead of directly under
`docs/`.

For repo-level entrypoints, use [`README.md`](../../README.md),
[`docs/README.md`](../README.md), and [`GEMINI.md`](../../GEMINI.md). This
folder is for stable cross-cutting platform guidance, not the general repo
onramp.

## Current Docs

### Core Patterns & Best Practices
- [`accessibility.md`](./accessibility.md) — WCAG 2.1 Level AA patterns and standards
- [`component-patterns.md`](./component-patterns.md)
- [`best-practices.md`](./best-practices.md)
- [`architecture-guardrails.md`](./architecture-guardrails.md)

### Data & Caching
- [`api-caching.md`](./api-caching.md)
- [`data-fetching-caching.md`](./data-fetching-caching.md)

### Developer Resources
- [`developer-handbook.md`](./developer-handbook.md)
- [`testing-policy.md`](./testing-policy.md)
- [`tooltip-documentation-platform.md`](./tooltip-documentation-platform.md)
- [`migration-checklist.md`](./migration-checklist.md)
- [`bun-support.md`](./bun-support.md)

### Retained Historical Snapshot
- [`repo-deep-scan-2026-03-25.md`](./repo-deep-scan-2026-03-25.md) — archived
  repository scan and remediation snapshot; use `GEMINI.md` and the maintained
  hubs above for current guidance

## Scenario Map

| If you need to... | Open |
| --- | --- |
| understand broad engineering expectations | [`developer-handbook.md`](./developer-handbook.md) |
| review architecture and dependency rules | [`architecture-guardrails.md`](./architecture-guardrails.md) |
| choose shared UI and component patterns | [`component-patterns.md`](./component-patterns.md) |
| review shared accessibility policy | [`accessibility.md`](./accessibility.md) |
| inspect platform caching rules | [`api-caching.md`](./api-caching.md), [`data-fetching-caching.md`](./data-fetching-caching.md) |
| verify testing expectations across the repo | [`testing-policy.md`](./testing-policy.md) |
| review Bun support and parity rules | [`bun-support.md`](./bun-support.md) |
| work inside the agentic-coding model | [`agentic-coding-overview.md`](./agentic-coding-overview.md) and related docs below |

## Root Compatibility Stubs

Some historical root entrypoints may still exist as compatibility stubs, but the
canonical platform docs now live in this directory. New references should point
to the files above rather than the root-level stub paths.

## Agentic coding

The platform now exposes an AI-first concurrent agentic coding baseline:

- [Agentic Coding Overview](./agentic-coding-overview.md)
- [Resource Leasing](./resource-leasing.md)
- [Forward-Only Execution](./forward-only-execution.md)
- [Agent Discovery](./agent-discovery.md)
- [Shared Lease Service](./shared-lease-service.md)

- [AI Paths resume vs handoff](./ai-paths-resume-vs-handoff.md)
