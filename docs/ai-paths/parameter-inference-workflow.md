---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# Parameter Inference AI Path Workflow (English)

## Scope

- Input: product `name` + product images from Product Modal trigger context.
- Output: auto-filled `product.parameters` entries in English.
- Non-goals: translation/localization of inferred parameter values.

## Acceptance Criteria

1. A Product Modal trigger button `Infer Parameters` is visible next to `Infer Fields`.
2. Trigger launches the `Parameter Inference` path.
3. Workflow reads parameter definitions from `product_parameters` by catalog, with fallback to `product.parameters[].parameterId` when catalog context is missing.
4. Model output is validated as JSON array with shape `{ "parameterId": "...", "value": "..." }`; one repair parse pass is attempted for noisy JSON text.
5. Update writes only valid parameter IDs.
6. For selector types `radio/select/dropdown`, value must match allowed `optionLabels`.
7. If parameter definitions are not resolved, update is blocked with explicit runtime error (`No parameter definitions resolved for parameter inference.`).
8. Writes are merge-safe: blank existing values are filled, non-empty existing values are preserved.
9. Final product payload always materializes full catalog parameter rows, with empty-string values for not-inferred parameters.
10. Runtime keeps debug payload for dropped/accepted/written parameter entries.

## Runtime Guard (Database Node)

- `database.parameterInferenceGuard.enabled = true`
- `targetPath = "parameters"`
- `definitionsPort = "result"`
- `definitionsPath = ""`
- `enforceOptionLabels = true`
- `allowUnknownParameterIds = false`

## Data Prerequisites

1. Products must have `catalogId` when available.
2. If `catalogId` is missing, `product.parameters[].parameterId` must be present to enable fallback definition lookup.

## Test Matrix

1. Product with valid `catalogId`, clear title/images -> expected accepted parameters > 0.
2. Product without `catalogId`, but existing parameter IDs -> fallback query resolves definitions and writes values.
3. Product without `catalogId` and without parameter IDs -> run is blocked by hard gate with explicit error.
4. Model output wrapped in extra text/markdown -> repair pass extracts JSON array.
5. Unknown `parameterId` values -> dropped by guard.
6. Invalid option labels for `radio/select/dropdown` -> dropped by guard.
7. Duplicate `parameterId` values -> first accepted, duplicates dropped.
8. Existing non-empty parameter value + conflicting inference -> existing value preserved.
9. Existing empty parameter value + inferred value -> empty value is filled.
10. Partial or sparse inference output -> product still keeps full parameter template rows with empty values where missing.

## Regression Baseline

- SKU `KEYCHA1078` must pass after catalog backfill and write at least one inferred parameter in non-dry run.
- No silent success with zero definitions is allowed.

## Rollout Metrics

- Path run success rate.
- Average accepted parameters per run.
- Dropped counts by reason: unknown parameter ID, invalid option, empty candidate value, duplicate, invalid shape.
- Write diagnostics: planned merges, filled blanks, preserved non-empty, appended missing template rows, modified count.
- Manual correction rate in Product form after inference.

## Operational Notes

- This path is auto-seeded and auto-repaired from AI Paths settings store.
- If settings are missing/corrupt, the workflow and trigger button are re-created automatically.
