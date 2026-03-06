# Node Migration Guide (Semantic Portable Engine)

This guide tracks node-by-node migration from legacy runtime handlers to semantic portable code objects (`v3`).

Generated at: 2026-03-06T00:00:00.000Z

## Inputs

- `src/shared/lib/ai-paths/core/docs/node-docs.ts` (node catalog)
- `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts` (canonical runtime-kernel node set)
- `docs/ai-paths/semantic-grammar/nodes/index.json` (semantic hashes)
- `docs/ai-paths/node-code-objects-v2/index.json` (node-family metadata)
- `docs/ai-paths/node-code-objects-v3/index.scaffold.json` (available v3 scaffolds)
- `docs/ai-paths/node-code-objects-v3/index.json` + `contracts.json` (active v3 object hashes)
- `docs/ai-paths/node-code-objects-v3/parity-evidence.json` (runtime parity evidence: core dual-run + product-trigger E2E)
- `docs/ai-paths/node-code-objects-v3/rollout-approvals.json` (manual rollout approvals)
- `docs/ai-paths/node-code-objects-v3/rollout-eligibility.json` (generated technical rollout candidates)

## Migration Workflow

1. Confirm semantic contract for the node (`semantic-grammar/nodes/<nodeType>.json`).
2. Author/refresh `node-code-objects-v3/<nodeType>.scaffold.json` with runtime kernel metadata.
3. Keep runtime strategy on `code_object_v3` and set `executionAdapter` to `native_handler_registry`.
4. Validate runtime parity and native registry coverage checks for server/client execution paths.
5. Keep node type in the canonical runtime-kernel set (`NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES`) and monitor rollout signals.
6. Preserve docs/check guardrails in CI and use rollout approvals for governance sign-off when required.

## Strategy Totals

- Total node types: 36
- `legacy_adapter`: 0
- `code_object_v3`: 36
- v3 contracts hash: `de94efc457c39895d24226aa3ead3af01b4d9773078eed635f13f2b70b89a366`

## Readiness Scorecard

- Average readiness score: 100/100

| Stage | Nodes |
| --- | ---: |
| `not_ready` | 0 |
| `cataloged` | 0 |
| `scaffolded` | 0 |
| `pilot_indexed` | 0 |
| `rollout_candidate` | 0 |
| `rollout_approved` | 36 |

## Parity Evidence

- Source file: `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
- Schema version: `ai-paths.node-migration-parity-evidence.v1`
- Generated at: `2026-03-05T00:00:00.000Z`
- Evidence suites: 2
- Validated node types: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

## Rollout Approvals

- Source file: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`
- Schema version: `ai-paths.node-migration-rollout-approvals.v1`
- Generated at: `2026-03-06T00:00:00.000Z`
- Approved node types: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

## Rollout Eligibility

- Source file: `docs/ai-paths/node-code-objects-v3/rollout-eligibility.json`
- Schema version: `ai-paths.node-migration-rollout-eligibility.v1`
- Generated at: `2026-03-06T00:00:00.000Z`
- Eligibility criteria: `runtime_strategy=code_object_v3`, `has_semantic_contract_hash`, `has_v2_object_contract`, `has_v3_scaffold`, `has_v3_object_artifacts`, `dual_run_parity_validated`
- Eligible node types: `agent`, `ai_description`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `description_updater`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

Top blockers:

No migration blockers detected.

## Family Coverage

| Node Family | Total | `legacy_adapter` | `code_object_v3` |
| --- | ---: | ---: | ---: |
| ai-generation | 5 | 0 | 5 |
| audio | 2 | 0 | 2 |
| general | 1 | 0 | 1 |
| integration | 7 | 0 | 7 |
| orchestration | 9 | 0 | 9 |
| transform | 12 | 0 | 12 |

## Node Coverage Matrix

