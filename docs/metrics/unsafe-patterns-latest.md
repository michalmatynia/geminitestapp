---
owner: 'Platform Team'
last_reviewed: '2026-03-23'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unsafe Patterns Check

Generated at: 2026-03-23T10:42:19.145Z

## Summary

- Status: PASSED
- Files scanned: 5702
- Errors: 0
- Warnings: 0
- Info: 45

## Trend Counters

| Metric | Count |
| --- | ---: |
| doubleAssertionCount | 0 |
| anyCount | 26 |
| eslintDisableCount | 11 |
| nonNullAssertionCount | 8 |
| tsIgnoreCount | 0 |
| tsExpectErrorCount | 0 |

## Top Disabled ESLint Rules

| Rule | Count |
| --- | ---: |
| @typescript-eslint/no-unsafe-assignment | 7 |
| @typescript-eslint/no-unsafe-call | 6 |
| @typescript-eslint/no-unsafe-member-access | 6 |
| @typescript-eslint/no-unsafe-argument | 5 |
| @typescript-eslint/no-explicit-any | 4 |
| -- | 1 |
| catch-all | 1 |
| route | 1 |
| modules | 1 |
| define | 1 |
| their | 1 |
| own | 1 |
| param | 1 |
| shapes. | 1 |
| @typescript-eslint/no-unsafe-return | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| eslint-disable | 0 | 0 | 11 |
| explicit-any | 0 | 0 | 26 |
| non-null-assertion | 0 | 0 | 8 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | non-null-assertion | src/app/api/ai-paths/runs/enqueue/handler.ts:145 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/cms/context-registry/page-builder.ts:231 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/admin/admin-kangur-social/hooks/useSocialPipelineRunner.ts:331 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/duels/server.db.ts:545 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/server/social-posts-docs.ts:180 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/server/social-posts-docs.ts:212 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | non-null-assertion | src/features/kangur/ui/login-page/use-turnstile.ts:107 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/features/products/performance/monitoring.ts:294 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call |
| INFO | non-null-assertion | src/shared/lib/ai-paths/core/normalization/stored-trigger-path-config.ts:360 | Non-null assertion operator `!`. Consider using optional chaining or a null check. |
| INFO | eslint-disable | src/shared/lib/api/catch-all-route-types.ts:12 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any -- catch-all route modules define their own param shapes. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:31 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:66 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:76 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:93 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:103 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:114 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:127 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:148 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:157 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:182 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:213 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:232 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/auth-sync.ts:249 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/shared/lib/db/services/sync/catalog-sync.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument |
| INFO | eslint-disable | src/shared/lib/db/services/sync/cms-sync.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | eslint-disable | src/shared/lib/db/services/sync/cms-sync.ts:2 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument |
| INFO | explicit-any | src/shared/lib/db/services/sync/cms-sync.ts:171 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/cms-sync.ts:191 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/cms-sync.ts:214 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/cms-sync.ts:248 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/cms-sync.ts:269 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/cms-sync.ts:289 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/shared/lib/db/services/sync/geo-sync.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access |
| INFO | eslint-disable | src/shared/lib/db/services/sync/image-sync.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | eslint-disable | src/shared/lib/db/services/sync/image-sync.ts:2 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument |
| INFO | explicit-any | src/shared/lib/db/services/sync/image-sync.ts:114 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/image-sync.ts:139 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | eslint-disable | src/shared/lib/db/services/sync/notes-sync.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return |
| INFO | eslint-disable | src/shared/lib/db/services/sync/system-sync.ts:1 | eslint-disable comment disabling: @typescript-eslint/no-explicit-any |
| INFO | eslint-disable | src/shared/lib/db/services/sync/system-sync.ts:2 | eslint-disable comment disabling: @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument |
| INFO | explicit-any | src/shared/lib/db/services/sync/system-sync.ts:198 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/system-sync.ts:217 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/system-sync.ts:242 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/system-sync.ts:268 | Explicit `any` type usage. Consider using a specific type or `unknown`. |
| INFO | explicit-any | src/shared/lib/db/services/sync/system-sync.ts:298 | Explicit `any` type usage. Consider using a specific type or `unknown`. |

## Notes

- `double-assertion` (error): `as unknown as` bypasses type safety. Use type guards or proper narrowing.
- `ts-ignore-no-reason` / `ts-expect-error-no-reason` (warn): Always explain why a suppression is needed.
- `explicit-any` (info): Track trend over time. Prefer `unknown` or specific types.
- `eslint-disable` (info): Track which rules are most frequently disabled.
- `non-null-assertion` (info): Prefer optional chaining `?.` or explicit null checks.
