# Playwright action-run history schema reference

This reference describes the retained MongoDB data model used by Playwright Step Sequencer action-run history.

## Collections

| Collection | Purpose |
| --- | --- |
| `playwright_action_runs` | One document per sequencer action run |
| `playwright_action_run_steps` | One document per retained step execution |

The split keeps run summaries cheap to list while allowing detailed nested step inspection on demand.

## Action run document

| Field | Purpose |
| --- | --- |
| `runId` | Stable run identifier used by UI and APIs |
| `actionId` | Sequencer action identifier, when available |
| `runtimeKey` | Runtime execution key for correlation |
| `status` | Current or terminal run state |
| `name` | Human-readable action/run label |
| `startUrl` | URL used to begin execution |
| `browserEngine` | Browser engine used for the run |
| `selectorProfile` | Selector registry profile active for the run |
| `instanceKind` | Runtime instance classification |
| `startedAt` | Run start timestamp |
| `completedAt` | Run completion timestamp |
| `durationMs` | Total run duration in milliseconds |
| `requestSummary` | Normalized request metadata retained from the runner |
| `result` | Top-level execution result payload |
| `artifacts` | Screenshots, traces, logs, or other retained artifacts |
| `logs` | Run-level log lines or structured log objects |
| `codeSnapshot` | Retained action-level semantic and resolved Playwright code |
| `createdAt` | First persistence timestamp |
| `updatedAt` | Last persistence timestamp |

## Step document

| Field | Purpose |
| --- | --- |
| `runId` | Parent run identifier |
| `stepId` | Stable step identifier |
| `parentStepId` | Parent step identifier for nested steps |
| `order` | Step order within the run |
| `type` | Sequencer step type, for example `click` or `fill` |
| `name` | Human-readable step label |
| `status` | Step execution state |
| `selector` | Local selector or retained fallback selector |
| `selectorKey` | Selector registry key, when connected |
| `selectorProfile` | Selector registry profile used for the step |
| `input` | Step input payload |
| `output` | Step output payload |
| `error` | Step error payload |
| `startedAt` | Step start timestamp |
| `completedAt` | Step completion timestamp |
| `durationMs` | Step duration in milliseconds |
| `inputBindings` | Dynamic field binding metadata |
| `selectorResolution` | Selector resolution details retained at execution time |
| `codeSnapshot` | Retained per-step semantic and resolved Playwright code |
| `logs` | Step-level logs |
| `artifacts` | Step-level artifacts |

## Input binding object

Each dynamic field can have a binding object. Selectors are the primary use case, but the same shape can be used for URLs, text values, files, timeout values, and runtime variables.

| Field | Purpose |
| --- | --- |
| `mode` | Binding mode: `literal`, `selectorRegistry`, `runtimeVariable`, `computed`, or `disabled` |
| `field` | Step field being bound, for example `selector` |
| `value` | Literal value, fallback value, variable name, or computed expression |
| `selectorKey` | Registry key for selector-backed fields |
| `selectorProfile` | Registry profile for selector-backed fields |
| `fallback` | Local fallback value used when registry resolution is unavailable |
| `label` | Optional human-readable label |

## Selector resolution object

Selector resolution records explain how a selector was resolved for a retained snapshot.

| Field | Purpose |
| --- | --- |
| `field` | Dynamic selector field |
| `selectorKey` | Registry key requested |
| `selectorProfile` | Registry profile requested |
| `resolvedSelector` | Selector value available at snapshot time |
| `fallbackSelector` | Local fallback value retained from the step |
| `source` | Resolution source, such as registry, fallback, literal, or unresolved |
| `warning` | Human-readable warning for missing or partial resolution |

## Code snapshot object

| Field | Purpose |
| --- | --- |
| `semanticCode` | Intent-preserving Playwright code using registry references or variable names |
| `resolvedCode` | Concrete Playwright code using resolved selectors and values where available |
| `language` | Code language, currently Playwright-flavored TypeScript/JavaScript |
| `moduleKey` | Stable module key for the step or action snippet |
| `imports` | Suggested imports or helper dependencies |
| `inputBindings` | Binding metadata used to generate the snapshot |
| `unresolvedBindings` | Dynamic fields that could not be resolved |
| `warnings` | Non-fatal preview-generation warnings |
| `generatedAt` | Snapshot generation timestamp |

## Query/index expectations

The repository should support efficient queries for:

| Query | Fields |
| --- | --- |
| Recent runs | `startedAt`, `createdAt` |
| Run detail | `runId` |
| Action investigation | `actionId`, `startedAt` |
| Runtime investigation | `runtimeKey`, `startedAt` |
| Status filtering | `status`, `startedAt` |
| Selector profile filtering | `selectorProfile`, `startedAt` |
| Step lookup | `runId`, `order`, `parentStepId` |

## Retention rules

1. Persist queued/running state early so failed startup attempts still appear in history.
2. Update the same run document as execution progresses.
3. Upsert step records by `runId` and `stepId`.
4. Prefer retaining planned steps when runtime execution does not emit step details.
5. Preserve code snapshots exactly as generated at execution time.
6. Do not rewrite retained snapshots from current selector registry values.
7. Treat recorder failures as observability failures, not execution failures.