| Node Type | Family | Runtime Strategy | Ports (in/out) | Scaffold | Sheet | Semantic Hash | v3 Object Hash |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `agent` | ai-generation | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/agent.md) | `ed2953a2fed7...` | `e01c2375c8c4...` |
| `ai_description` | ai-generation | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/ai_description.md) | `93b3b2422e40...` | `2d0c32b67d2d...` |
| `api_advanced` | integration | `code_object_v3` | 5/8 | `yes` | [sheet](./nodes/api_advanced.md) | `37b85ffa5772...` | `1a0e05bb12bf...` |
| `audio_oscillator` | audio | `code_object_v3` | 5/5 | `yes` | [sheet](./nodes/audio_oscillator.md) | `7baab1b01ab3...` | `0adaad15c9c8...` |
| `audio_speaker` | audio | `code_object_v3` | 6/2 | `yes` | [sheet](./nodes/audio_speaker.md) | `37a4b7541ec6...` | `37a69c75b8bb...` |
| `bundle` | transform | `code_object_v3` | 5/1 | `yes` | [sheet](./nodes/bundle.md) | `f02021c0cfff...` | `fae337317016...` |
| `compare` | orchestration | `code_object_v3` | 1/3 | `yes` | [sheet](./nodes/compare.md) | `08b496fef266...` | `5ab8c5934941...` |
| `constant` | transform | `code_object_v3` | 0/1 | `yes` | [sheet](./nodes/constant.md) | `ae37de0024fb...` | `cf21a090114f...` |
| `context` | transform | `code_object_v3` | 1/4 | `yes` | [sheet](./nodes/context.md) | `8fec17546b68...` | `8c3eb88c9a9c...` |
| `database` | integration | `code_object_v3` | 12/4 | `yes` | [sheet](./nodes/database.md) | `eadd4fae4b6f...` | `e9dd65fa9b13...` |
| `db_schema` | integration | `code_object_v3` | 0/2 | `yes` | [sheet](./nodes/db_schema.md) | `dc56e39b3002...` | `2b89d2102d09...` |
| `delay` | orchestration | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/delay.md) | `fa631c84b720...` | `caad0a7230e5...` |
| `description_updater` | general | `code_object_v3` | 2/1 | `yes` | [sheet](./nodes/description_updater.md) | `0140c1929e74...` | `b85928b5972a...` |
| `fetcher` | orchestration | `code_object_v3` | 5/4 | `yes` | [sheet](./nodes/fetcher.md) | `b75a94276b7a...` | `623505c7772a...` |
| `gate` | orchestration | `code_object_v3` | 3/3 | `yes` | [sheet](./nodes/gate.md) | `c49aeec3b3e8...` | `c8e8b778226f...` |
| `http` | integration | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/http.md) | `19960ba99dd5...` | `7a7ac0b8aef5...` |
| `iterator` | orchestration | `code_object_v3` | 2/5 | `yes` | [sheet](./nodes/iterator.md) | `80ba1661cabb...` | `c026fe308d73...` |
| `learner_agent` | ai-generation | `code_object_v3` | 2/3 | `yes` | [sheet](./nodes/learner_agent.md) | `5009d070f150...` | `41d74570b176...` |
| `mapper` | transform | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/mapper.md) | `4fe386d977d5...` | `66263e28955a...` |
| `math` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/math.md) | `d5cf086af127...` | `b1e8aa79ed00...` |
| `model` | ai-generation | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/model.md) | `694291717483...` | `a8e7ef678ccf...` |
| `mutator` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/mutator.md) | `86dc18244f71...` | `d494689f686d...` |
| `notification` | integration | `code_object_v3` | 3/0 | `yes` | [sheet](./nodes/notification.md) | `171fd2da0826...` | `2b1a98f49ec8...` |
| `parser` | transform | `code_object_v3` | 2/4 | `yes` | [sheet](./nodes/parser.md) | `f4efe5d4248e...` | `953810bcc6b1...` |
| `playwright` | integration | `code_object_v3` | 3/4 | `yes` | [sheet](./nodes/playwright.md) | `7fe5f58cbada...` | `c0ece42ab884...` |
| `poll` | orchestration | `code_object_v3` | 6/4 | `yes` | [sheet](./nodes/poll.md) | `86f5979ebe33...` | `9cad4badd18c...` |
| `prompt` | ai-generation | `code_object_v3` | 5/2 | `yes` | [sheet](./nodes/prompt.md) | `98e6f0ffd5cb...` | `8215f876a491...` |
| `regex` | transform | `code_object_v3` | 3/4 | `yes` | [sheet](./nodes/regex.md) | `119b8b6056ec...` | `6712738b81c5...` |
| `router` | orchestration | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/router.md) | `82e9ef3cc91b...` | `401253c810d4...` |
| `simulation` | orchestration | `code_object_v3` | 1/4 | `yes` | [sheet](./nodes/simulation.md) | `cce9b04665f1...` | `02c238088029...` |
| `string_mutator` | transform | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/string_mutator.md) | `b4a7a5bd6daf...` | `97c5f3de77a2...` |
| `template` | transform | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/template.md) | `349143bb99ff...` | `965d96a2ba08...` |
| `trigger` | orchestration | `code_object_v3` | 0/2 | `yes` | [sheet](./nodes/trigger.md) | `233c29f92acb...` | `8f34d661891e...` |
| `validation_pattern` | transform | `code_object_v3` | 4/6 | `yes` | [sheet](./nodes/validation_pattern.md) | `e64e35e2fd11...` | `99b4a4a73182...` |
| `validator` | transform | `code_object_v3` | 1/3 | `yes` | [sheet](./nodes/validator.md) | `626a3f87a561...` | `bff39935f924...` |
| `viewer` | integration | `code_object_v3` | 35/0 | `yes` | [sheet](./nodes/viewer.md) | `4a4c8d08ad55...` | `eeb40780e49d...` |

## Per-Node Sheets

- Directory: `docs/ai-paths/node-code-objects-v3/nodes/*.md`
- One migration sheet is generated for every node type in `AI_PATHS_NODE_DOCS`.

## Generated Artifacts

- `docs/ai-paths/node-code-objects-v3/index.json`
- `docs/ai-paths/node-code-objects-v3/contracts.json`
- `docs/ai-paths/node-code-objects-v3/migration-index.json`
- `docs/ai-paths/node-code-objects-v3/rollout-eligibility.json`
- `docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md`
- `docs/ai-paths/node-code-objects-v3/nodes/<nodeType>.md`

## Artifact Hygiene

- Semantic/v2 generators prune stale per-node JSON files not represented in `AI_PATHS_NODE_DOCS`.
- v3 generator prunes stale `*.scaffold.json` files outside the active runtime-kernel set.
- Semantic/v2/v3 checks fail fast when unexpected node/scaffold files are present.

Regenerate with:

```bash
npm run docs:ai-paths:node-migration:generate
```

Validate with:

```bash
npm run docs:ai-paths:node-migration:check
```

