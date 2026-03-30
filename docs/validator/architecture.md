---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-30'
status: 'active'
doc_type: 'architecture'
scope: 'feature:validator'
canonical: true
---
# Validator Architecture

## Validation Pipeline
1. UI (`ValidatorSettings`) writes pattern definitions, launch rules, replacement strategy, and runtime config.
2. Static engine (`buildFieldIssues`) evaluates regex patterns in deterministic sequence order.
3. Runtime engine (`/api/v2/products/validator-runtime/evaluate`) evaluates DB/AI runtime patterns.
4. Maps are merged by `mergeFieldIssueMaps` and consumed by form hooks/components.

## Function Layers
- Settings orchestration: `useValidatorSettingsController`, `createSequenceActions`.
- Static evaluation: functions in `src/features/products/validation-engine/core.ts`.
- Pattern authoring helpers: `helpers.ts`, `controller-form-utils.ts`.
- Scope/list resolution: `src/features/admin/pages/validator-scope.ts`.

## Extension Points
- Add new pattern templates in `controller-sequence-actions.ts`.
- Add new replacement/runtime options in modal options + helper normalizers.
- Extend runtime evaluation contract via `runtimeType` and runtime handler.

## Performance Notes
- Sequence ordering and scope filters run before regex execution to reduce work.
- Debounce values are normalized and capped at 30 seconds.
- Runtime patterns are pre-filtered by target, locale, scope, and launch gates.
