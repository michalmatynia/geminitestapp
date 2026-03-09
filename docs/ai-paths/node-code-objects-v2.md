---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# AI-Paths Node Code Objects (v2)

## Purpose

`v2` node code objects are portable, semantic node artifacts designed to be copy-pasted between AI-Paths surfaces and executed by the same engine contract.

They provide:

- copy/paste-ready node JSON (`minimalNode`, `fullNode`)
- explicit port and config contracts
- runtime state semantics (`idle`, `processing`, `waiting`, `success`, `error`, `skipped`)
- deterministic object hashing for drift checks

## Files

- index: `docs/ai-paths/node-code-objects-v2/index.json`
- one object per node type: `docs/ai-paths/node-code-objects-v2/<nodeType>.json`

Source inputs:

- semantic node docs: `docs/ai-paths/semantic-grammar/nodes/*.json`
- node docs registry: `src/shared/lib/ai-paths/core/docs/node-docs.ts`

## Schema Contract

Each object uses:

- `schemaVersion: "ai-paths.node-code-object.v2"`
- `kind: "path_node_code_object"`
- `specVersion: "ai-paths.portable-engine.v1"`

Key sections:

- `ports.inputs` / `ports.outputs`
- `statusModel`
- `runtimeSemantics`
- `configContract.fields`
- `copyPaste.minimalNode`
- `copyPaste.fullNode`
- `copyPaste.pathSnippet`
- `objectHashAlgorithm` + `objectHash`

## Runtime Semantics (Signal Flow)

`statusModel` and `runtimeSemantics.wireActivationRules` define universal UI/runtime interpretation:

- `processing`: node is actively executing (pulse means processing). Outgoing wires must remain inactive until output exists.
- `waiting`: node is awaiting external callback/response. Incoming wires that already delivered data must not keep animating. Outgoing wires must remain inactive until output is emitted.
- `success`: animate only edges carrying newly emitted outputs.
- `error`: animate only explicit error-route outputs when emitted.

This is the canonical contract to keep signal-flow rendering consistent across all AI-Paths surfaces.

## Import/Export Validation Integration

Portable package export now embeds a node-code-object hash manifest in package metadata:

- metadata key: `aiPathsNodeCodeObjectsV2`
- schema: `ai-paths.node-code-object-manifest.v1`
- source contract map: `docs/ai-paths/node-code-objects-v2/contracts.json`

`resolvePortablePathInput` verifies this manifest during import:

- mode: `off | warn | strict`
- option: `nodeCodeObjectHashVerificationMode`
- default: `warn`

Direct UI paste in Paths tab uses `strict` mode.

Portable schema APIs expose contract hashes for clients:

- `GET /api/ai-paths/portable-engine/schema` (`kind=all`) includes `nodeCodeObjectContracts`.
- `GET /api/ai-paths/portable-engine/schema/diff` (`kind=all`) includes `nodeCodeObjectContracts` hash parity.

## Copy/Paste Usage

1. Open `docs/ai-paths/node-code-objects-v2/<nodeType>.json`.
2. Copy `copyPaste.fullNode`.
3. Paste into path `nodes[]`.
4. Replace `id` with a path-unique value.
5. Connect edges to declared `ports`.
6. Validate with existing AI-Paths validation/preflight.

For quick bootstrap, use `copyPaste.pathSnippet`.

## Generation & Drift Checks

Generate objects:

```bash
npm run docs:ai-paths:node-code:generate
```

Validate coverage + hashes:

```bash
npm run docs:ai-paths:node-code:check
```

## v3 Migration Bridge

`v2` remains the canonical portable copy/paste contract for all node types. Runtime migration to executable contracts is tracked separately in `v3` artifacts:

- overview: `docs/ai-paths/node-code-objects-v3.md`
- migration matrix: `docs/ai-paths/node-code-objects-v3/migration-index.json`
- workflow guide: `docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md`
- per-node migration sheets: `docs/ai-paths/node-code-objects-v3/nodes/<nodeType>.md`

Generate full node docs stack (semantic + v2 + v3 migration):

```bash
npm run docs:ai-paths:node-docs:generate
```

Validate full node docs stack:

```bash
npm run docs:ai-paths:node-docs:check
```

## Robustness Notes

- `objectHash` is deterministic over object payload (excluding hash field itself).
- `index.json` must match per-file hash and node type coverage.
- Node coverage is aligned to `AI_PATHS_NODE_DOCS` to prevent missing copy/paste artifacts when node catalog evolves.
- `docs:ai-paths:node-code:check` fails when unexpected `<nodeType>.json` files exist in `docs/ai-paths/node-code-objects-v2`.
- `docs:ai-paths:node-code:generate` prunes stale `<nodeType>.json` files not represented in `AI_PATHS_NODE_DOCS`.
