# Wave 1 Dry-Run Verification (2026-03-04)

## Goal

Provide a repeatable, per-environment dry-run verification workflow for Wave 1 canonical data migration checks.

## Tooling

Primary runner:

- `scripts/db/prepare-wave1-dry-run-verification.mjs`

The runner supports:

1. Template mode (default): generates a pending report skeleton without executing scripts.
2. Run mode (`--run`): executes dry-run migration scripts and captures stdout/stderr and parsed JSON summaries.

## Commands Covered

1. `npm run products:normalize:v2`
2. `npm run migrate:ai-paths:config-contract:v2`
3. `npm run migrate:base-import-parameter-link-map:v2`
4. `npm run migrate:base-export-warehouse-preferences:v2`
5. `npm run migrate:base-connection-token-storage:v2`
6. `npm run migrate:base-token-encryption:v2`
7. `npm run migrate:tradera-api-credential-storage:v2`
8. `npm run migrate:tradera-api-user-id-storage:v2`
9. `npm run migrate:case-resolver:workspace-detached-contract:v2`
10. `npm run migrate:cms:page-builder-template-settings:v2`

## Usage

Generate template report:

```bash
node scripts/db/prepare-wave1-dry-run-verification.mjs --env=local
```

Execute dry-runs and capture report:

```bash
node scripts/db/prepare-wave1-dry-run-verification.mjs --env=local --run
```

Custom output path:

```bash
node scripts/db/prepare-wave1-dry-run-verification.mjs --env=staging --run --output=docs/migrations/reports/wave1-dry-run-staging-2026-03-04.json
```

Timeout override (milliseconds):

```bash
node scripts/db/prepare-wave1-dry-run-verification.mjs --env=prod --run --timeout-ms=2400000
```

## Output

Default report path:

- `docs/migrations/reports/wave1-dry-run-<env>.json`

Report includes:

1. aggregate status (`pending`, `success`, `failed`, `skipped`)
2. per-command execution metadata
3. captured stdout/stderr excerpts
4. parsed trailing JSON summary (when emitted by migration script)

## Latest Local Execution Snapshot (2026-03-04)

Executed:

```bash
node scripts/db/prepare-wave1-dry-run-verification.mjs --env=local --run
```

Artifact:

- `docs/migrations/reports/wave1-dry-run-local.json`

Aggregate result (`generatedAt=2026-03-04T20:03:42.522Z`):

1. total: `10`
2. success: `10`
3. failed: `0`
4. timedOut: `0`

AI Paths command verification:

1. `migrate:ai-paths:config-contract:v2`
2. status: `success` (exit `0`, duration `~2050ms`)
3. `parsedSummary` present (`mode=dry-run`, `updateCount=0`, `issues=[]`)

Follow-up:

1. Timeout issue resolved by forcing clean script termination in `scripts/db/migrate-ai-paths-config-contract-v2.ts`.
2. Keep `--timeout-ms` override available for slower environments, but local baseline now passes at default `120000ms`.

## Execution Checklist Per Environment

1. Ensure environment DB variables are set (`DATABASE_URL`, `MONGODB_URI` as applicable).
2. Run template mode and commit/update report skeleton.
3. Run `--run` mode and capture executed report artifact.
4. Review failed commands and warnings.
5. Attach report path and key summary metrics to Wave 1 rollout note.
