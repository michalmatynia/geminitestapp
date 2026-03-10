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
- `eslint-config-next@16.1.6`

Packages still capped at ESLint 9 in their published peer ranges:

- `eslint-plugin-import@2.32.0` -> `eslint ^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9`
- `eslint-plugin-jsx-a11y@6.10.2` -> `eslint ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9`
- `eslint-plugin-react@7.37.5` -> `eslint ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7`
- `eslint-plugin-react-hooks@7.0.1` -> `eslint ^3 || ^4 || ^5 || ^6 || ^7 || ^8.0.0-0 || ^9.0.0`

## Why this still blocks the upgrade

`eslint-config-next@16.1.6` still depends on:

- `eslint-plugin-react`
- `eslint-plugin-import`
- `eslint-plugin-jsx-a11y`
- `eslint-plugin-react-hooks`

So even if some of those could be reduced in local config, they still remain part of the active Next lint stack.

## Local dependency audit

### `eslint-plugin-import`

Not safely removable today.

Directly used in `eslint.config.mjs` for:

- `import/order`
- `import/no-restricted-paths`

This repo also already uses separate architecture checks, so a future migration path exists:

- keep `import/order` only if style sorting still matters
- move path-boundary enforcement fully to dedicated architecture checks or a different boundary-focused rule set

But that is a policy change, not a drop-in ESLint 10 unblock.

### `eslint-plugin-react`

Potentially removable from the repo's own flat config later, but not an ESLint 10 unblock today.

Direct local usage is only disabled rules:

- `react/react-in-jsx-scope`
- `react/display-name`
- `react/prop-types`

So the repo does not appear to rely on active React lint rules from this plugin directly.
However, `eslint-config-next` still depends on it.

### `eslint-plugin-react-hooks`

Potentially removable from the repo's own flat config later, but not an ESLint 10 unblock today.

The current flat config includes the plugin in shared plugin wiring, but no direct `react-hooks/*` rules are configured in `eslint.config.mjs`.
However, `eslint-config-next` still depends on it.

### `eslint-plugin-jsx-a11y`

Not directly referenced in `eslint.config.mjs`.

This package appears to be present only because the Next lint stack depends on it.
That means removing it from direct repo dependencies might be possible in a later cleanup, but it would not unblock ESLint 10 while `eslint-config-next` still pulls it.

## Recommended migration order

1. Keep the repo on ESLint 9 for now.
2. Keep the unified flat-config setup that removed the internal migration blocker.
3. Periodically re-check the four blocking plugins for ESLint 10 peer support.
4. Only bump to ESLint 10 when the plugin ecosystem used by the repo catches up, or after intentionally removing/replacing the affected plugins.

## Optional follow-up cleanup

If desired, the repo can still reduce local coupling before ESLint 10 is available:

- remove direct `eslint-plugin-react` usage from `eslint.config.mjs` if disabled-rule references are also removed
- remove direct `eslint-plugin-react-hooks` usage from `eslint.config.mjs` if no local rules are added back
- evaluate whether `eslint-plugin-jsx-a11y` needs to stay as a direct dependency or can remain only transitively provided by Next
- evaluate whether `import/no-restricted-paths` should stay in ESLint or move entirely to the dedicated architecture checker
