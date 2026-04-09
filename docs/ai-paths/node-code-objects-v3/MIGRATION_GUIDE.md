---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---
# Node Migration Guide (Semantic Portable Engine)

This guide tracks node-by-node migration from compatibility runtime handlers to semantic portable code objects (`v3`).

Generated at: 2026-04-05T14:57:57.569Z

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

- Total node types: 34
- `compatibility`: 0
- `code_object_v3`: 34
- v3 contracts hash: `e3d3507149b0c5aeb494dc25f56655ef173d567de7ca6c802e4d3bf4afa18b7a`

## Readiness Scorecard

- Average readiness score: 100/100

| Stage | Nodes |
| --- | ---: |
| `not_ready` | 0 |
| `cataloged` | 0 |
| `scaffolded` | 0 |
| `runtime_kernel_indexed` | 0 |
| `rollout_candidate` | 0 |
| `rollout_approved` | 34 |

## Parity Evidence

- Source file: `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
- Schema version: `ai-paths.node-migration-parity-evidence.v2`
- Generated at: `2026-03-05T00:00:00.000Z`
- Evidence suites: 2
- Validated node types: `agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

## Rollout Approvals

- Source file: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`
- Schema version: `ai-paths.node-migration-rollout-approvals.v1`
- Generated at: `2026-03-06T00:00:00.000Z`
- Approved node types: `agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

## Rollout Eligibility

- Source file: `docs/ai-paths/node-code-objects-v3/rollout-eligibility.json`
- Schema version: `ai-paths.node-migration-rollout-eligibility.v2`
- Generated at: `2026-04-05T14:57:57.569Z`
- Eligibility criteria: `runtime_strategy=code_object_v3`, `has_semantic_contract_hash`, `has_v2_object_contract`, `has_v3_scaffold`, `has_v3_object_artifacts`, `dual_run_parity_validated`
- Eligible node types: `agent`, `api_advanced`, `audio_oscillator`, `audio_speaker`, `bundle`, `compare`, `constant`, `context`, `database`, `db_schema`, `delay`, `fetcher`, `gate`, `http`, `iterator`, `learner_agent`, `mapper`, `math`, `model`, `mutator`, `notification`, `parser`, `playwright`, `poll`, `prompt`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

Top blockers:

No migration blockers detected.

## Family Coverage

| Node Family | Total | `compatibility` | `code_object_v3` |
| --- | ---: | ---: | ---: |
| ai-generation | 4 | 0 | 4 |
| audio | 2 | 0 | 2 |
| integration | 7 | 0 | 7 |
| orchestration | 9 | 0 | 9 |
| transform | 12 | 0 | 12 |

## Node Coverage Matrix

