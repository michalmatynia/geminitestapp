---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'architecture'
scope: 'feature:validator'
canonical: true
---
# Validator Architecture

This is the maintained high-level architecture reference for the validator
feature. Use the generated docs for exact symbol/tooling inventories rather than
expanding this file into a full API catalog:

- `docs/validator/function-reference.md`
- `docs/validator/function-inventory.md`
- `docs/validator/tooltips.md`

## Operator entrypoints

- Admin route: `src/app/(admin)/admin/validator/ClientPage.tsx`
- Pattern-list management page: `src/features/admin/pages/AdminValidatorPatternListsPage.tsx`
- Product settings composition root: `src/features/products/components/settings/ValidatorSettings.tsx`
- Runtime evaluation endpoint: `src/app/api/v2/products/validator-runtime/evaluate/`

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

## Validation and doc lanes

- Docs generation/check: `npm run docs:validator:generate`, `npm run docs:validator:check`
- Runtime/settings surfaces:
  - `src/app/api/v2/products/validator-settings/`
  - `src/app/api/v2/products/validator-runtime/evaluate/`

## Performance Notes
- Sequence ordering and scope filters run before regex execution to reduce work.
- Debounce values are normalized and capped at 30 seconds.
- Runtime patterns are pre-filtered by target, locale, scope, and launch gates.
