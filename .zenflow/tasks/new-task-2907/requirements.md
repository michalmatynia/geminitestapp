# Product Requirements Document: ESLint Code Quality Improvements

## Executive Summary

Address all ESLint violations across the codebase to improve code quality, consistency, and maintainability. The project currently has **63,854 ESLint issues** (62,358 errors and 1,496 warnings), with 62,277 errors and 15 warnings being auto-fixable.

## Background

The project uses a strict ESLint configuration with TypeScript, React, Next.js, and import ordering rules. The codebase has accumulated significant technical debt in the form of style violations and TypeScript type safety issues that need to be systematically addressed.

## Current State

### ESLint Configuration

- **ESLint Version**: 9.39.2 (flat config format)
- **Parser**: typescript-eslint
- **Plugins**: TypeScript, React, React Hooks, Import, Next.js
- **Target Directories**: `src/` and `__tests__/`

### Issue Breakdown

Total issues: **63,854** (62,358 errors + 1,496 warnings)
Auto-fixable: **62,292** issues (62,277 errors + 15 warnings)

#### Top Violations by Rule

| Rule                                         | Count    | Type         | Auto-fixable |
| -------------------------------------------- | -------- | ------------ | ------------ |
| `quotes`                                     | 47,451   | Style        | Yes          |
| `indent`                                     | 11,028   | Style        | Yes          |
| `import/order`                               | 3,603    | Organization | Yes          |
| `@typescript-eslint/no-unsafe-member-access` | 508      | Type Safety  | No           |
| `@typescript-eslint/no-unsafe-assignment`    | 332      | Type Safety  | No           |
| `@typescript-eslint/no-unsafe-call`          | 301      | Type Safety  | No           |
| `semi`                                       | 217      | Style        | Yes          |
| `@typescript-eslint/no-unsafe-argument`      | 153      | Type Safety  | No           |
| `@typescript-eslint/no-explicit-any`         | 102      | Type Safety  | Partial      |
| `@typescript-eslint/no-unsafe-return`        | 55       | Type Safety  | No           |
| `no-useless-escape`                          | 32       | Logic        | Yes          |
| `@typescript-eslint/no-unused-vars`          | 28       | Code Quality | No           |
| Other rules                                  | <50 each | Various      | Mixed        |

#### Most Affected Directories

| Directory                                                | Files with Issues |
| -------------------------------------------------------- | ----------------- |
| `src/shared/ui`                                          | 62                |
| `src/features/cms/components/page-builder`               | 28                |
| `src/features/ai/ai-paths/components/node-config/dialog` | 27                |
| `src/features/cms/components/frontend/sections`          | 21                |
| `src/features/products/hooks`                            | 20                |
| `src/features/ai/ai-paths/components`                    | 19                |
| `src/shared/types/domain`                                | 17                |
| `__tests__/features/agent-runtime/services`              | 14                |

## Objectives

1. **Fix all auto-fixable issues** using `eslint --fix`
2. **Manually address remaining type safety issues** that cannot be auto-fixed
3. **Ensure no new issues are introduced** during the fixing process
4. **Verify application functionality** after fixes

## Requirements

### Functional Requirements

#### FR1: Auto-fix Style Issues

- Execute `eslint --fix` to automatically resolve style violations
- Target rules: `quotes`, `indent`, `semi`, `import/order`
- Expected resolution: ~62,000 issues fixed automatically

#### FR2: Address Type Safety Issues

- Fix TypeScript `any` type usage by providing proper types
- Resolve unsafe assignments, calls, and member access
- Add proper type guards where necessary
- Target rules:
  - `@typescript-eslint/no-unsafe-*` family (1,349 issues)
  - `@typescript-eslint/no-explicit-any` (102 issues)

#### FR3: Remove Unused Variables

- Remove or prefix unused variables with `_`
- Target rule: `@typescript-eslint/no-unused-vars` (28 issues)

#### FR4: Fix Logic Issues

- Address useless escape sequences
- Fix redeclarations
- Clean up empty blocks
- Target rules: `no-useless-escape`, `no-redeclare`, `no-empty` (~43 issues)

#### FR5: Enforce Import Restrictions

- Ensure `src/shared` doesn't import from `src/features`
- Ensure `src/app/api` doesn't import from `src/features`
- Target rule: `import/no-restricted-paths` (5 issues)

### Non-Functional Requirements

#### NFR1: Code Quality

- No regressions in code functionality
- Maintain existing behavior
- All fixes must pass TypeScript compilation

#### NFR2: Testing

- Run existing test suite after fixes
- Ensure all tests pass
- No test modifications required unless fixing actual bugs

#### NFR3: Performance

- Build time should not increase
- Runtime performance should not degrade

#### NFR4: Maintainability

- Code should be more maintainable after fixes
- Type safety improvements should prevent future bugs

## Success Criteria

1. ✅ ESLint reports **0 errors and 0 warnings** when running `npm run lint`
2. ✅ TypeScript compilation succeeds (`npm run build`)
3. ✅ All tests pass (`npm run test`)
4. ✅ Application runs without errors (`npm run dev`)
5. ✅ No degradation in application functionality

## Out of Scope

- Changing ESLint configuration rules (configuration is considered correct)
- Refactoring code beyond what's needed to fix ESLint issues
- Adding new features or functionality
- Modifying test files beyond fixing style issues

## Implementation Approach

### Phase 1: Configuration Fix (Completed)

- ✅ Fixed ESLint configuration to work with ESLint v9 flat config
- ✅ Resolved config issues with typescript-eslint
- ✅ Fixed `excludedFiles` -> `ignores` migration

### Phase 2: Auto-fix Style Issues

- Run `eslint --fix` on entire codebase
- Verify no breaking changes
- Commit auto-fixed changes

### Phase 3: Manual Type Safety Fixes

- Address by feature directory (systematic approach)
- Priority: Most affected directories first
- Fix TypeScript type issues that require manual intervention

### Phase 4: Verification

- Run full test suite
- Verify build succeeds
- Test critical user flows
- Final lint check

## Risks and Mitigation

| Risk                          | Impact | Likelihood | Mitigation                           |
| ----------------------------- | ------ | ---------- | ------------------------------------ |
| Auto-fix breaks functionality | High   | Low        | Run tests after each phase           |
| Type fixes introduce bugs     | High   | Medium     | Careful review, test coverage        |
| Large number of changes       | Medium | High       | Systematic approach by directory     |
| Merge conflicts               | Medium | Medium     | Work in isolation, commit frequently |

## Assumptions

- ESLint configuration is correct and represents desired code style
- Auto-fix won't introduce breaking changes
- Existing tests provide adequate coverage
- Type issues indicate real problems that should be fixed

## Dependencies

- Node.js and npm installed
- All dependencies installed (`npm install`)
- ESLint configuration working correctly (completed)
- Access to run commands: `npm run lint`, `npm run build`, `npm run test`

## Timeline Estimate

- **Auto-fix phase**: 5-10 minutes (mostly automated)
- **Manual type safety fixes**: 2-4 hours (1,451 issues to review/fix)
- **Verification**: 30 minutes
- **Total**: ~3-5 hours

## Deliverables

1. Codebase with 0 ESLint errors/warnings
2. Passing test suite
3. Successful build
4. Documentation of any significant changes made during manual fixes
