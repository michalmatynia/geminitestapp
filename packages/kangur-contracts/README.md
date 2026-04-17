---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'overview'
scope: 'package:@kangur/contracts'
canonical: true
---

# `@kangur/contracts`

Shared Kangur schemas and TypeScript contracts.

## Purpose

This package is the source of truth for request, response, and domain contracts
shared by the root web app, Kangur mobile, and the shared Kangur packages.

## Use This Package When

- you need a shared request or response contract across web, mobile, and shared packages
- you need Zod-backed transport or domain schema ownership in one place
- you want to avoid duplicating payload shapes in app-level code or transport helpers

## Current exported areas

- API envelopes and base utilities
- learner password and settings keys
- core Kangur domain contracts
- Kangur tests contracts
- Kangur duels contracts
- Kangur duels chat contracts

## Entry point

- `src/index.ts`

## Design rules

- Prefer adding shared DTOs and Zod-backed contracts here instead of duplicating
  shapes in apps.
- Keep UI-specific view models out of this package.
- When a transport or platform package depends on a Kangur payload shape, define
  or re-export that shape here first.

## Do Not Put Here

- React hooks or UI view models
- fetch or transport implementation logic
- app-specific storage or session adapters

## Related docs

- [`../../docs/kangur/studiq-application.md`](../../docs/kangur/studiq-application.md)
- [`../kangur-api-client/README.md`](../kangur-api-client/README.md)
- [`../kangur-core/README.md`](../kangur-core/README.md)
