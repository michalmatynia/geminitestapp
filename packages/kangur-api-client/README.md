# `@kangur/api-client`

Shared HTTP client for the `/api/kangur/*` backend.

## Purpose

Use this package when mobile or web code needs a transport layer for Kangur
without importing app-route handlers directly.

## Current scope

- auth: learner sign-in, sign-out, and `auth/me`
- progress and subject focus
- scores
- assignments
- learners, learner sessions, and learner interactions
- duels: lobby, presence, chat, state, search, answer, leave, spectator, and leaderboard

## Entry point

- `src/index.ts`

## Design rules

- Keep this package transport-only.
- Do not move React hooks, storage logic, or UI state into this package.
- Shared request and response types come from `@kangur/contracts`.
- Callers own runtime concerns such as auth headers, CSRF headers, and retry policy through `KangurApiClientOptions`.

## Related docs

- [`../../docs/kangur/studiq-application.md`](../../docs/kangur/studiq-application.md)
- [`../kangur-contracts/README.md`](../kangur-contracts/README.md)
- [`../kangur-platform/README.md`](../kangur-platform/README.md)
