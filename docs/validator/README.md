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

Maintained references:

- Function and runtime architecture: `docs/validator/architecture.md`
- Worked examples: `docs/validator/examples.md`
- Case Resolver plain-text patterns: `docs/validator/case-resolver-plain-text-patterns.md`
- Semantic grammar hub: `docs/validator/semantic-grammar/README.md`

Generated reference surfaces:

- Function reference: `docs/validator/function-reference.md`
- Tooltip reference: `docs/validator/tooltips.md`
- Function inventory: `docs/validator/function-inventory.md`

Validation and settings APIs:

- `src/app/api/v2/products/validator-settings/`
- `src/app/api/v2/products/validator-runtime/evaluate/`

Regenerate with:

```bash
npm run docs:validator:generate
npm run docs:validator:check
```

Do not hand-edit the generated validator surfaces unless the generator itself is
also being updated in the same change.
