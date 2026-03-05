# AI-Paths Kernel Parser Pattern Lists (UI Rollout)

This runbook defines the two UI-managed validation pattern lists introduced for AI-Paths Kernel parser coverage.

No runtime hardcoding is required. Rules are sourced from central docs assertions and activated through Node Validator UI.

## Lists

1. `kernel-node-code-parser-v1`
2. `kernel-node-path-code-parser-v1`

## Source files

1. `docs/ai-paths/node-validator-node-code-parser-patterns.md`
2. `docs/ai-paths/node-validator-node-path-code-parser-patterns.md`
3. `docs/ai-paths/node-validator-central-manifest.json`

## Sequence groups

For `kernel-node-code-parser-v1`:

1. `node_code_preflight` (`310-320`)
2. `node_code_ports` (`330-340`)
3. `node_code_validation_pattern_runtime` (`350-360`)

For `kernel-node-path-code-parser-v1`:

1. `node_path_graph` (`410-430`)
2. `node_path_execution_shape` (`440-450`)

## UI activation

1. Open `Admin -> AI Paths -> Validation`.
2. Click `Sync From Central Docs`.
3. In candidate filters, use tag:
   - `pattern-list:kernel-node-code-parser-v1`
   - `pattern-list:kernel-node-path-code-parser-v1`
4. Optionally narrow by sequence tags:
   - `sequence:node_code_preflight`
   - `sequence:node_code_ports`
   - `sequence:node_code_validation_pattern_runtime`
   - `sequence:node_path_graph`
   - `sequence:node_path_execution_shape`
5. Approve candidates in sequence order (lowest `sequenceHint` first).
6. Save validation config for the target AI Path.

## Acceptance checks

1. Candidate sync includes both source ids:
   - `node-code-parser-patterns`
   - `node-path-code-parser-patterns`
2. Approved rules appear in Rules Inventory with expected `sequence`.
3. Preflight failures map to parser rule ids (for example: `kernel.node_path_code.edge_ports_declared`).
4. No node-id/token-specific runtime branch was added to engine code for this rollout.
