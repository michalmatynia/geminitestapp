---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unit Domain Timings Report

Generated at: 2026-03-16T10:14:09.866Z

## Summary

- Domains: 5
- Passed: 4
- Failed: 1
- Total duration: 14.3m

## Domain Status

| Domain | Status | Duration | Exit |
| --- | --- | ---: | ---: |
| Auth | PASS | 10.4s | 0 |
| Products | PASS | 1.7m | 0 |
| AI Paths | FAIL | 10.0m | 1 |
| Image Studio | PASS | 55.3s | 0 |
| Case Resolver | PASS | 1.5m | 0 |

## Domain Filters

### Auth

- `__tests__/features/auth`
- `__tests__/api/auth`
- `src/features/auth`

### Products

- `__tests__/features/products`
- `__tests__/api/products`
- `src/features/products`
- `__tests__/shared/contracts/products-contracts.test.ts`

### AI Paths

- `__tests__/features/ai/ai-paths`
- `__tests__/api/ai-paths`
- `__tests__/api/ai-paths-`
- `src/features/ai/ai-paths`

### Image Studio

- `__tests__/features/ai/image-studio`
- `src/features/ai/image-studio`

### Case Resolver

- `src/features/case-resolver`
- `src/features/case-resolver-capture`
- `__tests__/features/case-resolver-capture`
- `src/features/prompt-exploder/__tests__/case-resolver`

## Notes

- Each domain executes independently to expose timing hotspots and isolate regressions.
- Use `npm run test:unit:domains` locally and strict mode in CI for a deterministic quality gate.
