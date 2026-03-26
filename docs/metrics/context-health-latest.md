---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-03-26T12:50:54.285Z

## Summary

- Status: WARN
- Context files scanned: 243
- Errors: 0
- Warnings: 2
- Info: 1

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-oversized | 0 | 2 | 0 |
| context-missing-split | 0 | 0 | 1 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | context-oversized | src/features/kangur/ui/context/KangurAuthContext.tsx | Context file is 503 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| WARN | context-oversized | src/features/kangur/ui/context/KangurLearnerProfileRuntimeContext.tsx | Context file is 501 lines (threshold: 500). Consider extracting logic into hooks or splitting the context. |
| INFO | context-missing-split | src/features/kangur/admin/admin-kangur-social/SocialPostContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
