---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'index'
scope: 'feature:ai-paths'
canonical: true
---

# Node Code Objects v3 (Scaffold + Migration Docs)

This folder is the maintained generated/scaffold hub for v3 executable
node-code-object contracts. Use [`../node-code-objects-v3.md`](../node-code-objects-v3.md)
for the high-level contract summary and [`../reference.md`](../reference.md) for
the broader AI Paths runtime/operator surface.

This folder contains migration scaffolding and generated migration docs for executable node
code-object contracts.

Schema target:

- `schemaVersion: "ai-paths.node-code-object.v3"`
- `kind: "path_node_code_object"`
- `runtimeKernel.strategy: "code_object_v3"`

Current runtime scope uses the canonical runtime-kernel set (`agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`), which currently covers all 34 registered node types.

Runtime rollout controls:

- `runtimeKernelNodeTypes` is the canonical scoped runtime-kernel override for parity/canary runs. Deprecated persisted/env/path-config aliases are still normalized by cleanup and historical metadata readers, but live executor and Canvas settings reads now use only the canonical node-type controls. Omitted or empty persisted values fall back to the canonical approved node set.
- `runtimeKernelStrictNativeRegistry` has been fully removed from the runtime-kernel constructor and live graph-evaluation paths. Contract-backed `code_object_v3` nodes fail closed when native/registered handlers are missing, while non-contract experimental overrides continue to fall back through compatibility handlers until they are migrated.
- Server runtime resolves approved `code_object_v3` handlers through `contracts.json`.
- Supported execution adapters:
  - `legacy_handler_bridge`
  - `native_handler_registry` (current approved set: `agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`)
- Native adapter path now fails closed for contract-backed `code_object_v3` nodes when native mappings are missing.
- Client local runtime native subset now includes:
  - `agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`
- Remaining server-only native node families are:
  - `none`
- Product/server runs can also read persisted global settings:
  - `ai_paths_runtime_kernel_node_types`: JSON array or comma-delimited node types
- Fresh `AiPathRun.meta.runtimeKernel` snapshots and runtime event payloads now persist only canonical node-type and resolver-id context. Deprecated mode/strict fields remain cleanup-only historical metadata.
- Deprecated persisted key `ai_paths_runtime_kernel_strict_native_registry` is cleanup-only compatibility data and is no longer read by the live executor or Canvas runtime settings UI.
- Deprecated persisted key `ai_paths_runtime_kernel_pilot_node_types` is cleanup-only compatibility data and is no longer read by the live executor or Canvas settings UI.
- Canvas admins can edit these persisted settings from the `Runtime Kernel` control group on the AI-Paths Canvas action bar.
- Canvas runtime controls now expose only node-type and resolver-id overrides; strict native behavior is fixed on for live execution.
- Env vars override persisted settings:
  - `AI_PATHS_RUNTIME_KERNEL_NODE_TYPES`
- Deprecated env alias `AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY` is cleanup-only compatibility data and is no longer read by the live executor, Canvas local execution loop, or server runtime entrypoint.
- Deprecated env alias `AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES` is cleanup-only compatibility data and is no longer read by the live executor.
- Deprecated path-config aliases under `extensions.runtimeKernel` (`pilotNodeTypes`, `resolverIds`, `mode`, `strictNativeRegistry`, `strictCodeObjectRegistry`) are cleanup-only compatibility data and are no longer read by Canvas runtime settings, Canvas local execution, or server enqueue/runtime reads.
- Deprecated run-meta aliases under `AiPathRun.meta.runtimeKernelConfig` / `AiPathRun.meta.runtimeKernel` are cleanup-only compatibility data and are no longer translated into live execution overrides. Run the runtime-kernel metadata cleanup before relying on historical path-scoped overrides in queued runs.
- Runtime Analysis UI now labels any residual historical compatibility-strategy history as compatibility traces only; that analytics bucket remains for historical rollout evidence and does not represent a live execution mode.
- Aggregated runtime analytics summaries now expose `kernelParity.strategyCounts.compatibility` as the only live bucket name. Historical pre-canonical strategy snapshots must be rewritten through runtime-kernel metadata cleanup before they affect analytics again.
- Fresh `AiPathRun.meta.runtimeTrace.kernelParity.strategyCounts` snapshots now also write `compatibility` as the canonical bucket name; only historical run records may still contain the pre-canonical alias.
- Fresh executor run-event metadata, runtime profile highlights, and local-loop runtime status metadata now also emit `compatibility` as the public non-v3 strategy label.
- Shared runtime profile events and node-resolution telemetry now emit only canonical `compatibility` / `code_object_v3` labels. Historical runtime-state compatibility aliases must be rewritten by cleanup before live reads.
- Generated migration-index rows and per-node migration sheets now also use `compatibility` as the public non-v3 runtime strategy label; raw historical aliases remain cleanup-only compatibility input.
- `runtimeKernelMode`, `ai_paths_runtime_kernel_mode`, and `AI_PATHS_RUNTIME_KERNEL_MODE` are historical compatibility inputs only. Cleanup prunes persisted/runtime metadata variants, and the live runtime evaluation API no longer accepts `runtimeKernelMode`.
- `npm run cleanup:ai-paths-runtime-kernel-settings` normalizes node-type/resolver overrides, prunes deprecated runtime-kernel mode plus strict-native compatibility settings, and rewrites historical non-canonical `PathConfig.runtimeState.history[*].runtimeStrategy` snapshots.
- `npm run cleanup:ai-paths-runtime-kernel-run-metadata` normalizes historical `AiPathRun.meta.runtimeKernelConfig`, `AiPathRun.meta.runtimeKernel`, legacy `runtimeTrace.kernelParity.strategyCounts` aliases, and non-canonical `AiPathRun.runtimeState.history[*].runtimeStrategy` snapshots while pruning deprecated mode/strict metadata fields.

