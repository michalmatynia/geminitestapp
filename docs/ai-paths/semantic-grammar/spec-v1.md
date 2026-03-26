---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# AI-Paths Semantic Grammar v1

This is the maintained spec reference for the portable AI Paths canvas
contract. Use [`./README.md`](./README.md) for the semantic-grammar hub and
[`../overview.md`](../overview.md) plus [`../reference.md`](../reference.md)
for the broader runtime and operator surface around this contract.

## Goal

Provide a deterministic, portable JSON format that describes exactly what is on an AI-Paths canvas:

- which nodes exist
- all current node settings
- which ports are connected between which nodes
- runtime/validation metadata needed for reproducibility

## Version

- `specVersion`: `ai-paths.semantic-grammar.v1`

## Document kinds

- `canvas`: full workflow export/import
- `subgraph`: selected-node copy/paste package

## Canvas document shape

```json
{
  "specVersion": "ai-paths.semantic-grammar.v1",
  "kind": "canvas",
  "path": {
    "id": "path_abc123",
    "version": 1,
    "name": "My Path",
    "description": "Path description",
    "trigger": "Product Modal - Context Filter",
    "updatedAt": "2026-02-19T22:00:00.000Z"
  },
  "nodes": [],
  "edges": [],
  "execution": {},
  "validation": {},
  "provenance": {
    "source": "ai-paths",
    "exportedAt": "2026-02-19T22:00:00.000Z"
  }
}
```

## Node shape

Each node is self-describing and contains current settings:

- `id`, `type`, `title`, `description`
- `position` (`x`, `y`)
- `inputs`, `outputs`
- `config` (all node settings)
- optional `connections` summary (`incoming`, `outgoing`)

## Edge shape

Edges carry canonical port wiring:

- `fromNodeId`
- `fromPort`
- `toNodeId`
- `toPort`

This is the source of truth for “which node is connected to which”.

## Subgraph document shape

`subgraph` documents include:

- selected nodes
- internal edges between selected nodes
- boundary edges (`incoming`, `outgoing`) for context when pasting

## Compatibility rules

- Unknown fields are preserved in `extensions` where possible.
- Unknown node types should be reported as import warnings.
- Missing edge endpoints must fail validation preflight.

## Validation integration

Centralized Node Validator rules can be inferred from semantic grammar documentation and enforce:

- edge endpoint integrity
- declared port wiring correctness
- required node config readiness

See `docs/ai-paths/node-validator-semantic-grammar-patterns.md`.

## Per-node type hash catalog

Semantic grammar node docs include deterministic hash metadata to make docs-driven inference traceable:

- each node file in `docs/ai-paths/semantic-grammar/nodes/<nodeType>.json` includes:
- `nodeHashAlgorithm` (`sha256`)
- `nodeHash` (hash of normalized node doc payload)
- `docs/ai-paths/semantic-grammar/nodes/index.json` includes the same per-node hash and compact metadata.

Index metadata fields include:

- `nodeHash`, `nodeHashAlgorithm`
- `inputCount`, `outputCount`, `configFieldCount`
- `runtimeFieldCount`, `criticalFieldCount`
- `hasDefaultConfig`, `defaultConfigKeyCount`
- `purposeSummary`

This enables centralized validator inference to:

- detect node-doc drift per node type
- identify hash collisions/mismatches as docs warnings
- audit exactly which node documentation version candidate rules came from
