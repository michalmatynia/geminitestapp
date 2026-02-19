# AI-Paths Semantic Grammar v1

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
