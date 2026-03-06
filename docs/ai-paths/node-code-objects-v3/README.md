# Node Code Objects v3 (Scaffold + Migration Docs)

This folder contains migration scaffolding and generated migration docs for executable node
code-object contracts.

Schema target:

- `schemaVersion: "ai-paths.node-code-object.v3"`
- `kind: "path_node_code_object"`
- `runtimeKernel.strategy: "code_object_v3"`

Current runtime scope uses the canonical runtime-kernel set (`agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`), which currently covers all 36 registered node types.

Runtime rollout controls:

- `runtimeKernelNodeTypes` is the canonical scoped runtime-kernel override for parity/canary runs. Deprecated persisted/env/path-config aliases are still normalized by cleanup and historical metadata readers, but live executor and Canvas settings reads now use only the canonical node-type controls. Omitted or empty persisted values fall back to the canonical approved node set.
- `runtimeKernelStrictNativeRegistry` is now a direct-kernel compatibility/testing control only. Product executor, Canvas local execution, and server/client runtime entrypoints pin strict native behavior on, and contract-backed `code_object_v3` nodes fail closed when native/registered handlers are missing regardless of this flag.
- Server runtime resolves approved `code_object_v3` handlers through `contracts.json`.
- Supported execution adapters:
  - `legacy_handler_bridge`
  - `native_handler_registry` (current approved set: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`)
- Native adapter path now fails closed for contract-backed `code_object_v3` nodes when native mappings are missing.
- Client local runtime native subset now includes:
  - `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`
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
- `runtimeKernelMode`, `ai_paths_runtime_kernel_mode`, and `AI_PATHS_RUNTIME_KERNEL_MODE` are deprecated compatibility inputs. Cleanup may still normalize them to `auto`, but the live path-run executor no longer reads them for execution control.
- `npm run cleanup:ai-paths-runtime-kernel-settings` normalizes node-type/resolver overrides and prunes deprecated runtime-kernel mode plus strict-native compatibility settings. The old `cleanup:ai-paths-runtime-kernel-mode` command remains as a deprecated alias.
- `npm run cleanup:ai-paths-runtime-kernel-run-metadata` normalizes historical `AiPathRun.meta.runtimeKernelConfig` and `AiPathRun.meta.runtimeKernel` compatibility aliases while pruning deprecated mode/strict metadata fields.

Generated migration documentation:

- `migration-index.json` (full node migration matrix, strategy status, doc links)
- `MIGRATION_GUIDE.md` (workflow + family coverage + node coverage table)
- `nodes/<nodeType>.md` (per-node migration sheet and checklist)

Scaffold contracts:

- `index.scaffold.json`
- `{agent,ai_description,api_advanced,audio_oscillator,audio_speaker,bundle,compare,constant,context,database,db_schema,delay,description_updater,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer}.scaffold.json`
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
