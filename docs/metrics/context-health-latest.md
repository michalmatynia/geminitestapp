---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-03-09T09:07:30.242Z

## Summary

- Status: WARN
- Context files scanned: 240
- Errors: 0
- Warnings: 2
- Info: 2

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-generic-error | 0 | 1 | 0 |
| context-oversized | 0 | 1 | 0 |
| context-missing-split | 0 | 0 | 2 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-generic-error | src/features/ai/ai-context-registry/context/page-context.tsx | Context uses generic `throw new Error()`. Consider using a structured AppError for better error tracking. |
| WARN | context-oversized | src/features/products/context/ProductStudioContext.tsx | Context file is 529 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| INFO | context-missing-split | src/features/ai/ai-context-registry/context/page-context.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |
| INFO | context-missing-split | src/features/kangur/ui/context/KangurLoginModalContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
