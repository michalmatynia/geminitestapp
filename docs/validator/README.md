---
owner: 'Products / Platform Team'
last_reviewed: '2026-03-28'
status: 'active'
doc_type: 'index'
scope: 'feature:validator'
canonical: true
---
# Validator Docs

Generated and maintained docs for the Product Validator tool.

- Function reference: `docs/validator/function-reference.md`
- Tooltip reference: `docs/validator/tooltips.md`
- Function inventory: `docs/validator/function-inventory.md`
- Architecture: `docs/validator/architecture.md`
- Examples: `docs/validator/examples.md`
- Case Resolver plain-text patterns: `docs/validator/case-resolver-plain-text-patterns.md`
- Semantic grammar: `docs/validator/semantic-grammar/README.md`

Validation and settings APIs:

- `src/app/api/v2/products/validator-settings/`
- `src/app/api/v2/products/validator-runtime/evaluate/`

Regenerate with:

```bash
npm run docs:validator:generate
npm run docs:validator:check
```
