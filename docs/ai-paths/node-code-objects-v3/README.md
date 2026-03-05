# Node Code Objects v3 (Scaffold + Migration Docs)

This folder contains migration scaffolding and generated migration docs for executable node
code-object contracts.

Schema target:

- `schemaVersion: "ai-paths.node-code-object.v3"`
- `kind: "path_node_code_object"`
- `runtimeKernel.strategy: "code_object_v3"`

Current runtime scope uses the pilot list (`agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`), which currently covers all 36 registered node types.

Runtime rollout controls:

- `runtimeKernelMode: "legacy_only"` disables pilot strategy at execution time.
- `runtimeKernelPilotNodeTypes` allows scoped pilot overrides for parity/canary runs.
- Server runtime resolves pilot `code_object_v3` handlers through `contracts.json`.
- Supported execution adapters:
  - `legacy_handler_bridge`
  - `native_handler_registry` (current pilot: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`)
- Native adapter path falls back to legacy bridge when native registry mapping is unavailable.
- Client local runtime native subset now includes:
  - `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `mapper`, `math`, `mutator`, `notification`, `parser`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`
- Remaining server-only native node families are:
  - `agent`, `ai_description`, `api_advanced`, `database`, `description_updater`, `learner_agent`, `model`, `playwright`
- Product/server runs can also read persisted global settings:
  - `ai_paths_runtime_kernel_mode`: `auto | legacy_only`
  - `ai_paths_runtime_kernel_pilot_node_types`: JSON array or comma-delimited node types
  - `ai_paths_runtime_kernel_strict_native_registry`: `true | false`
- Canvas admins can edit these persisted settings from the `Runtime Kernel` control group on the AI-Paths Canvas action bar.
- `strict_native_registry` supports Canvas control (global + per-path override) and env/run-meta/settings API configuration.
- Env vars override persisted settings:
  - `AI_PATHS_RUNTIME_KERNEL_MODE`
  - `AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES`
  - `AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY`

Generated migration documentation:

- `migration-index.json` (full node migration matrix, strategy status, doc links)
- `MIGRATION_GUIDE.md` (workflow + family coverage + node coverage table)
- `nodes/<nodeType>.md` (per-node migration sheet and checklist)

Scaffold contracts:

- `index.scaffold.json`
- `{agent,ai_description,api_advanced,audio_oscillator,audio_speaker,bundle,compare,constant,context,database,db_schema,delay,description_updater,fetcher,gate,http,iterator,learner_agent,mapper,math,model,mutator,notification,parser,playwright,poll,prompt,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer}.scaffold.json`
- `index.json` (pilot v3 object index with hashes)
- `contracts.json` (pilot v3 contract hash catalog)
- `parity-evidence.json` (runtime parity evidence by node type, including product-trigger E2E coverage)
- `rollout-approvals.json` (manual rollout approval source)

Regenerate migration docs:

```bash
npm run docs:ai-paths:node-migration:generate
```

This command regenerates pilot v3 contracts first (`docs:ai-paths:node-code-v3:generate`) and then refreshes migration docs.

Generate v3 pilot contract artifacts:

```bash
npm run docs:ai-paths:node-code-v3:generate
```

Validate migration docs:

```bash
npm run docs:ai-paths:node-migration:check
```

This command validates pilot v3 contracts first (`docs:ai-paths:node-code-v3:check`) and then runs migration-doc checks.
It also validates checklist parity readiness against `parity-evidence.json`.
Pilot nodes without parity-evidence coverage fail the check.

Validate v3 pilot contract artifacts:

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
`v3` generation also prunes stale `*.scaffold.json` files outside the pilot set, and `docs:ai-paths:node-code-v3:check` fails fast on unexpected scaffold files.

Run pilot dual-run parity:

```bash
npm run test:ai-paths:v3-pilot-parity
```

Run pilot parity-evidence coverage regression:

```bash
npm run test:ai-paths:node-migration-parity-evidence
```

Run product trigger-button enqueue integration lane:

```bash
npm run test:ai-paths:trigger-queue:integration
```

Rollout approvals:

1. Update `rollout-approvals.json` by adding node types to `approvedNodeTypes`.
2. Run `npm run docs:ai-paths:node-migration:generate`.
3. Run `npm run ai-paths:check:canonical`.

CI integration:

- Included in `npm run ai-paths:check:canonical`.
- Enforces node title/ports/config parity against `AI_PATHS_NODE_DOCS`.
- Included in workflow `.github/workflows/ai-paths-node-docs.yml` via `npm run docs:ai-paths:node-docs:ci`.
- Also covered by aggregate command `npm run docs:ai-paths:node-docs:check`.
