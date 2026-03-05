# Node Migration Guide (Semantic Portable Engine)

This guide tracks node-by-node migration from legacy runtime handlers to semantic portable code objects (`v3`).

Generated at: 2026-03-05T00:00:00.000Z

## Inputs

- `src/shared/lib/ai-paths/core/docs/node-docs.ts` (node catalog)
- `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts` (pilot runtime strategy)
- `docs/ai-paths/semantic-grammar/nodes/index.json` (semantic hashes)
- `docs/ai-paths/node-code-objects-v2/index.json` (node-family metadata)
- `docs/ai-paths/node-code-objects-v3/index.scaffold.json` (available v3 scaffolds)
- `docs/ai-paths/node-code-objects-v3/index.json` + `contracts.json` (pilot v3 object hashes)
- `docs/ai-paths/node-code-objects-v3/parity-evidence.json` (dual-run parity evidence)

## Migration Workflow

1. Confirm semantic contract for the node (`semantic-grammar/nodes/<nodeType>.json`).
2. Author/refresh `node-code-objects-v3/<nodeType>.scaffold.json` with runtime kernel metadata.
3. Keep runtime strategy on `legacy_adapter` until parity validation passes.
4. Validate dual-run parity (`legacy_adapter` vs `code_object_v3`) with integration coverage.
5. Move node type to kernel pilot list (`NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`).
6. After rollout and observability sign-off, keep docs/checks green in CI.

## Strategy Totals

- Total node types: 36
- `legacy_adapter`: 13
- `code_object_v3`: 23
- v3 contracts hash: `957d1f29e4cd6506009a23dc3449914be77a2177112edf7bf833745a56e12a98`

## Readiness Scorecard

- Average readiness score: 70/100

| Stage | Nodes |
| --- | ---: |
| `not_ready` | 0 |
| `cataloged` | 13 |
| `scaffolded` | 0 |
| `pilot_indexed` | 0 |
| `rollout_candidate` | 23 |
| `rollout_approved` | 0 |

## Parity Evidence

- Source file: `docs/ai-paths/node-code-objects-v3/parity-evidence.json`
- Schema version: `ai-paths.node-migration-parity-evidence.v1`
- Generated at: `2026-03-05T00:00:00.000Z`
- Evidence suites: 1
- Validated node types: `bundle`, `compare`, `constant`, `context`, `delay`, `description_updater`, `fetcher`, `gate`, `iterator`, `mapper`, `math`, `mutator`, `notification`, `parser`, `regex`, `router`, `simulation`, `string_mutator`, `template`, `trigger`, `validation_pattern`, `validator`, `viewer`

Top blockers:

| Blocker | Nodes |
| --- | ---: |
| `rollout_not_approved` | 23 |
| `missing_v3_scaffold` | 13 |
| `not_in_v3_pilot` | 13 |

## Family Coverage

| Node Family | Total | `legacy_adapter` | `code_object_v3` |
| --- | ---: | ---: | ---: |
| ai-generation | 5 | 5 | 0 |
| audio | 2 | 2 | 0 |
| general | 1 | 0 | 1 |
| integration | 7 | 5 | 2 |
| orchestration | 9 | 1 | 8 |
| transform | 12 | 0 | 12 |

## Node Coverage Matrix

