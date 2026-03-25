---
owner: 'Platform Team'
last_reviewed: '2026-03-25'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Context Health Check

Generated at: 2026-03-25T09:30:26.054Z

## Summary

- Status: PASSED
- Context files scanned: 243
- Errors: 0
- Warnings: 0
- Info: 1

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| context-missing-split | 0 | 0 | 1 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | context-missing-split | src/features/kangur/admin/admin-kangur-social/SocialPostContext.tsx | Context has no companion useXxxState/useXxxActions hooks. Consider the state/actions split pattern for re-render optimization. |

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
