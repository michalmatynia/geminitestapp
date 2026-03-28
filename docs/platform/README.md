---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
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

### Scan Reports
- [`repo-deep-scan-2026-03-25.md`](./repo-deep-scan-2026-03-25.md) — dated
  repository scan and remediation snapshot; use `GEMINI.md` for the current
  high-level architecture reference

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
