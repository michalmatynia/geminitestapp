---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-11T04:30:37.106Z

## Summary

- Status: PASSED
- Files scanned: 4612
- Errors: 0
- Warnings: 0
- Info: 4

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 0 |
| eslintDisableCount | 1 |
| nonNullAssertionCount | 3 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| import/order | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 1 |
| non-null-assertion | 0 | 0 | 3 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/app/api/ai-paths/runs/enqueue/handler.ts:186 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/cms/context-registry/page-builder.ts:231 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/shared/contracts/integrations/index.ts:1 | eslint-disable comment disabling: import/order |
| INFO | non-null-assertion | src/shared/lib/ai-paths/hooks/trigger-event-settings.ts:268 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
