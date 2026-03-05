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

## Migration Workflow

1. Confirm semantic contract for the node (`semantic-grammar/nodes/<nodeType>.json`).
2. Author/refresh `node-code-objects-v3/<nodeType>.scaffold.json` with runtime kernel metadata.
3. Keep runtime strategy on `legacy_adapter` until parity validation passes.
4. Validate dual-run parity (`legacy_adapter` vs `code_object_v3`) with integration coverage.
5. Move node type to kernel pilot list (`NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`).
6. After rollout and observability sign-off, keep docs/checks green in CI.

## Strategy Totals

- Total node types: 36
- `legacy_adapter`: 29
- `code_object_v3`: 7
- v3 contracts hash: `d0454cbcd30fab1edd0daa6adff3dbebca6a752d920b6953dfe7dca04c376435`

## Readiness Scorecard

- Average readiness score: 44/100

| Stage | Nodes |
| --- | ---: |
| `not_ready` | 0 |
| `cataloged` | 29 |
| `scaffolded` | 0 |
| `pilot_indexed` | 7 |
| `rollout_candidate` | 0 |
| `rollout_approved` | 0 |

Top blockers:

| Blocker | Nodes |
| --- | ---: |
| `missing_v3_scaffold` | 29 |
| `not_in_v3_pilot` | 29 |
| `parity_not_validated` | 7 |

## Family Coverage

| Node Family | Total | `legacy_adapter` | `code_object_v3` |
| --- | ---: | ---: | ---: |
| ai-generation | 5 | 5 | 0 |
| audio | 2 | 2 | 0 |
| general | 1 | 1 | 0 |
| integration | 7 | 7 | 0 |
| orchestration | 9 | 9 | 0 |
| transform | 12 | 5 | 7 |

## Node Coverage Matrix

