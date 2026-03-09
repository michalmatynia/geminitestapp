---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 26 Execution: Lint-Domain Test-Tree Stabilization

Date: 2026-03-05

## Objective

Stabilize full test-tree lint-domain mode from partial (`2/5`) to full pass (`5/5`) so it is ready for CI-gate promotion.

## Implemented Artifacts

- Applied targeted lint remediation to previously failing Products, AI Paths, and Case Resolver test files:
  - ran scoped `eslint --fix` only on files reported by lint-domain test-tree output
  - resolved remaining non-auto-fixable lint errors manually (mostly `no-useless-escape` string/regex escapes)
- Key manual cleanups:
  - `src/features/ai/ai-paths/components/__tests__/AiPathsSettingsUtils.sanitize-path-config.test.ts`
  - `src/features/ai/ai-paths/hooks/__tests__/useAiPathTriggerEvent.sanitize.test.ts`
  - `src/features/ai/ai-paths/server/__tests__/settings-store.keys-cache.test.ts`
- Refreshed reports:
  - `docs/metrics/lint-domain-checks-latest.json`
  - `docs/metrics/lint-domain-checks-latest.md`
  - `docs/metrics/lint-domain-checks-2026-03-05T05-13-16-208Z.json`
  - `docs/metrics/lint-domain-checks-2026-03-05T05-13-16-208Z.md`

## Validation

- `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree --strict --ci --no-history`: pass (`5/5`)
- `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree`: pass (`5/5`, history written)

## Notes

- Remaining findings in test-tree mode are warnings, not errors; strict gate now passes cleanly on error criteria.
