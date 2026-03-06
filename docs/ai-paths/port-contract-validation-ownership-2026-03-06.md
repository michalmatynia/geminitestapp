# Port Contract Validation Ownership (2026-03-06)

## References

1. `docs/ai-paths/port-contracts-v3-design-2026-03-06.md`
2. `docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`
3. `src/shared/lib/ai-paths/core/validation-engine/runtime-middleware.ts`
4. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
5. `src/features/ai/ai-paths/services/path-run-executor/preflight.ts`

## Goal

Define which port-contract failures belong to compile validation, runtime validation, or both, using the existing AI Paths validation stages:

1. `graph_parse`
2. `graph_bind`
3. `node_pre_execute`
4. `node_post_execute`

The purpose is to avoid duplicate, contradictory, or missing enforcement as Port Contracts V3 lands.

## Decision Summary

1. Structure and wiring issues should fail before execution.
2. Materialized value issues should fail at runtime.
3. If the system can prove a mismatch statically, compile validation owns it.
4. If the system can only observe a mismatch after values exist, runtime validation owns it.
5. When both layers can detect the same class of problem, compile validation should block first and runtime validation should act as the safety net.

## Existing Enforcement Surface

### Preflight and compile-adjacent checks

Current pre-execution enforcement already exists in:

1. enqueue or preflight validation in `src/features/ai/ai-paths/services/path-run-executor/preflight.ts`
2. graph-level runtime validation stages in `graph_parse` and `graph_bind`

### Runtime middleware

Current runtime middleware already supports:

1. `graph_parse`
2. `graph_bind`
3. `node_pre_execute`
4. `node_post_execute`

This means Port Contracts V3 should be layered into the existing stage model rather than inventing a new validator path.

## Ownership Matrix

### `graph_parse`

Owns:

1. malformed contract definitions
2. invalid contract enum values
3. impossible contract combinations in node definitions

Examples:

1. unknown `kind` value
2. invalid `cardinality` token
3. malformed inline schema metadata

Result:

1. block path validation immediately

### `graph_bind`

Owns:

1. edge-level incompatibility when both sides declare enough stable metadata
2. required-port missing wiring
3. single versus many incompatibility that is statically knowable

Examples:

1. upstream declares `string single`, downstream requires `image_url many`
2. required input has no source edge
3. output contract explicitly `many`, input contract explicitly `single`

Result:

1. block before execution

### `node_pre_execute`

Owns:

1. mismatches visible from actual input values before handler execution
2. missing adapter-node issues when the wiring is valid but the materialized shape is not
3. runtime-only schema mismatch on inputs

Examples:

1. upstream output is dynamically a string but downstream expects `json`
2. downstream expects `image_url many`, receives one string scalar with no `to_array` adapter
3. bundle input is present but fails input schema validation

Result:

1. block node execution
2. persist canonical mismatch diagnostics in runtime events, node outputs, and trace metadata

### `node_post_execute`

Owns:

1. output contract violations after a handler returns
2. schema mismatch on emitted outputs
3. canonicalization failures where handler output shape is invalid for its declared contract

Examples:

1. node declares output `job_envelope` but emits plain string
2. node declares `image_url many` but emits one invalid URL scalar
3. node declares `json` with schema and returns incompatible payload

Result:

1. block downstream consumption
2. mark node as failed or blocked according to runtime policy

## Shared Safety-Net Rule

If compile validation misses a mismatch because:

1. legacy config omitted metadata
2. output shape is dynamic
3. schema depends on runtime configuration

then runtime validation remains authoritative.

Compile validation should never be the only enforcement path for Port Contracts V3.

## Recommended Rule Mapping

### Compile-blocking rules

1. invalid contract shape
2. missing required edge
3. explicit cardinality contradiction
4. explicit stable kind contradiction

### Runtime-blocking rules

1. value kind mismatch
2. schema mismatch
3. missing explicit adapter where runtime coercion would otherwise be ambiguous

### Warning-only rules

1. legacy path relies on compatibility coercion
2. contract metadata is incomplete so runtime must infer shape
3. output kind is declared `unknown` on a node family that should eventually become typed

## Error Taxonomy Guidance

Port Contracts V3 should standardize a small error taxonomy:

1. `AI_PATHS_PORT_CONTRACT_INVALID`
2. `AI_PATHS_PORT_CONTRACT_BIND_MISMATCH`
3. `AI_PATHS_PORT_CONTRACT_INPUT_MISMATCH`
4. `AI_PATHS_PORT_CONTRACT_OUTPUT_MISMATCH`
5. `AI_PATHS_PORT_CONTRACT_SCHEMA_MISMATCH`
6. `AI_PATHS_PORT_CONTRACT_ADAPTER_REQUIRED`

These codes should be available to:

1. run events
2. runtime history
3. trace spans
4. user-facing error rendering

## Legacy Compatibility Rules

1. Missing `kind` must not fail by itself.
2. Missing `schema` must not fail by itself.
3. Existing `required` and `cardinality` behavior remains unchanged.
4. Compatibility coercions may remain temporarily, but should emit warnings where practical.

## Initial Enforcement Priorities

The first sprint should prioritize cases that maximize usability:

1. `image_url single` versus `image_url many`
2. `json` versus `string`
3. `job_envelope` versus plain `jobId`
4. `bundle` versus scalar value

## Acceptance Checks

1. Every Port Contracts V3 rule maps to exactly one primary enforcement stage.
2. Compile and runtime layers do not emit contradictory decisions for the same stable mismatch.
3. Runtime remains a safety net for legacy and dynamic cases.