| Node Type | Family | Runtime Strategy | Ports (in/out) | Scaffold | Sheet | Semantic Hash | v3 Object Hash |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `agent` | ai-generation | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/agent.md) | `ed2953a2fed7...` | `d9321e2c67f8...` |
| `api_advanced` | integration | `code_object_v3` | 5/8 | `yes` | [sheet](./nodes/api_advanced.md) | `37b85ffa5772...` | `430bf2f99da4...` |
| `audio_oscillator` | audio | `code_object_v3` | 5/5 | `yes` | [sheet](./nodes/audio_oscillator.md) | `7baab1b01ab3...` | `1838c122b757...` |
| `audio_speaker` | audio | `code_object_v3` | 6/2 | `yes` | [sheet](./nodes/audio_speaker.md) | `37a4b7541ec6...` | `be2a5953928b...` |
| `bundle` | transform | `code_object_v3` | 5/1 | `yes` | [sheet](./nodes/bundle.md) | `f02021c0cfff...` | `7f919a4f68b0...` |
| `compare` | orchestration | `code_object_v3` | 1/3 | `yes` | [sheet](./nodes/compare.md) | `08b496fef266...` | `02f0b6734820...` |
| `constant` | transform | `code_object_v3` | 0/1 | `yes` | [sheet](./nodes/constant.md) | `ae37de0024fb...` | `7ab1331fe618...` |
| `context` | transform | `code_object_v3` | 1/4 | `yes` | [sheet](./nodes/context.md) | `8fec17546b68...` | `7ead38ff035c...` |
| `database` | integration | `code_object_v3` | 12/4 | `yes` | [sheet](./nodes/database.md) | `a17f4531e80e...` | `68bdd970676e...` |
| `db_schema` | integration | `code_object_v3` | 0/2 | `yes` | [sheet](./nodes/db_schema.md) | `9de668727483...` | `8f9157a45b9a...` |
| `delay` | orchestration | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/delay.md) | `fa631c84b720...` | `2d35e8bcc20d...` |
| `fetcher` | orchestration | `code_object_v3` | 5/4 | `yes` | [sheet](./nodes/fetcher.md) | `b75a94276b7a...` | `0f2c8d16e14c...` |
| `gate` | orchestration | `code_object_v3` | 3/3 | `yes` | [sheet](./nodes/gate.md) | `c49aeec3b3e8...` | `2e0a122c81e4...` |
| `http` | integration | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/http.md) | `19960ba99dd5...` | `48fb48117ad5...` |
| `iterator` | orchestration | `code_object_v3` | 2/5 | `yes` | [sheet](./nodes/iterator.md) | `80ba1661cabb...` | `0afea5d6e82e...` |
| `learner_agent` | ai-generation | `code_object_v3` | 2/3 | `yes` | [sheet](./nodes/learner_agent.md) | `5009d070f150...` | `6a6d5dc4af1c...` |
| `mapper` | transform | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/mapper.md) | `4fe386d977d5...` | `13de83e46c70...` |
| `math` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/math.md) | `d5cf086af127...` | `38dbe06f1e13...` |
| `model` | ai-generation | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/model.md) | `694291717483...` | `a4c6ab4e9232...` |
| `mutator` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/mutator.md) | `86dc18244f71...` | `74d37752bca1...` |
| `notification` | integration | `code_object_v3` | 3/0 | `yes` | [sheet](./nodes/notification.md) | `171fd2da0826...` | `f350d714d27b...` |
| `parser` | transform | `code_object_v3` | 2/4 | `yes` | [sheet](./nodes/parser.md) | `f4efe5d4248e...` | `bc9807ef13bf...` |
| `playwright` | integration | `code_object_v3` | 4/3 | `yes` | [sheet](./nodes/playwright.md) | `33b228c66c07...` | `2a20d91e30ac...` |
| `poll` | orchestration | `code_object_v3` | 6/4 | `yes` | [sheet](./nodes/poll.md) | `bb7015cd0766...` | `87c66145015d...` |
| `prompt` | ai-generation | `code_object_v3` | 5/2 | `yes` | [sheet](./nodes/prompt.md) | `98e6f0ffd5cb...` | `f4661d199bf1...` |
| `regex` | transform | `code_object_v3` | 3/4 | `yes` | [sheet](./nodes/regex.md) | `119b8b6056ec...` | `169830833bb9...` |
| `router` | orchestration | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/router.md) | `82e9ef3cc91b...` | `790f1d79bbc6...` |
| `simulation` | orchestration | `code_object_v3` | 1/4 | `yes` | [sheet](./nodes/simulation.md) | `cce9b04665f1...` | `2027d90bccd1...` |
| `string_mutator` | transform | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/string_mutator.md) | `b4a7a5bd6daf...` | `80cb1ef198b2...` |
| `template` | transform | `code_object_v3` | 5/1 | `yes` | [sheet](./nodes/template.md) | `a61e6756bfbc...` | `e6b05a3de450...` |
| `trigger` | orchestration | `code_object_v3` | 0/2 | `yes` | [sheet](./nodes/trigger.md) | `fb32646a0464...` | `32cc8751bee3...` |
| `validation_pattern` | transform | `code_object_v3` | 4/6 | `yes` | [sheet](./nodes/validation_pattern.md) | `e64e35e2fd11...` | `71bb929485b1...` |
| `validator` | transform | `code_object_v3` | 1/3 | `yes` | [sheet](./nodes/validator.md) | `626a3f87a561...` | `55eb6c5bbce4...` |
| `viewer` | integration | `code_object_v3` | 35/0 | `yes` | [sheet](./nodes/viewer.md) | `4a4c8d08ad55...` | `7f986a5e22c6...` |

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

