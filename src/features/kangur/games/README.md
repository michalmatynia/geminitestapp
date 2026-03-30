# Kangur Games

This folder owns the Kangur game catalog, engines, defaults, launchable runtime
specs, and game-library support modules.

## Layout

- `catalog.ts`: normalized game catalog and catalog lookup helpers
- `coverage.ts`: library coverage auditing and validation helpers
- `defaults.ts`: built-in game inventory and default factories
- `engine-catalog.ts`: engine metadata and inventory helpers
- `engine-implementations.ts`: shared runtime implementation inventory
- `engines.ts`: built-in engine definitions
- `instances.ts`: built-in game instance resolution
- `launchable-runtime-resolution.ts`: launchable runtime lookup helpers
- `launchable-runtime-specs.ts`: launchable runtime inventory/spec helpers
- `lesson-activity-runtime-specs.ts`: lesson-activity runtime inventory/spec helpers
- `library-overview.ts`: game library overview and grouping helpers
- `library-page.ts`: library page support helpers
- `music-piano-roll-contract.ts`: music piano roll shared contracts
- `registry.ts`: game definition registry helpers
- `variants.ts`: variant inventory and helpers
- `defaults/`: built-in default game families
- `engines/`: built-in engine family definitions
- `number-balance/`: game-specific generation helpers
- `__tests__/`: games tests that are not owned by a narrower nested folder