| Node Type | Family | Runtime Strategy | Ports (in/out) | Scaffold | Sheet | Semantic Hash | v3 Object Hash |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `agent` | ai-generation | `legacy_adapter` | 4/2 | `no` | [sheet](./nodes/agent.md) | `ed2953a2fed7...` | `n/a` |
| `ai_description` | ai-generation | `legacy_adapter` | 3/1 | `no` | [sheet](./nodes/ai_description.md) | `93b3b2422e40...` | `n/a` |
| `api_advanced` | integration | `legacy_adapter` | 5/8 | `no` | [sheet](./nodes/api_advanced.md) | `37b85ffa5772...` | `n/a` |
| `audio_oscillator` | audio | `legacy_adapter` | 5/5 | `no` | [sheet](./nodes/audio_oscillator.md) | `7baab1b01ab3...` | `n/a` |
| `audio_speaker` | audio | `legacy_adapter` | 6/2 | `no` | [sheet](./nodes/audio_speaker.md) | `37a4b7541ec6...` | `n/a` |
| `bundle` | transform | `code_object_v3` | 5/1 | `yes` | [sheet](./nodes/bundle.md) | `f02021c0cfff...` | `efd212bb9128...` |
| `compare` | orchestration | `code_object_v3` | 1/3 | `yes` | [sheet](./nodes/compare.md) | `08b496fef266...` | `23313b4478cf...` |
| `constant` | transform | `code_object_v3` | 0/1 | `yes` | [sheet](./nodes/constant.md) | `ae37de0024fb...` | `37e4ab41ceac...` |
| `context` | transform | `code_object_v3` | 1/4 | `yes` | [sheet](./nodes/context.md) | `8fec17546b68...` | `c227b30bb2d8...` |
| `database` | integration | `legacy_adapter` | 12/4 | `no` | [sheet](./nodes/database.md) | `eadd4fae4b6f...` | `n/a` |
| `db_schema` | integration | `legacy_adapter` | 0/2 | `no` | [sheet](./nodes/db_schema.md) | `dc56e39b3002...` | `n/a` |
| `delay` | orchestration | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/delay.md) | `fa631c84b720...` | `1f0b26b2c3de...` |
| `description_updater` | general | `code_object_v3` | 2/1 | `yes` | [sheet](./nodes/description_updater.md) | `0140c1929e74...` | `036b75287b8b...` |
| `fetcher` | orchestration | `code_object_v3` | 5/4 | `yes` | [sheet](./nodes/fetcher.md) | `b75a94276b7a...` | `fcc70313d664...` |
| `gate` | orchestration | `code_object_v3` | 3/3 | `yes` | [sheet](./nodes/gate.md) | `c49aeec3b3e8...` | `0b3b771d3235...` |
| `http` | integration | `legacy_adapter` | 4/2 | `no` | [sheet](./nodes/http.md) | `19960ba99dd5...` | `n/a` |
| `iterator` | orchestration | `code_object_v3` | 2/5 | `yes` | [sheet](./nodes/iterator.md) | `80ba1661cabb...` | `6491b4a9cb98...` |
| `learner_agent` | ai-generation | `legacy_adapter` | 2/3 | `no` | [sheet](./nodes/learner_agent.md) | `5009d070f150...` | `n/a` |
| `mapper` | transform | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/mapper.md) | `4fe386d977d5...` | `418bee8d6f69...` |
| `math` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/math.md) | `d5cf086af127...` | `617cca2fcff9...` |
| `model` | ai-generation | `legacy_adapter` | 2/2 | `no` | [sheet](./nodes/model.md) | `694291717483...` | `n/a` |
| `mutator` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/mutator.md) | `86dc18244f71...` | `dcf613da31f5...` |
| `notification` | integration | `code_object_v3` | 3/0 | `yes` | [sheet](./nodes/notification.md) | `171fd2da0826...` | `76a46d4366b8...` |
| `parser` | transform | `code_object_v3` | 2/4 | `yes` | [sheet](./nodes/parser.md) | `f4efe5d4248e...` | `83efe93a40ad...` |
| `playwright` | integration | `legacy_adapter` | 3/4 | `no` | [sheet](./nodes/playwright.md) | `7fe5f58cbada...` | `n/a` |
| `poll` | orchestration | `legacy_adapter` | 6/4 | `no` | [sheet](./nodes/poll.md) | `86f5979ebe33...` | `n/a` |
| `prompt` | ai-generation | `legacy_adapter` | 5/2 | `no` | [sheet](./nodes/prompt.md) | `98e6f0ffd5cb...` | `n/a` |
| `regex` | transform | `code_object_v3` | 3/4 | `yes` | [sheet](./nodes/regex.md) | `119b8b6056ec...` | `22fd3b408e83...` |
| `router` | orchestration | `code_object_v3` | 2/2 | `yes` | [sheet](./nodes/router.md) | `82e9ef3cc91b...` | `35c0e41b00ab...` |
| `simulation` | orchestration | `code_object_v3` | 1/4 | `yes` | [sheet](./nodes/simulation.md) | `cce9b04665f1...` | `260264a220a3...` |
| `string_mutator` | transform | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/string_mutator.md) | `b4a7a5bd6daf...` | `a95b3ffff43c...` |
| `template` | transform | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/template.md) | `349143bb99ff...` | `818d7ec5fca3...` |
| `trigger` | orchestration | `code_object_v3` | 0/2 | `yes` | [sheet](./nodes/trigger.md) | `233c29f92acb...` | `a4d688101f3f...` |
| `validation_pattern` | transform | `code_object_v3` | 4/6 | `yes` | [sheet](./nodes/validation_pattern.md) | `e64e35e2fd11...` | `87ede3561620...` |
| `validator` | transform | `code_object_v3` | 1/3 | `yes` | [sheet](./nodes/validator.md) | `626a3f87a561...` | `e81c532abb19...` |
| `viewer` | integration | `code_object_v3` | 35/0 | `yes` | [sheet](./nodes/viewer.md) | `4a4c8d08ad55...` | `f80f84c6cea2...` |

## Per-Node Sheets

- Directory: `docs/ai-paths/node-code-objects-v3/nodes/*.md`
- One migration sheet is generated for every node type in `AI_PATHS_NODE_DOCS`.

## Generated Artifacts

- `docs/ai-paths/node-code-objects-v3/index.json`
- `docs/ai-paths/node-code-objects-v3/contracts.json`
- `docs/ai-paths/node-code-objects-v3/migration-index.json`
- `docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md`
- `docs/ai-paths/node-code-objects-v3/nodes/<nodeType>.md`

## Artifact Hygiene

- Semantic/v2 generators prune stale per-node JSON files not represented in `AI_PATHS_NODE_DOCS`.
- v3 generator prunes stale `*.scaffold.json` files outside the active pilot set.
- Semantic/v2/v3 checks fail fast when unexpected node/scaffold files are present.

Regenerate with:

```bash
npm run docs:ai-paths:node-migration:generate
```

Validate with:

```bash
npm run docs:ai-paths:node-migration:check
```