Generated migration documentation:

- `migration-index.json` (full node migration matrix, strategy status, doc links)
- `MIGRATION_GUIDE.md` (workflow + family coverage + node coverage table)
- `nodes/README.md` (node-sheet hub)
- `nodes/<nodeType>.md` (per-node migration sheet and checklist)

Scaffold contracts:

- `index.scaffold.json`
- `{agent,api_advanced,audio_oscillator,audio_speaker,bundle,compare,constant,context,database,db_schema,delay,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer}.scaffold.json`
- `index.json` (active v3 object index with hashes)
- `contracts.json` (active v3 contract hash catalog)
- `parity-evidence.json` (runtime parity evidence by node type, including product-trigger E2E coverage)
- `rollout-approvals.json` (manual rollout approval source)
- `rollout-eligibility.json` (generated technical rollout-candidate source)

Regenerate migration docs:

```bash
npm run docs:ai-paths:node-migration:generate
```

This command regenerates the active v3 contracts first (`docs:ai-paths:node-code-v3:generate`) and then refreshes migration docs.

Generate active v3 contract artifacts:

```bash
npm run docs:ai-paths:node-code-v3:generate
```

Validate migration docs:

```bash
npm run docs:ai-paths:node-migration:check
```

This command validates the active v3 contracts first (`docs:ai-paths:node-code-v3:check`) and then runs migration-doc checks.
It also validates checklist parity readiness against `parity-evidence.json`.
Runtime-kernel nodes without parity-evidence coverage fail the check.

Validate active v3 contract artifacts:

```bash
npm run docs:ai-paths:node-code-v3:check
```

Verify AI Paths node-docs pipeline does not introduce additional artifact drift:

```bash
npm run docs:ai-paths:node-docs:verify
```

CI alias:

```bash
npm run docs:ai-paths:node-docs:ci
```

`verify` snapshots artifact file hashes before/after generate+check and fails on any added/removed/changed file content.
`ci` runs `verify` plus tooltip coverage checks (`npm run docs:ai-paths:tooltip:check`).
On CI (clean checkout), this enforces regenerated artifacts are committed.
Semantic/v2 generation in this pipeline also prunes stale per-node JSON artifacts, and corresponding checks fail fast on unexpected per-node files.
`v3` generation also prunes stale `*.scaffold.json` files outside the active runtime-kernel set, and `docs:ai-paths:node-code-v3:check` fails fast on unexpected scaffold files.

Run dual-run parity:

```bash
npm run test:ai-paths:runtime-kernel-parity
```

Run parity-evidence coverage regression:

```bash
npm run test:ai-paths:node-migration-parity-evidence
```

Run product trigger-button enqueue integration lane:

```bash
npm run test:ai-paths:trigger-queue:integration
```

Rollout approvals:

1. Review `rollout-eligibility.json` for technically eligible rollout candidates.
2. Update `rollout-approvals.json` by adding approved node types to `approvedNodeTypes`.
3. Run `npm run docs:ai-paths:node-migration:generate`.
4. Run `npm run ai-paths:check:canonical`.

CI integration:

- Included in `npm run ai-paths:check:canonical`.
- Enforces node title/ports/config parity against `AI_PATHS_NODE_DOCS`.
- Included in workflow `.github/workflows/ai-paths-node-docs.yml` via `npm run docs:ai-paths:node-docs:ci`.
- Also covered by aggregate command `npm run docs:ai-paths:node-docs:check`.
