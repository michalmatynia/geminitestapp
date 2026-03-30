# Kangur Services

This folder owns Kangur service-layer adapters, repositories, local platform
integration, and persistence-facing support that is shared across multiple
Kangur subdomains.

## Layout

- `__tests__/`: root service tests for modules owned directly by this folder
- `kangur-*-repository/`: repository adapters and repository-specific tests
- `local-kangur-platform*.ts`: browser/client platform integration helpers
- `browser-kangur-auth-adapter.ts`: browser auth-session adapter
- `guest-kangur-scores.ts`: guest score storage and migration helpers
- `kangur-actor.ts`: actor/session resolution helpers
- `kangur-assignments.ts`: shared assignment service helpers
- `kangur-learner-*.ts`: learner/session/ownership service helpers
- `kangur-settings-repository.ts`: legacy settings persistence adapter
- `status-errors.ts`: shared service-layer status error helpers

Prefer a named Kangur subdomain over `services/` when ownership is specific to
one domain. Keep `services/` for genuinely cross-Kangur adapters and
repository-facing infrastructure.
