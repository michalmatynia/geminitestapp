---
owner: 'Products / Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:validator'
canonical: true
---
# Validator Docs

This directory is the maintained documentation hub for the Product Validator
tool used in the Products admin flows.

## Open This Hub When

- you are changing validator pattern authoring, runtime evaluation, or settings UI
- you need to know which validator doc is architecture versus generated reference
- you need the regeneration commands for validator docs
- you need the related API and code-entry surfaces before editing the feature

## What The Validator Owns

- pattern authoring and ordering in the Products admin UI
- deterministic static validation over product fields
- runtime validation delegated through the validator runtime API
- tooltip and documentation surfaces used by validator settings and operators

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| How is the validator wired end to end? | [`architecture.md`](./architecture.md) |
| What functions and helpers exist today? | [`function-reference.md`](./function-reference.md) |
| What symbols exist at a lighter-weight glance? | [`function-inventory.md`](./function-inventory.md) |
| What tooltip copy and doc-backed labels exist? | [`tooltips.md`](./tooltips.md) |
| How should I reason about typical validator usage? | [`examples.md`](./examples.md) |
| How does validator logic intersect with Case Resolver plain-text handling? | [`case-resolver-plain-text-patterns.md`](./case-resolver-plain-text-patterns.md) |
| What generated semantic grammar surface exists? | [`semantic-grammar/README.md`](./semantic-grammar/README.md) |

## Current Code Map

- Settings UI and orchestration:
  `src/features/products/components/settings/validator-settings/`
- Static validation engine:
  `src/features/products/validation-engine/core.ts`
- Validator scope defaults:
  `src/features/admin/pages/validator-scope.ts`
- Generated validator docs catalog:
  `src/features/products/components/settings/validator-settings/validator-docs-catalog.ts`

Validation and settings APIs:

- `src/app/api/v2/products/validator-settings/`
- `src/app/api/v2/products/validator-runtime/evaluate/`

## Regeneration And Validation

Use the generator and coverage check together when validator docs or catalog
content changes.

| Command | Use |
| --- | --- |
| `npm run docs:validator:generate` | regenerate the validator markdown surface from the docs catalog |
| `npm run docs:validator:check` | verify validator doc coverage and catalog consistency |

## Placement Rule

- Keep validator-owned docs in `docs/validator/`.
- Treat generated files such as [`function-reference.md`](./function-reference.md)
  as script-owned when possible.
- Update this hub whenever the validator adds a new stable reference or removes
  one.
