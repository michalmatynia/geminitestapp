---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unit Domain Timings Report

Generated at: 2026-03-09T07:50:41.755Z

## Summary

- Domains: 5
- Passed: 5
- Failed: 0
- Total duration: 4.4m

## Domain Status

| Domain | Status | Duration | Exit |
| --- | --- | ---: | ---: |
| Auth | PASS | 8.1s | 0 |
| Products | PASS | 57.0s | 0 |
| AI Paths | PASS | 1.4m | 0 |
| Image Studio | PASS | 40.8s | 0 |
| Case Resolver | PASS | 1.2m | 0 |

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
