# ESLint 10 migration blocker - 2026-03-10

## Status

The repo is structurally ready for a modern ESLint migration:

- one flat-config source of truth now lives in `eslint.config.mjs`
- scanner-script lint no longer uses a separate `eslint.scanner-scripts.config.cjs`
- Bazel scanner lint and `npm run lint:scanner-scripts` now resolve through the same root config

The remaining blocker is external package compatibility, not repo configuration.

## Current latest versions checked on 2026-03-10

- `eslint`: `10.0.3`
- `@eslint/js`: `10.0.1`

Packages already compatible with ESLint 10:

- `@typescript-eslint/eslint-plugin@8.57.0`
- `@typescript-eslint/parser@8.57.0`
- `typescript-eslint@8.57.0`

Packages still capped at ESLint 9 in their published peer ranges:

- `eslint-plugin-import@2.32.0` -> `eslint ^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9`
- `eslint-plugin-jsx-a11y@6.10.2` -> `eslint ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9`
- `eslint-plugin-react@7.37.5` -> `eslint ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7`
- `eslint-plugin-react-hooks@7.0.1` -> `eslint ^3 || ^4 || ^5 || ^6 || ^7 || ^8.0.0-0 || ^9.0.0`

## Why this still blocks the upgrade

The repo no longer depends directly on `eslint-config-next`.
The remaining blocker is still the published ESLint 10 peer support of the plugin ecosystem the repo uses directly.

## Local dependency audit

### `eslint-plugin-import`

Not safely removable today.

Directly used in `eslint.config.mjs` for:

- `import/order`
- `import/no-restricted-paths`
- `import/resolver.typescript` settings that still rely on the direct `eslint-import-resolver-typescript` package

This repo also already uses separate architecture checks, so a future migration path exists:

- keep `import/order` only if style sorting still matters
- move path-boundary enforcement fully to dedicated architecture checks or a different boundary-focused rule set

But that is a policy change, not a drop-in ESLint 10 unblock.

### `eslint-plugin-react`

No longer directly referenced by the repo's flat config.

The direct repo dependency has been removed because local usage was only dead `react/*` off-switches.
That still does not unblock ESLint 10 by itself while the broader plugin ecosystem remains capped at ESLint 9.

### `eslint-plugin-react-hooks`

No longer directly referenced by the repo's flat config.

The direct repo dependency has been removed after refactoring the remaining local `react-hooks/exhaustive-deps` suppressions out of `src/features/foldertree/v2/__tests__/runtime-provider.test.tsx`.
That still does not unblock ESLint 10 by itself while the broader plugin ecosystem remains capped at ESLint 9.

### `eslint-plugin-jsx-a11y`

Not directly referenced in `eslint.config.mjs`.

The direct repo dependency has been removed.
That does not unblock ESLint 10 while the broader plugin ecosystem remains capped at ESLint 9.

## Recommended migration order

1. Keep the repo on ESLint 9 for now.
2. Keep the unified flat-config setup that removed the internal migration blocker.
3. Periodically re-check the four blocking plugins for ESLint 10 peer support.
4. Only bump to ESLint 10 when the plugin ecosystem used by the repo catches up, or after intentionally removing/replacing the affected plugins.

## Optional follow-up cleanup

If desired, the repo can still reduce local coupling before ESLint 10 is available:

- `patch-eslint.sh` is now a deprecated stub; it no longer generates config from `eslint-config-next/core-web-vitals`
- evaluate whether `import/no-restricted-paths` should stay in ESLint or move entirely to the dedicated architecture checker
