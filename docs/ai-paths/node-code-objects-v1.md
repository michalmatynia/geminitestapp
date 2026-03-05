# AI-Paths Node Code Objects (v1)

## Purpose

Node code objects are reusable JSON snippets for programmatic node authoring.

They are designed for:

- composable path generation
- copy/paste between pages and tools
- versioned review of node defaults

## Schema (Documentation Contract)

```json
{
  "schemaVersion": "ai-paths.node-code-object.v1",
  "id": "node_obj_example",
  "nodeType": "model",
  "title": "Model",
  "description": "Runs a selected model.",
  "inputs": ["prompt", "images"],
  "outputs": ["result", "jobId"],
  "config": {},
  "notes": []
}
```

## Initial Object Set

Seed objects are in:

- `docs/ai-paths/node-code-objects/index.json`
- `docs/ai-paths/node-code-objects/trigger.product-modal.json`
- `docs/ai-paths/node-code-objects/fetcher.trigger-context.json`
- `docs/ai-paths/node-code-objects/prompt.default.json`
- `docs/ai-paths/node-code-objects/model.default.json`
- `docs/ai-paths/node-code-objects/database.query.json`

## Composition Example

Minimal node array bootstrap:

```json
[
  { "$ref": "trigger.product-modal.json" },
  { "$ref": "fetcher.trigger-context.json" },
  { "$ref": "prompt.default.json" },
  { "$ref": "model.default.json" },
  { "$ref": "database.query.json" }
]
```

`$ref` usage above is a documentation pattern and not yet a runtime resolver contract.

## Planned Expansion

1. Add object files for all node types from semantic-grammar catalog.
2. Add per-object checksums and generated provenance.
3. Add linter that verifies code objects match node docs and runtime handler expectations.
