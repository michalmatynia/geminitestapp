# Testing Coverage Audit - 2026-05-15

## Missing Test Suites
The following feature modules lack a corresponding test directory in `__tests__/features`:
- `job-board`
- `page-manager`
- `pdf-export`

## Mismatched/Renamed Modules
- `case-resolver`: Tests exist in `case-resolver-capture`. Investigation required to determine if `case-resolver` module is missing coverage or if mapping is broken.
- `observability`: Exists in tests but is now a shared library in `src/shared/lib/observability`.
- `prompt-core`: Exists in tests, but `src/features/prompt-core` is missing (likely renamed or merged).

## Action Plan
1. Validate existing test suites for `case-resolver-capture`.
2. Map `chatbot` coverage.
3. Prioritize creation of test stubs for `job-board`, `page-manager`, and `pdf-export`.
4. Update `scan-latest.json` for the `testing-quality-baseline` track to reflect the missing coverage.
