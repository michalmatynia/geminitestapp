# Agentic engineering contract

This repository now exposes a machine-readable preparation layer for autonomous engineering runs.

## Source of truth

The agentic routing model lives in `config/agentic/domains/*.json`.

Each domain manifest declares:
- source roots the domain owns
- manual docs the domain owns
- generated artifacts the domain refreshes
- generated-only paths that automation may stage or refresh
- manual-only paths that automation must not treat as generated outputs
- doc generator Bazel targets
- scanner Bazel targets
- validation Bazel targets
- a risk level for the domain
- one or more impact bundles for higher-level validation grouping

## Repo-owned entrypoints

Use these commands instead of inventing per-run heuristics:
- `npm run agentic:classify -- <changed files...>`
- `npm run agentic:preflight -- <changed files...>`
- `npm run agentic:execute`
- `npm run agentic:collect-artifacts`
- `npm run agentic:finalize`
- `npm run agentic:finalize:force`
- `npm run bazel:smoke`
- `npm run bazel:regressions`
- `npm run bazel:ci`

## Outputs

`agentic:classify` emits a single JSON envelope with:
- changed files
- impacted domains
- highest risk level
- required impact bundles
- bundle priority by impact bundle
- recommended bundle order for CI fanout
- recommended validation targets per impact bundle
- required docs
- required generated artifacts
- generated-only path policies
- manual-only path policies
- required doc generators
- required scanners
- required validation targets

`agentic:preflight` writes `artifacts/agent-work-order.json` with the same routing data collapsed into an execution work order.

## Manifest coverage

Current manifest coverage includes:
- Admin
- App Embeds
- Auth
- Case Resolver
- CMS
- Database
- Document Editor
- Files
- Internationalization
- Integrations
- Jobs
- Kangur
- NotesApp
- Observability
- Product Sync
- Products
- Prompt Engine
- Viewer3D
- AI Paths

More domains should be added by declaring a new manifest instead of adding hard-coded routing logic to scripts or CI.

The first concrete domain policies now in place are:
- `case-resolver`: manual docs under `docs/case-resolver`
- `database`: manual docs under `docs/migrations`
- `files`: manual storage planning doc at `docs/plans/fastcomet-storage-plan.md`
- `prompt-engine`: generated validator docs under `docs/validator`

## Guardrails

`./scripts/agentic/agentic-manifests.test.ts` verifies that:
- every manifest parses
- every referenced path exists
- every declared Bazel target uses a valid Bazel label shape
- classifier behavior stays stable for representative file changes
- generated-only and manual-only paths do not overlap
- owned docs are not declared inside generated-only paths

`./scripts/agentic/work-order-execution.test.ts` verifies that:
- execution planning deduplicates targets and impact bundles
- validation targets remain opt-in or risk-threshold controlled
- manual-only paths block generated outputs
- generated-only paths block manual-doc treatment

## Work-order execution

Use `npm run agentic:execute` to consume `artifacts/agent-work-order.json`.

The executor currently runs:
- required doc generators
- required scanner targets

It writes `artifacts/agent-execution-report.json` with the executed targets and their statuses.

Before any target runs, the executor validates work-order guardrails against:
- `generatedOnlyPaths`
- `manualOnlyPaths`

If the work order violates those policies, execution stops and the report records the blocking guardrail violations.

Validation targets remain part of the work order, but they are still advisory in this phase unless execution is explicitly extended with validation enabled.

## Finalization

Use `npm run agentic:finalize` when the work order should also execute its validation targets.

`agentic:finalize` currently:
- runs `agentic:execute` with validation enabled
- auto-runs validation only when the work order risk is at least `medium`
- stages required generated artifacts into `artifacts/generated-outputs`
- writes `artifacts/agent-final-report.json`

Use `npm run agentic:finalize:force` to override the low-risk policy gate and force validation execution for low-risk work orders.
