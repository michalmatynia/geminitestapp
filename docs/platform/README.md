---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'index'
scope: 'platform'
canonical: true
---

# Platform Documentation

This directory is the future home for stable cross-cutting platform docs:

- architecture guides
- shared engineering patterns
- platform-wide API policies
- developer handbooks
- shared UI/data conventions

## Placement Rule

New cross-cutting platform docs should land here instead of directly under
`docs/`.

## Current Docs

- [`api-caching.md`](./api-caching.md)
- [`data-fetching-caching.md`](./data-fetching-caching.md)
- [`component-patterns.md`](./component-patterns.md)
- [`best-practices.md`](./best-practices.md)
- [`developer-handbook.md`](./developer-handbook.md)
- [`architecture-guardrails.md`](./architecture-guardrails.md)
- [`tooltip-documentation-platform.md`](./tooltip-documentation-platform.md)
- [`migration-checklist.md`](./migration-checklist.md)

## Root Compatibility Stubs

Some historical root entrypoints may still exist as compatibility stubs, but the
canonical platform docs now live in this directory. New references should point
to the files above rather than the root-level stub paths.
