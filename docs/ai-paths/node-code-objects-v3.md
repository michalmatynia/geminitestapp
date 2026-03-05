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

- `constant`
- `context`
- `bundle`
- `compare`
- `delay`
- `db_schema`
- `description_updater`
- `fetcher`
- `gate`
- `iterator`
- `mapper`
- `math`
- `mutator`
- `notification`
- `parser`
- `regex`
- `router`
- `simulation`
- `string_mutator`
- `template`
- `trigger`
- `validation_pattern`
- `validator`
- `viewer`

In this phase, pilot nodes still execute through legacy handlers, but their runtime strategy is tagged as `code_object_v3` for staged rollout.

Rollout control:

- runtime option `runtimeKernelMode: "legacy_only"` forces all node types to resolve as `legacy_adapter` (kill switch).
- runtime option `runtimeKernelPilotNodeTypes: string[]` allows scoped pilot overrides for test/canary execution.
- product-run executor supports global persisted settings:
  - `ai_paths_runtime_kernel_mode`: `auto | legacy_only`
  - `ai_paths_runtime_kernel_pilot_node_types`: JSON array or comma-delimited node types
- Admin UI control is available in AI-Paths Canvas action bar under `Runtime Kernel`.
- server env overrides persisted settings:
  - `AI_PATHS_RUNTIME_KERNEL_MODE=legacy_only`
  - `AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES=constant,context,bundle,compare,delay,db_schema,description_updater,fetcher,gate,iterator,mapper,math,mutator,notification,parser,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer`

## Directory

- `docs/ai-paths/node-code-objects-v3/index.scaffold.json`
- `docs/ai-paths/node-code-objects-v3/index.json` (generated pilot v3 index + hashes)
- `docs/ai-paths/node-code-objects-v3/contracts.json` (generated pilot v3 contracts hash catalog)
- `docs/ai-paths/node-code-objects-v3/parity-evidence.json` (test-backed dual-run parity evidence)
- `docs/ai-paths/node-code-objects-v3/{constant,context,bundle,compare,delay,db_schema,description_updater,fetcher,gate,iterator,mapper,math,mutator,notification,parser,regex,router,simulation,string_mutator,template,trigger,validation_pattern,validator,viewer}.scaffold.json`
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

This check is also part of:

```bash
npm run ai-paths:check:canonical
```

and aggregate docs gate:

```bash
npm run docs:ai-paths:node-docs:check
```

## Next Steps

1. Extend scaffold contracts to all node types with deterministic hashes.
2. Add runtime resolver that loads executable behavior from v3 contracts.
3. Add dual-run parity checks (`legacy` vs `code_object_v3`) in CI for pilot paths.
4. Move node types from backlog to pilot list in waves with observability sign-off.
