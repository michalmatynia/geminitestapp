# AI-Paths Node Code Objects (v3 Scaffold)

## Purpose

`v3` introduces executable node code-object contracts that the runtime kernel can resolve directly.

Goal:

- eliminate hardcoded handler maps over time
- bind runtime behavior to portable node code objects
- keep copy/paste portability stable across surfaces

## Runtime Kernel Bridge

Runtime now includes a kernel adapter (`node-runtime-kernel`) with two strategies:

- `compatibility`: compatibility strategy backed by the legacy handler registry
- `code_object_v3`: marks node types that are migrated to v3 contracts

Current runtime-kernel set:

- `agent`
- `api_advanced`
- `audio_oscillator`
- `audio_speaker`
- `constant`
- `context`
- `bundle`
- `compare`
- `database`
- `delay`
- `db_schema`
- `description_updater`
- `ai_description`
- `fetcher`
- `gate`
- `http`
- `iterator`
- `learner_agent`
- `mapper`
- `math`
- `model`
- `mutator`
- `notification`
- `parser`
- `playwright`
- `poll`
- `prompt`
- `regex`
- `router`
- `simulation`
- `string_mutator`
- `template`
- `trigger`
- `validation_pattern`
- `validator`
- `viewer`

Approved runtime-kernel nodes now resolve via contract-backed native handler registry on server runtime.
Server runtime resolves `code_object_v3` handlers through `docs/ai-paths/node-code-objects-v3/contracts.json`.
Supported adapters:
- `legacy_handler_bridge`
- `native_handler_registry` (current approved set: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`)
For `native_handler_registry`, contract-backed `code_object_v3` resolution now fails closed when native mappings are missing.
Client runtime now supports native execution for a broader local subset (`agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`).
Remaining server-only native node families are tracked explicitly in runtime guardrails (`none`).

Rollout control:

- runtime option `runtimeKernelNodeTypes: string[]` is the canonical way to scope runtime-kernel overrides for test/canary execution. Deprecated persisted/env/path-config aliases are still normalized by cleanup and historical metadata readers, but live executor and Canvas settings reads now use only the canonical node-type controls. Omitted or empty persisted values fall back to the canonical approved node set.
- `runtimeKernelStrictNativeRegistry` has been fully removed from the runtime-kernel constructor and live graph-evaluation paths. Contract-backed `code_object_v3` nodes fail closed when native/registered handlers are missing, while non-contract experimental overrides continue to fall back through compatibility handlers until they are migrated.
- product-run executor supports global persisted settings:
  - `ai_paths_runtime_kernel_node_types`: JSON array or comma-delimited node types
- fresh `AiPathRun.meta.runtimeKernel` snapshots and runtime event payloads now persist only canonical node-type and resolver-id context. Deprecated mode/strict fields remain cleanup-only historical metadata.
- deprecated persisted key `ai_paths_runtime_kernel_strict_native_registry` is cleanup-only compatibility data and is no longer read by the live executor or Canvas runtime settings UI.
- deprecated persisted key `ai_paths_runtime_kernel_pilot_node_types` is cleanup-only compatibility data and is no longer read by the live executor or Canvas settings UI.
- Admin UI control is available in AI-Paths Canvas action bar under `Runtime Kernel`.
- Canvas runtime controls now expose only node-type and resolver-id overrides; strict native behavior is fixed on for live execution.
- `AI_PATHS_RUNTIME_KERNEL_NODE_TYPES=agent,api_advanced,audio_oscillator,audio_speaker,constant,context,bundle,compare,database,delay,db_schema,description_updater,ai_description,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer`
- deprecated env alias `AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY=true|false` is cleanup-only compatibility data and is no longer read by the live executor, Canvas local execution loop, or server runtime entrypoint.
- deprecated env alias `AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES=...` is cleanup-only compatibility data and is no longer read by the live executor.
- deprecated path-config aliases under `extensions.runtimeKernel` (`pilotNodeTypes`, `resolverIds`, `mode`, `strictNativeRegistry`, `strictCodeObjectRegistry`) are cleanup-only compatibility data and are no longer read by Canvas runtime settings, Canvas local execution, or server enqueue/runtime reads.
- deprecated run-meta aliases under `AiPathRun.meta.runtimeKernelConfig` / `AiPathRun.meta.runtimeKernel` are cleanup-only compatibility data and are no longer translated into live execution overrides. Run the runtime-kernel metadata cleanup before relying on historical path-scoped overrides in queued runs.
- Runtime Analysis UI now labels any residual historical compatibility-strategy history as compatibility traces only; that analytics bucket remains for historical rollout evidence and does not represent a live execution mode.
- Aggregated runtime analytics summaries now expose `kernelParity.strategyCounts.compatibility` as the only live bucket name. Historical pre-canonical strategy snapshots must be rewritten through runtime-kernel metadata cleanup before they affect analytics again.
- Fresh `AiPathRun.meta.runtimeTrace.kernelParity.strategyCounts` snapshots now also write `compatibility` as the canonical bucket name; only historical run records may still contain the pre-canonical alias.
- Fresh executor run-event metadata, runtime profile highlights, and local-loop runtime status metadata now also emit `compatibility` as the public non-v3 strategy label.
- Shared runtime profile events and node-resolution telemetry now emit only canonical `compatibility` / `code_object_v3` labels. Historical runtime-state compatibility aliases must be rewritten by cleanup before live reads.
- Generated migration-index rows and per-node migration sheets now also use `compatibility` as the public non-v3 runtime strategy label; raw historical aliases remain cleanup-only compatibility input.
- `runtimeKernelMode`, `ai_paths_runtime_kernel_mode`, and `AI_PATHS_RUNTIME_KERNEL_MODE` are historical compatibility inputs only. Cleanup prunes persisted/runtime metadata variants, and the live runtime evaluation API no longer accepts `runtimeKernelMode`.
- Use `npm run cleanup:ai-paths-runtime-kernel-settings` to normalize node-type/resolver overrides, prune deprecated runtime-kernel mode plus strict-native compatibility settings, and rewrite historical non-canonical `PathConfig.runtimeState.history[*].runtimeStrategy` snapshots.
- Use `npm run cleanup:ai-paths-runtime-kernel-run-metadata` to normalize historical `AiPathRun.meta.runtimeKernelConfig`, `AiPathRun.meta.runtimeKernel`, legacy `runtimeTrace.kernelParity.strategyCounts` aliases, and non-canonical `AiPathRun.runtimeState.history[*].runtimeStrategy` snapshots while pruning deprecated mode/strict metadata fields.

## Directory

- `docs/ai-paths/node-code-objects-v3/index.scaffold.json`
- `docs/ai-paths/node-code-objects-v3/index.json` (generated active v3 index + hashes)
- `docs/ai-paths/node-code-objects-v3/contracts.json` (generated active v3 contracts hash catalog)
- `docs/ai-paths/node-code-objects-v3/parity-evidence.json` (test-backed runtime parity evidence, including product-trigger E2E coverage)
- `docs/ai-paths/node-code-objects-v3/rollout-approvals.json` (manual rollout approval source)
- `docs/ai-paths/node-code-objects-v3/rollout-eligibility.json` (generated technical rollout-candidate source)
- `docs/ai-paths/node-code-objects-v3/{agent,api_advanced,audio_oscillator,audio_speaker,constant,context,bundle,compare,database,delay,db_schema,description_updater,ai_description,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer}.scaffold.json`
- `docs/ai-paths/node-code-objects-v3/migration-index.json` (generated full-node migration matrix)
- `docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md` (generated workflow and coverage guide)
- `docs/ai-paths/node-code-objects-v3/nodes/<nodeType>.md` (generated per-node migration sheets)

Scaffolding contracts follow the active runtime-kernel set; migration docs are generated for all node types to keep rollout planning deterministic and current.

## Documentation Automation

Generate migration docs:

```bash
npm run docs:ai-paths:node-migration:generate
```

This command regenerates active v3 contract artifacts first and then refreshes migration docs.

Generate active v3 contract artifacts (scaffold hashes + index/contracts):

```bash
npm run docs:ai-paths:node-code-v3:generate
```

Check migration docs coverage and consistency:

```bash
npm run docs:ai-paths:node-migration:check
```

Check active v3 contract/index hash consistency:

```bash
npm run docs:ai-paths:node-code-v3:check
```

Verify generate+check introduces no additional node-doc artifact drift:

```bash
npm run docs:ai-paths:node-docs:verify
```

CI alias:

```bash
npm run docs:ai-paths:node-docs:ci
```

The verify step compares artifact file hashes before/after pipeline execution and fails on any added/removed/changed content.
The CI alias also runs tooltip coverage checks (`npm run docs:ai-paths:tooltip:check`).
On CI (clean checkout), this enforces generated artifacts are committed.
As part of this pipeline, semantic/v2 generation also prunes stale per-node JSON artifacts, while checks fail fast if unexpected per-node files remain.
`v3` generation also prunes stale `*.scaffold.json` files outside the active runtime-kernel set, and `docs:ai-paths:node-code-v3:check` fails on unexpected scaffold files.

The check validates migration docs against live node registry metadata (`title`, `ports`, config-field count, runtime-kernel strategy, semantic hashes, and per-node sheets).
It also validates runtime-kernel-set linkage to v3 object IDs/hashes from `docs/ai-paths/node-code-objects-v3/index.json`.
It also validates checklist parity readiness against `docs/ai-paths/node-code-objects-v3/parity-evidence.json`.
Runtime-kernel nodes are required to have parity-evidence suite coverage; missing coverage fails `docs:ai-paths:node-migration:check`.

Dual-run parity suite for approved kernel nodes:

```bash
npm run test:ai-paths:runtime-kernel-parity

```

Runtime-kernel parity-evidence coverage regression suite:

```bash
npm run test:ai-paths:node-migration-parity-evidence
```

Product trigger-button enqueue E2E integration lane:

```bash
npm run test:ai-paths:trigger-queue:integration
```

Rollout approvals workflow:

1. Review `docs/ai-paths/node-code-objects-v3/rollout-eligibility.json` for technically eligible node types.
2. Edit `docs/ai-paths/node-code-objects-v3/rollout-approvals.json` and add approved node types to `approvedNodeTypes`.
3. Regenerate docs/artifacts:

```bash
npm run docs:ai-paths:node-migration:generate
```

4. Validate with canonical checks:

```bash
npm run ai-paths:check:canonical
```

This check is also part of:

```bash
npm run ai-paths:check:canonical
```

and aggregate docs gate:

```bash
npm run docs:ai-paths:node-docs:check
```

## Next Steps

1. Keep client/server mapping asymmetry guardrails explicit at `none` and extend parity tests across async failure branches.
2. Keep generated contracts/migration docs as the source of truth and enforce zero-drift in CI.
