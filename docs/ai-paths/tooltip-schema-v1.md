---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# AI-Paths Tooltip Schema v1

This schema defines the centralized, UI-only tooltip catalog consumed by the tooltip engine.

## Entry contract

Each tooltip entry must contain:

- `id`: unique stable identifier.
- `title`: short tooltip title.
- `summary`: one-line explanation shown in tooltip body.
- `section`: logical UI grouping.
- `aliases`: alternate labels used for fallback matching.
- `docPath`: documentation source path.

Optional:

- `tags`: searchable categories.
- `uiTargets`: declarative list of intended UI bindings (for coverage checks).

## Recommended ID conventions

- Global controls: `workflow_overview`, `docs_tooltips_toggle`
- Canvas actions: `canvas_<action>`
- Palette controls: `palette_<action>`
- Node palette cards: `node_palette_<nodeType>`
- Node config modal controls: `node_config_<action>`
- Node config fields: `node_config_field_<nodeType>_<fieldPathSlug>`
- Semantic grammar references: `semantic_node_<nodeType>`
- Docs snippets: `docs_snippet_<snippetNameSlug>`

## Governance rules

- Tooltip content must be sourced from centralized docs manifests only.
- AI-Paths UI must not hardcode tooltip strings directly in components.
- Any new node type must introduce `node_palette_<nodeType>`.
- Any new critical AI-Paths control must define a dedicated tooltip ID and binding.
- Coverage checks must fail when required IDs are missing.
