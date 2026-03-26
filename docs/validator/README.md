---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'index'
scope: 'feature:validator'
canonical: true
---
# Validator Docs

Generated and maintained docs for the Product Validator tool.

## Canonical entrypoints

- Maintained behavior and architecture: `docs/validator/architecture.md`
- Maintained example flows: `docs/validator/examples.md`
- Case Resolver-specific pack reference: `docs/validator/case-resolver-plain-text-patterns.md`
- Semantic grammar hub: `docs/validator/semantic-grammar/README.md`

## Maintained references

- Function and runtime architecture: `docs/validator/architecture.md`
- Worked examples: `docs/validator/examples.md`
- Case Resolver plain-text patterns: `docs/validator/case-resolver-plain-text-patterns.md`
- Semantic grammar hub: `docs/validator/semantic-grammar/README.md`

## Generated reference surfaces

- Function reference: `docs/validator/function-reference.md`
- Tooltip reference: `docs/validator/tooltips.md`
- Function inventory: `docs/validator/function-inventory.md`

## Owning runtime surfaces

- Admin UI: `src/app/(admin)/admin/validator/ClientPage.tsx`
- Pattern-list admin page: `src/features/admin/pages/AdminValidatorPatternListsPage.tsx`
- Settings composition root: `src/features/products/components/settings/ValidatorSettings.tsx`
- Static evaluation engine: `src/features/products/validation-engine/core.ts`
- Runtime evaluator endpoint: `src/app/api/v2/products/validator-runtime/evaluate/`

## Validation and settings APIs

- `src/app/api/v2/products/validator-settings/`
- `src/app/api/v2/products/validator-runtime/evaluate/`

## Generator and check workflow

Regenerate maintained/generated validator docs with:

```bash
npm run docs:validator:generate
npm run docs:validator:check
```

Use the generated docs for symbol-level lookup, but keep operator workflow,
architecture, and examples in the maintained prose docs above.

Do not hand-edit the generated validator surfaces unless the generator itself is
also being updated in the same change.
