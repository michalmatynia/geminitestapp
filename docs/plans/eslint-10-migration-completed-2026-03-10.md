---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'active'
doc_type: 'closeout'
scope: 'repo'
canonical: true
---

# ESLint 10 migration completed - 2026-03-10

## Status

The repo is now on ESLint 10 and the live lint entrypoints validate cleanly:

- one flat-config source of truth now lives in `eslint.config.mjs`
- scanner-script lint no longer uses a separate `eslint.scanner-scripts.config.cjs`
- Bazel scanner lint and `npm run lint:scanner-scripts` now resolve through the same root config
- `npm run lint` passes
- `npm run lint:scanner-scripts` passes
- `npm run lint:config:check` passes

## Current latest versions checked on 2026-03-10

- `eslint`: `10.0.3`
- `@eslint/js`: `10.0.1`

Packages already compatible with ESLint 10:

- `@typescript-eslint/eslint-plugin@8.57.0`
- `@typescript-eslint/parser@8.57.0`
- `typescript-eslint@8.57.0`

Packages that previously blocked the repo were removed from the live lint graph:

- `eslint-plugin-import`
- `eslint-plugin-jsx-a11y`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-config-next`
- `@next/eslint-plugin-next`

## Local dependency audit

### `eslint-plugin-import`

No longer directly referenced by the repo's flat config.

The direct repo dependency has been removed after:

- moving path-boundary checks into architecture guardrails
- dropping `import/order` from the live ESLint config
- removing the last local `import/order` disable from `src/shared/contracts/integrations/index.ts`

### Remaining direct lint stack

The live lint stack is now:

- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `eslint-config-prettier`

All of the older plugin-specific blockers were removed from the repo's active flat config before the bump.

## Compatibility note

ESLint 10 introduced new core-rule pressure through the base recommended rule set:

- `no-useless-assignment`
- `preserve-caught-error`

Those rules were explicitly turned off in `eslint.config.mjs` so the version bump preserves the repo's prior lint policy instead of forcing unrelated cleanup churn.

## Optional follow-up cleanup

If desired, the repo can still do small cleanup after the version bump:

- keep architecture-boundary enforcement in the dedicated checker, not in ESLint
