---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'plan'
scope: 'feature:ai-paths'
canonical: true
---

# Port Contracts V3 Design (2026-03-06)

This is a retained design-baseline document from the March 2026 AI Paths
planning wave. Keep it as the detailed rationale for the V3 contract expansion,
but use the maintained AI Paths docs for current runtime and operator guidance:

- [`./overview.md`](./overview.md)
- [`./reference.md`](./reference.md)
- [`./ai-paths-improvements-plan-2026-03-06.md`](./ai-paths-improvements-plan-2026-03-06.md)

## References

1. `docs/ai-paths/ai-paths-improvements-plan-2026-03-06.md`
2. `docs/ai-paths/ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`
3. `src/shared/contracts/ai-paths-core/nodes.ts`
4. `src/shared/lib/ai-paths/core/validation-engine/`
5. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`

## Goal

Extend the existing port-contract model so AI Paths can validate value shape and intent, not only port names, requiredness, and fan-in.

This is an extension of the current contract surface. It is not a replacement.

## Current State

Today the canonical port contract is:

1. `required?: boolean`
2. `cardinality?: 'single' | 'many'`

This already solves:

1. required versus optional input gating
2. single-port versus multi-port fan-in
3. partial compile-time wiring validation

It does not yet solve:

1. canonical value kind
2. schema-level validation
3. helpful runtime mismatch errors
4. explicit coercion intent

## Decision Summary

Port Contracts V3 adds type semantics by extending `nodePortContractSchema` with:

1. `kind`
2. `schema`
3. `schemaRef`

`required` and `cardinality` remain the canonical requiredness and multiplicity fields.

## Proposed Contract

### Contract shape

Proposed logical shape:

```ts
type NodePortValueKind =
  | 'unknown'
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'image_url'
  | 'bundle'
  | 'job_envelope';

type NodePortContractV3 = {
  required?: boolean;
  cardinality?: 'single' | 'many';
  kind?: NodePortValueKind;
  schema?: Record<string, unknown>;
  schemaRef?: string;
};
```

### Rules

1. `kind` describes the base unit type, not multiplicity.
2. Multiplicity continues to use `cardinality`.
3. `kind='image_url'` plus `cardinality='many'` means image URL list.
4. `schema` is optional structured metadata for stricter validation.
5. `schemaRef` is optional and reserved for shared schema registry usage later.
6. `unknown` is the backward-compatible default when no kind is declared.

## Initial Kind Set

The first V1 slice should stay deliberately small:

1. `unknown`
2. `string`
3. `number`
4. `boolean`
5. `json`
6. `image_url`
7. `bundle`
8. `job_envelope`

Rationale:

1. These kinds cover the most painful current mismatches without forcing a full ontology redesign.
2. They map well to existing AI Paths runtime behavior and current node families.
3. More specialized kinds can be layered later without blocking V1.

## Mapping Rules

### Port lists remain valid

Existing `inputs: string[]` and `outputs: string[]` stay authoritative for:

1. visible port names
2. edge endpoints
3. canonical port ordering

Contracts remain overlays on those port lists.

### Input versus output contracts

1. `inputContracts` govern what a node is willing to consume.
2. `outputContracts` govern what a node promises to emit.
3. If a node defines only input contracts, output validation falls back to runtime observation plus optional node-definition defaults.
4. If neither exists, runtime behavior remains backward-compatible and kind defaults to `unknown`.

## Validation Ownership

### Compile-time validation should catch

1. obvious single-to-many or many-to-single incompatibilities when both sides declare cardinality
2. obvious kind mismatches when both sides declare stable kinds
3. missing required wiring for ports marked required

### Runtime validation should catch

1. dynamic kind mismatches where the upstream output kind depends on execution outcome
2. schema-level mismatch after value materialization
3. coercion-dependent flows where no adapter node is present

### Error contract

Canonical runtime mismatch messages should include:

1. source node id or title
2. source port
3. target node id or title
4. target port
5. expected `kind` and `cardinality`
6. received `kind` and `cardinality`
7. optional schema hint if schema validation failed

Example shape:

```txt
Port contract mismatch: expected image_url[many] on parser.images, received string[single] from prompt.result.
```

## Adapter Node Policy

Type coercion should be explicit.

The first adapter set should include:

1. `to_array`
2. `first`
3. `flatten`
4. `json_parse`
5. `stringify`

Rules:

1. Validation should prefer an explicit adapter over implicit coercion.
2. Runtime may still preserve narrow compatibility coercions where required for legacy paths, but those should emit warnings until migrated.
3. Adapter nodes should declare precise input and output contracts so they improve searchability and traceability.

## Backward Compatibility

1. All new fields are optional.
2. Omitted `kind` means `unknown`.
3. Existing required or optional gating keeps current behavior.
4. Existing cardinality behavior keeps current behavior.
5. Legacy paths with no contract metadata continue to validate and execute.

## Persistence and Canonicalization

1. New fields belong in existing `inputContracts` and `outputContracts`.
2. No parallel contract store should be introduced.
3. Generated docs, semantic grammar, and canonical checks must eventually reflect the new fields.
4. Portable schema diff checks should treat these additions as compatible only after allowlist or migration review where required.

## Initial Node Targets

The first pass should prioritize nodes where user pain is already visible:

1. `prompt`
2. `parser`
3. `model`
4. `http`
5. `api_advanced`
6. `bundle`
7. `viewer`
8. `poll`

## Non-Goals For V1

1. Full semantic type inference across arbitrary user expressions
2. Arbitrary zod source-code persistence in path configs
3. Exhaustive schema registry infrastructure
4. Forcing every existing node to declare every contract before rollout

## Implementation Touchpoints

### Contracts

1. `src/shared/contracts/ai-paths-core/nodes.ts`
2. `src/shared/contracts/ai-paths.ts`

### Validation

1. `src/shared/lib/ai-paths/core/validation-engine/`
2. `src/shared/lib/ai-paths/core/runtime/engine-core.ts`
3. `src/shared/lib/ai-paths/core/runtime/engine-modules/engine-utils.ts`

### UI

1. `src/features/ai/ai-paths/components/node-config/dialog/RuntimeNodeConfigSection.tsx`

## Acceptance Checks

1. Legacy paths validate with no config migration.
2. A compile-detectable mismatch fails before execution.
3. A runtime-only mismatch fails with a canonical message.
4. Adapter nodes make previously ambiguous coercion flows explicit.
5. `required` and `cardinality` semantics remain unchanged for existing paths.

## Open Follow-Ups

1. Add shared docs generation for kind metadata in semantic grammar and node docs.
2. Add path-linter rules for kind mismatch before runtime.
3. Expand kind set only after initial V1 rollout stabilizes.