| Node Type | Family | Runtime Strategy | Ports (in/out) | Scaffold | Sheet | Semantic Hash | v3 Object Hash |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `agent` | ai-generation | `legacy_adapter` | 4/2 | `no` | [sheet](./nodes/agent.md) | `ed2953a2fed7...` | `n/a` |
| `ai_description` | ai-generation | `legacy_adapter` | 3/1 | `no` | [sheet](./nodes/ai_description.md) | `93b3b2422e40...` | `n/a` |
| `api_advanced` | integration | `legacy_adapter` | 5/8 | `no` | [sheet](./nodes/api_advanced.md) | `37b85ffa5772...` | `n/a` |
| `audio_oscillator` | audio | `legacy_adapter` | 5/5 | `no` | [sheet](./nodes/audio_oscillator.md) | `7baab1b01ab3...` | `n/a` |
| `audio_speaker` | audio | `legacy_adapter` | 6/2 | `no` | [sheet](./nodes/audio_speaker.md) | `37a4b7541ec6...` | `n/a` |
| `bundle` | transform | `legacy_adapter` | 5/1 | `no` | [sheet](./nodes/bundle.md) | `f02021c0cfff...` | `n/a` |
| `compare` | orchestration | `legacy_adapter` | 1/3 | `no` | [sheet](./nodes/compare.md) | `08b496fef266...` | `n/a` |
| `constant` | transform | `code_object_v3` | 0/1 | `yes` | [sheet](./nodes/constant.md) | `ae37de0024fb...` | `37e4ab41ceac...` |
| `context` | transform | `legacy_adapter` | 1/4 | `no` | [sheet](./nodes/context.md) | `8fec17546b68...` | `n/a` |
| `database` | integration | `legacy_adapter` | 12/4 | `no` | [sheet](./nodes/database.md) | `eadd4fae4b6f...` | `n/a` |
| `db_schema` | integration | `legacy_adapter` | 0/2 | `no` | [sheet](./nodes/db_schema.md) | `dc56e39b3002...` | `n/a` |
| `delay` | orchestration | `legacy_adapter` | 2/2 | `no` | [sheet](./nodes/delay.md) | `fa631c84b720...` | `n/a` |
| `description_updater` | general | `legacy_adapter` | 2/1 | `no` | [sheet](./nodes/description_updater.md) | `0140c1929e74...` | `n/a` |
| `fetcher` | orchestration | `legacy_adapter` | 5/4 | `no` | [sheet](./nodes/fetcher.md) | `b75a94276b7a...` | `n/a` |
| `gate` | orchestration | `legacy_adapter` | 3/3 | `no` | [sheet](./nodes/gate.md) | `c49aeec3b3e8...` | `n/a` |
| `http` | integration | `legacy_adapter` | 4/2 | `no` | [sheet](./nodes/http.md) | `19960ba99dd5...` | `n/a` |
| `iterator` | orchestration | `legacy_adapter` | 2/5 | `no` | [sheet](./nodes/iterator.md) | `80ba1661cabb...` | `n/a` |
| `learner_agent` | ai-generation | `legacy_adapter` | 2/3 | `no` | [sheet](./nodes/learner_agent.md) | `5009d070f150...` | `n/a` |
| `mapper` | transform | `code_object_v3` | 4/2 | `yes` | [sheet](./nodes/mapper.md) | `4fe386d977d5...` | `418bee8d6f69...` |
| `math` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/math.md) | `d5cf086af127...` | `617cca2fcff9...` |
| `model` | ai-generation | `legacy_adapter` | 2/2 | `no` | [sheet](./nodes/model.md) | `694291717483...` | `n/a` |
| `mutator` | transform | `code_object_v3` | 1/1 | `yes` | [sheet](./nodes/mutator.md) | `86dc18244f71...` | `dcf613da31f5...` |
| `notification` | integration | `legacy_adapter` | 3/0 | `no` | [sheet](./nodes/notification.md) | `171fd2da0826...` | `n/a` |
| `parser` | transform | `code_object_v3` | 2/4 | `yes` | [sheet](./nodes/parser.md) | `f4efe5d4248e...` | `83efe93a40ad...` |
| `playwright` | integration | `legacy_adapter` | 3/4 | `no` | [sheet](./nodes/playwright.md) | `7fe5f58cbada...` | `n/a` |
| `poll` | orchestration | `legacy_adapter` | 6/4 | `no` | [sheet](./nodes/poll.md) | `86f5979ebe33...` | `n/a` |
| `prompt` | ai-generation | `legacy_adapter` | 5/2 | `no` | [sheet](./nodes/prompt.md) | `98e6f0ffd5cb...` | `n/a` |
| `regex` | transform | `code_object_v3` | 3/4 | `yes` | [sheet](./nodes/regex.md) | `119b8b6056ec...` | `22fd3b408e83...` |
| `router` | orchestration | `legacy_adapter` | 2/2 | `no` | [sheet](./nodes/router.md) | `82e9ef3cc91b...` | `n/a` |
| `simulation` | orchestration | `legacy_adapter` | 1/4 | `no` | [sheet](./nodes/simulation.md) | `cce9b04665f1...` | `n/a` |
| `string_mutator` | transform | `legacy_adapter` | 3/1 | `no` | [sheet](./nodes/string_mutator.md) | `b4a7a5bd6daf...` | `n/a` |
| `template` | transform | `code_object_v3` | 3/1 | `yes` | [sheet](./nodes/template.md) | `349143bb99ff...` | `818d7ec5fca3...` |
| `trigger` | orchestration | `legacy_adapter` | 0/2 | `no` | [sheet](./nodes/trigger.md) | `233c29f92acb...` | `n/a` |
| `validation_pattern` | transform | `legacy_adapter` | 4/6 | `no` | [sheet](./nodes/validation_pattern.md) | `e64e35e2fd11...` | `n/a` |
| `validator` | transform | `legacy_adapter` | 1/3 | `no` | [sheet](./nodes/validator.md) | `626a3f87a561...` | `n/a` |
| `viewer` | integration | `legacy_adapter` | 35/0 | `no` | [sheet](./nodes/viewer.md) | `4a4c8d08ad55...` | `n/a` |

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

