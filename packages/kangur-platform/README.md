---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'overview'
scope: 'package:@kangur/platform'
canonical: true
---

# `@kangur/platform`

Cross-platform Kangur session, storage, and port abstractions.

## Purpose

This package defines the platform boundary between shared Kangur logic and the
web or native app adapters that implement auth, storage, and backend access.

## Use This Package When

- you need cross-platform interfaces for auth, storage, or domain ports
- shared Kangur logic needs platform abstractions without depending on concrete app code
- web and native adapters need to implement the same portable contracts

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

## Do Not Put Here

- concrete web or native implementations
- route-specific UI state or hooks
- transport code that should live in `@kangur/api-client`

## Related docs

- [`../../docs/kangur/react-native-monorepo-scaffold.md`](../../docs/kangur/react-native-monorepo-scaffold.md)
- [`../kangur-api-client/README.md`](../kangur-api-client/README.md)
- [`../kangur-core/README.md`](../kangur-core/README.md)
