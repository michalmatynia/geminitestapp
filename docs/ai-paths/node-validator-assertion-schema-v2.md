---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# AI-Paths Node Validator Assertion Schema v2

Centralized docs provide machine-readable assertions in fenced `ai-paths-assertion` blocks.
The Node Validator sync consumes these assertions and compiles rule candidates.

## Block format

````markdown
```ai-paths-assertion
{
  "id": "unique.assertion.id",
  "title": "Human readable title",
  "module": "database",
  "severity": "error",
  "description": "Why this matters.",
  "recommendation": "How to fix.",
  "version": "2.0.0",
  "tags": ["safety", "runtime", "db"],
  "deprecates": ["legacy.assertion.id"],
  "sequenceHint": 80,
  "weight": 35,
  "forceProbabilityIfFailed": 0,
  "confidence": 0.92,
  "conditionMode": "all",
  "appliesToNodeTypes": ["database"],
  "docsBindings": ["docs/ai-paths/node-validator-database-patterns.md"],
  "conditions": [
    {
      "operator": "collection_exists",
      "field": "config.database.query.collection"
    }
  ]
}
```
````

```

## Required fields
- `id`
- `title`
- `module`
- `conditions`

## Optional fields
- `severity`, default `warning`
- `description`, `recommendation`
- `version`, `tags`, `deprecates`
- `sequenceHint`, `weight`, `forceProbabilityIfFailed`
- `conditionMode`, default `all`
- `appliesToNodeTypes`
- `docsBindings`
- `confidence`, range `0..1`

## Condition operators
- `exists`
- `non_empty`
- `equals`
- `in`
- `matches_regex`
- `wired_from`
- `wired_to`
- `has_incoming_port`
- `has_outgoing_port`
- `jsonpath_exists`
- `jsonpath_equals`
- `collection_exists`
- `entity_collection_resolves`
- `edge_endpoints_resolve`
- `edge_ports_declared`
- `node_types_known`
- `node_ids_unique`
- `edge_ids_unique`
- `node_positions_finite`

## Notes
- Assertions are centralized docs inputs only.
- Runtime executes only approved rules visible in Node Validator.
- Candidate rules from docs remain non-executing until approved.
- Use `deprecates` to mark previous assertion IDs as superseded by a new assertion.
- Manifest ordering (`node-validator-central-manifest.json`) controls source priority and duplicate resolution.

## Manifest source types
- `markdown_assertion`
- `node_docs_catalog`
- `docs_snippet`
- `semantic_nodes_catalog`
- `tooltip_docs_catalog`
- `coverage_matrix_csv`
```
