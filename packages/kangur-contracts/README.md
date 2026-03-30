# `@kangur/contracts`

Shared Kangur schemas and TypeScript contracts.

## Purpose

This package is the source of truth for request, response, and domain contracts
shared by the root web app, Kangur mobile, and the shared Kangur packages.

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

## Related docs

- [`../../docs/kangur/studiq-application.md`](../../docs/kangur/studiq-application.md)
- [`../kangur-api-client/README.md`](../kangur-api-client/README.md)
- [`../kangur-core/README.md`](../kangur-core/README.md)
