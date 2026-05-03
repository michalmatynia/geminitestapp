---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'overview'
scope: 'package:@kangur/core'
canonical: true
---

# `@kangur/core`

Portable, deterministic Kangur domain logic.

## Purpose

Use this package for business logic that should behave the same on web, mobile,
tests, and server-side callers without depending on React or fetch.

## Use This Package When

- web and mobile need the same deterministic Kangur business rule
- logic should be portable across tests, server code, and client runtimes
- the code should not know about React, HTTP, storage, or app-specific adapters

## Current exported areas

- progress store creation
- competition helpers
- assignments planning
- portable lessons and lesson content
- practice generation and operation focus
- reward and XP systems
- badges and progress summaries
- lesson catalog
- profile snapshots and recommendation builders
- leaderboard builders
- localized profile and progress text helpers
- math question generation types and helpers

## Entry point

- `src/index.ts`

## Design rules

- Keep networking, persistence, and framework adapters out of this package.
- Prefer moving deterministic Kangur logic here when both web and mobile need it.
- Shared payload shapes should come from `@kangur/contracts`, not be redefined locally.

## Do Not Put Here

- API clients or fetch wrappers
- auth/session storage adapters
- React hooks, components, or route-specific controller state

## Related docs

- [`../../docs/kangur/studiq-application.md`](../../docs/kangur/studiq-application.md)
- [`../kangur-contracts/README.md`](../kangur-contracts/README.md)
- [`../kangur-platform/README.md`](../kangur-platform/README.md)
