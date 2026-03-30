# Kangur Score Repository

This folder owns the Kangur score repository entrypoint, MongoDB-backed score
storage, and score-repository shared helpers.

## Layout

- `index.ts`: repository entrypoint and observability wrapper
- `mongo-kangur-score-repository.ts`: MongoDB score storage implementation
- `shared.ts`: score repository shared helpers
- `types.ts`: repository-facing contract types
- `__tests__/`: repository tests for this folder
