# `@kangur/platform`

Cross-platform Kangur session, storage, and port abstractions.

## Purpose

This package defines the platform boundary between shared Kangur logic and the
web or native app adapters that implement auth, storage, and backend access.

## Current exported areas

- auth session types and helpers
- auth adapter interfaces
- client storage adapter interfaces
- in-memory client storage helper
- auth, learner, score, progress, assignment, learner-history, and duels ports

## Entry point

- `src/index.ts`

## Design rules

- Keep this package focused on interfaces, session objects, and portable helpers.
- App-specific implementations stay in the root app or `apps/mobile`.
- Transport-specific request code belongs in `@kangur/api-client`.
- Deterministic business rules belong in `@kangur/core`.

## Related docs

- [`../../docs/kangur/react-native-monorepo-scaffold.md`](../../docs/kangur/react-native-monorepo-scaffold.md)
- [`../kangur-api-client/README.md`](../kangur-api-client/README.md)
- [`../kangur-core/README.md`](../kangur-core/README.md)
