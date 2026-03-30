# Kangur UI Services

This folder owns learner-facing Kangur UI service modules such as progress,
session scoring, practice helpers, game launch support, and small client-side
derivation utilities shared by the UI layer.

## Layout

- `__tests__/`: root UI-service tests for modules owned directly by this folder
- `profile/`: profile-specific derived metrics and helpers
- `delegated-assignments/`: delegated assignment support constants and types
- `progress*.ts`: progress state, persistence, badges, rewards, and i18n helpers
- `profile*.ts`: profile-facing service entrypoints and shared copy/constants
- `session-score.ts`: guest/session score persistence helpers
- `subject-focus.ts`: subject focus derivation helpers
- `game-launch.ts`: launch/runtime selection helpers
- `geometry-*.ts`, `drawing-*.ts`: client drawing and geometry utility services

Keep heavier UI runtime code in `ui/components`, `ui/pages`, or `ui/context`.
Use `ui/services` for stateless or persistence-adjacent UI helpers.
