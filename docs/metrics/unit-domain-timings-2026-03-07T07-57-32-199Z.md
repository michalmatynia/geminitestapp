# Unit Domain Timings Report

Generated at: 2026-03-07T07:57:32.199Z

## Summary

- Domains: 5
- Passed: 3
- Failed: 2
- Total duration: 4.5m

## Domain Status

| Domain | Status | Duration | Exit |
| --- | --- | ---: | ---: |
| Auth | PASS | 8.6s | 0 |
| Products | FAIL | 59.4s | 1 |
| AI Paths | FAIL | 1.7m | 1 |
| Image Studio | PASS | 33.6s | 0 |
| Case Resolver | PASS | 1.0m | 0 |

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
