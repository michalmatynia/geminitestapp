# Context Health Check

Generated at: 2026-03-08T17:42:47.700Z

## Summary

- Status: PASSED
- Context files scanned: 237
- Errors: 0
- Warnings: 0
- Info: 0

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

All contexts are healthy.

## Notes

- `context-generic-error` (warn): Use structured AppError classes for better observability.
- `context-monolith` (warn): Contexts with >15 fields should be split.
- `context-oversized` (warn): Context files over 500 LOC need refactoring.
- `context-missing-split` (info): Consider useXxxState/useXxxActions pattern for re-render optimization.
