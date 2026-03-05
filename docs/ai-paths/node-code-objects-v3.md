# AI-Paths Node Code Objects (v3 Scaffold)

## Purpose

`v3` introduces executable node code-object contracts that the runtime kernel can resolve directly.

Goal:

- eliminate hardcoded handler maps over time
- bind runtime behavior to portable node code objects
- keep copy/paste portability stable across surfaces

## Runtime Kernel Bridge

Runtime now includes a kernel adapter (`node-runtime-kernel`) with two strategies:

- `legacy_adapter`: uses current hardcoded handler registry
- `code_object_v3`: marks node types that are migrated to v3 contracts

Current pilot set:

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

Pilot nodes now resolve via contract-backed native handler registry on server runtime.
Server runtime resolves `code_object_v3` handlers through `docs/ai-paths/node-code-objects-v3/contracts.json`.
Supported adapters:
- `legacy_handler_bridge`
- `native_handler_registry` (current pilot: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`)
For `native_handler_registry`, runtime falls back to legacy bridge when a native registry mapping is unavailable.
Client runtime now supports native execution for a broader local subset (`ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `mapper`, `math`, `mutator`, `notification`, `parser`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`).
Remaining server-only native node families are tracked explicitly in runtime guardrails (`agent`, `learner_agent`, `model`, `playwright`).

Rollout control:

- runtime option `runtimeKernelMode: "legacy_only"` forces all node types to resolve as `legacy_adapter` (kill switch).
- runtime option `runtimeKernelPilotNodeTypes: string[]` allows scoped pilot overrides for test/canary execution.
- product-run executor supports global persisted settings:
  - `ai_paths_runtime_kernel_mode`: `auto | legacy_only`
  - `ai_paths_runtime_kernel_pilot_node_types`: JSON array or comma-delimited node types
  - `ai_paths_runtime_kernel_strict_native_registry`: `true | false`
- Admin UI control is available in AI-Paths Canvas action bar under `Runtime Kernel`.
- `strict_native_registry` can be configured from Canvas runtime controls (global + per-path override), and from env/run-meta/settings API paths.
- server env overrides persisted settings:
  - `AI_PATHS_RUNTIME_KERNEL_MODE=legacy_only`
- `AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES=agent,api_advanced,audio_oscillator,audio_speaker,constant,context,bundle,compare,database,delay,db_schema,description_updater,ai_description,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer`
- `AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY=true`

## Directory

- `docs/ai-paths/node-code-objects-v3/index.scaffold.json`
- `docs/ai-paths/node-code-objects-v3/index.json` (generated pilot v3 index + hashes)
- `docs/ai-paths/node-code-objects-v3/contracts.json` (generated pilot v3 contracts hash catalog)
- `docs/ai-paths/node-code-objects-v3/parity-evidence.json` (test-backed runtime parity evidence, including product-trigger E2E coverage)
- `docs/ai-paths/node-code-objects-v3/rollout-approvals.json` (manual rollout approval source)
- `docs/ai-paths/node-code-objects-v3/{agent,api_advanced,audio_oscillator,audio_speaker,constant,context,bundle,compare,database,delay,db_schema,description_updater,ai_description,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer}.scaffold.json`
- `docs/ai-paths/node-code-objects-v3/migration-index.json` (generated full-node migration matrix)
- `docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md` (generated workflow and coverage guide)
- `docs/ai-paths/node-code-objects-v3/nodes/<nodeType>.md` (generated per-node migration sheets)

Scaffolding contracts are pilot-only; migration docs are generated for all node types to keep rollout planning deterministic and current.

## Documentation Automation

Generate migration docs:

```bash
npm run docs:ai-paths:node-migration:generate
```

This command regenerates pilot v3 contract artifacts first and then refreshes migration docs.

Generate v3 pilot contract artifacts (scaffold hashes + index/contracts):

```bash
npm run docs:ai-paths:node-code-v3:generate
```

Check migration docs coverage and consistency:

```bash
npm run docs:ai-paths:node-migration:check
```

Check v3 pilot contract/index hash consistency:

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
`v3` generation also prunes stale `*.scaffold.json` files outside the active pilot set, and `docs:ai-paths:node-code-v3:check` fails on unexpected scaffold files.

The check validates migration docs against live node registry metadata (`title`, `ports`, config-field count, pilot strategy, semantic hashes, and per-node sheets).
It also validates pilot-node linkage to v3 object IDs/hashes from `docs/ai-paths/node-code-objects-v3/index.json`.
It also validates checklist parity readiness against `docs/ai-paths/node-code-objects-v3/parity-evidence.json`.
Pilot nodes are required to have parity-evidence suite coverage; missing coverage fails `docs:ai-paths:node-migration:check`.

Dual-run parity suite for pilot nodes:

```bash
npm run test:ai-paths:v3-pilot-parity
```

Pilot parity-evidence coverage regression suite:

```bash
npm run test:ai-paths:node-migration-parity-evidence
```

Product trigger-button enqueue E2E integration lane:

```bash
npm run test:ai-paths:trigger-queue:integration
```

Rollout approvals workflow:

1. Edit `docs/ai-paths/node-code-objects-v3/rollout-approvals.json` and add node types to `approvedNodeTypes`.
2. Regenerate docs/artifacts:

```bash
npm run docs:ai-paths:node-migration:generate
```

3. Validate with canonical checks:

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

1. Track and reduce remaining client/server mapping asymmetries for server-only node families.
2. Keep generated contracts/migration docs as the source of truth and enforce zero-drift in CI.
