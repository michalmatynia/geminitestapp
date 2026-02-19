# AI-Paths Node Validator Docs Logic Inference

This document defines how the Node Validator infers additional candidate rules directly from centralized AI-Paths documentation sources.

## Source-driven inference layers

- `node_docs_catalog` (`src/features/ai/ai-paths/lib/core/docs/node-docs.ts`)
- `docs_snippet` (`src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets.ts`)
- `semantic_nodes_catalog` (`docs/ai-paths/semantic-grammar/nodes/index.json`)
- `tooltip_docs_catalog` (`docs/ai-paths/tooltip-catalog.json`)
- `coverage_matrix_csv` (`docs/ai-paths/node-validator-coverage-matrix.csv`)

## Inference families

### 1. Critical config presence

For critical documented config paths (for example: `entityId`, `collection`, `queryTemplate`, `event`, `modelId`, `runtime.*`), infer:

- `non_empty` candidate checks

### 2. Enum/value constraints inferred from docs text

For documented config fields with enumerated values in descriptions/defaults (for example: `provider`, `mode`, `scopeMode`, `waveform`, `idType`, `runtimeMode`, `failPolicy`), infer:

- `in` candidate checks with list values extracted from docs logic

### 3. Explicit boolean flags

For documented boolean flags with explicit defaults, infer:

- `exists` candidate checks (flag must be explicitly set)

### 4. Wiring contracts from docs snippets

For every docs wiring line (`A.port -> B.port`), infer both directions:

- `wired_to` candidate (source perspective)
- `wired_from` candidate (target perspective)

### 5. Semantic grammar graph integrity

From semantic node catalog + grammar requirements (including per-node hashes), infer graph-level checks:

- `node_types_known`
- `node_ids_unique`
- `edge_ids_unique`
- `node_positions_finite`

Additional semantic-catalog guardrails:

- detect and report semantic node hash collisions in docs snapshot warnings
- track hash-aware node catalog provenance for inference auditing

### 6. Tooltip-catalog prompt guidance

From tooltip docs entries for Regex placeholders, infer:

- `regex.aiPrompt` uses documented placeholders (`{{text}}`, `{{lines}}`, `{{value}}`) when non-empty

### 7. Coverage-matrix readiness and integrity heuristics

From coverage-matrix dimensions (`config_completeness`, `wiring_integrity`, `runtime_safety`, `provider_compatibility`, `async_correctness`, `persistence_safety`), infer:

- node-level `config` non-empty checks
- incoming/outgoing wiring readiness checks
- runtime wait-for-inputs explicitness checks
- provider-value allowlist checks when provider fields are documented
- async control-field readiness checks
- persistence safety explicitness checks
- cross-graph integrity bundle checks for semantic invariants

## Runtime policy

- Inferred rules are produced as docs candidates.
- Candidates do not execute until approved in Node Validator UI.
- Duplicate assertion IDs are deduplicated by source priority.
