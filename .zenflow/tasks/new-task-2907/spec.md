# Technical Specification: ESLint Code Quality Improvements

## Overview

This specification outlines the technical approach for resolving 63,854 ESLint violations across the codebase. The work consists of automated fixes for style issues (~98% of violations) and manual type safety improvements for the remaining TypeScript-related issues.

## Technical Context

### Environment

- **Node.js**: Version compatible with Next.js 16.1.1
- **Package Manager**: npm
- **TypeScript**: 5.9.3 with strict configuration
- **ESLint**: 9.39.2 (flat config format)
- **Build Tool**: Next.js 16.1.1 with custom server (server.cjs)
- **Testing Framework**: Vitest 2.1.0 with React Testing Library
- **E2E Testing**: Playwright 1.57.0

### Current Tooling Configuration

#### ESLint Configuration (`eslint.config.cjs`)

```javascript
// Key plugins and parsers
- typescript-eslint (parser + plugin)
- eslint-plugin-react
- eslint-plugin-react-hooks
- eslint-plugin-import
- @next/eslint-plugin-next

// Style rules (auto-fixable)
- indent: 2 spaces with SwitchCase: 1
- quotes: single quotes
- semi: always require semicolons
- linebreak-style: unix

// Type safety rules (manual)
- @typescript-eslint/no-explicit-any: warn
- @typescript-eslint/no-unsafe-*: warn (assignment, call, member-access, argument, return)
- @typescript-eslint/no-unused-vars: warn

// Import organization
- import/order: strict ordering with alphabetization
- import/no-restricted-paths: enforce architecture boundaries
```

#### Package.json Scripts

```json
{
  "lint": "eslint src __tests__",
  "build": "prisma generate && next build",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test"
}
```

## Implementation Approach

### Phase 1: Automated Style Fixes

**Objective**: Fix 62,292 auto-fixable issues using ESLint's `--fix` flag.

**Approach**:

1. Run `npx eslint src __tests__ --fix` to apply all automatic fixes
2. Review git diff to identify any unexpected changes
3. Run TypeScript compiler to ensure no type errors introduced
4. Run test suite to verify no functionality broken

**Expected Fixes**:

- 47,451 `quotes` violations (double → single quotes)
- 11,028 `indent` violations (standardize to 2-space indentation)
- 3,603 `import/order` violations (reorganize imports with newlines)
- 217 `semi` violations (add missing semicolons)
- 32 `no-useless-escape` violations (remove unnecessary escapes)

**Risk Mitigation**:

- Auto-fix is deterministic and safe for style rules
- Git diff review will catch any anomalies
- Test suite provides regression coverage

### Phase 2: Manual Type Safety Improvements

**Objective**: Fix 1,451 type safety issues that require manual intervention.

**Approach**: Systematic directory-by-directory fixes, prioritizing most affected areas.

#### Type Safety Issue Categories

##### Category 1: Explicit `any` Types (102 issues)

**Rule**: `@typescript-eslint/no-explicit-any`

**Strategy**:

- Replace `any` with proper TypeScript types
- Use utility types (`Record<string, unknown>`, `Partial<T>`, etc.) where appropriate
- Add type assertions only when necessary with comments explaining why
- Use `unknown` as last resort for truly dynamic data

**Example Fix Pattern**:

```typescript
// Before
function processData(data: any) { ... }

// After
interface DataPayload {
  id: string;
  value: number;
  metadata?: Record<string, unknown>;
}
function processData(data: DataPayload) { ... }
```

##### Category 2: Unsafe Member Access (508 issues)

**Rule**: `@typescript-eslint/no-unsafe-member-access`

**Strategy**:

- Add type guards before accessing properties
- Use optional chaining where appropriate
- Define proper interfaces for object shapes
- Add runtime validation for external data

**Example Fix Pattern**:

```typescript
// Before
const value = someObject.property;

// After
interface SomeObject {
  property: string;
}
const value = (someObject as SomeObject).property;
// Or with type guard
if ('property' in someObject) {
  const value = someObject.property;
}
```

##### Category 3: Unsafe Assignments (332 issues)

**Rule**: `@typescript-eslint/no-unsafe-assignment`

**Strategy**:

- Validate types before assignment
- Use type assertions with caution
- Add Zod schemas for runtime validation where needed
- Properly type API responses and external data

**Example Fix Pattern**:

```typescript
// Before
const data = await response.json();

// After
interface ApiResponse {
  id: string;
  name: string;
}
const data = (await response.json()) as ApiResponse;
// Better: validate with Zod
const data = apiResponseSchema.parse(await response.json());
```

##### Category 4: Unsafe Function Calls (301 issues)

**Rule**: `@typescript-eslint/no-unsafe-call`

**Strategy**:

- Properly type function parameters and return values
- Use function type annotations
- Add type guards before calling methods on unknown types

##### Category 5: Unsafe Arguments (153 issues)

**Rule**: `@typescript-eslint/no-unsafe-argument`

**Strategy**:

- Type function parameters properly
- Validate argument types before passing to functions
- Use generic constraints where appropriate

##### Category 6: Unsafe Returns (55 issues)

**Rule**: `@typescript-eslint/no-unsafe-return`

**Strategy**:

- Add proper return type annotations
- Validate return values match declared types
- Use type assertions sparingly

##### Category 7: Unused Variables (28 issues)

**Rule**: `@typescript-eslint/no-unused-vars`

**Strategy**:

- Remove truly unused variables
- Prefix intentionally unused parameters with underscore (e.g., `_req`, `_index`)
- Keep variables that may be needed for future debugging with underscore prefix

#### Implementation Order (by affected directory)

1. **`src/shared/ui`** (62 files)
   - Highest impact on shared components
   - Fixes benefit entire codebase

2. **`src/features/cms/components/page-builder`** (28 files)
   - Core CMS functionality
   - Complex component hierarchy

3. **`src/features/ai/ai-paths/components/node-config/dialog`** (27 files)
   - AI features with dynamic data
   - Likely needs runtime validation

4. **`src/features/cms/components/frontend/sections`** (21 files)
   - Frontend rendering components

5. **`src/features/products/hooks`** (20 files)
   - Product data handling
   - Likely API response typing issues

6. **`src/features/ai/ai-paths/components`** (19 files)
   - AI path configuration

7. **`src/shared/types/domain`** (17 files)
   - Type definition files
   - Critical for type safety across codebase

8. **`__tests__/features/agent-runtime/services`** (14 files)
   - Test files (lower priority, `any` allowed in config)

9. **Remaining directories** (< 10 files each)
   - Address in alphabetical order

### Phase 3: Architecture Boundary Violations

**Objective**: Fix 5 `import/no-restricted-paths` violations.

**Rules**:

- `src/shared` must NOT import from `src/features`
- `src/app/api` must NOT import from `src/features`

**Strategy**:

1. Identify each violation with `npx eslint src --format=json | jq '.[] | select(.messages[].ruleId == "import/no-restricted-paths")'`
2. Analyze dependency and determine:
   - Move shared code from `src/features` to `src/shared`
   - Create abstraction in `src/shared` with feature-specific implementations
   - Refactor to remove circular dependency
3. Update imports and verify no functionality broken

### Phase 4: Logic and Code Quality Issues

**Objective**: Fix remaining ~43 issues in various rules.

**Issues**:

- `no-useless-escape`: Remove unnecessary backslashes in strings/regex
- `no-redeclare`: Rename duplicate variable declarations
- `no-empty`: Add comment or remove empty blocks
- Other minor issues (< 10 each)

**Strategy**:

- Many will be fixed by auto-fix in Phase 1
- Manually address remaining issues as they appear
- Low priority, handle after type safety issues

## Source Code Structure Changes

### Files Modified

- **All files in `src/`**: Style fixes (quotes, indentation, imports)
- **All files in `__tests__/`**: Style fixes
- **~100-150 files**: Type safety improvements (manual edits)
- **5 files**: Architecture boundary fixes

### No New Files Required

- All fixes are modifications to existing files
- No new types/utilities needed (use existing patterns)

### Potential Shared Type Additions

If patterns emerge during type safety fixes:

- Add shared types to `src/shared/types/`
- Add shared utility types to `src/shared/types/utils.ts` (if needed)
- Document new shared types in code comments

## Data Model / API / Interface Changes

### No Breaking Changes Expected

- All changes are internal code improvements
- No database schema changes
- No API contract changes
- No component prop interface changes (unless fixing actual bugs)

### Type Safety Improvements

- More precise TypeScript types throughout codebase
- Better type inference in IDE
- Runtime validation where previously missing

## Verification Approach

### Continuous Verification (After Each Phase)

```bash
# 1. Verify ESLint compliance
npm run lint

# 2. Verify TypeScript compilation
npm run build

# 3. Verify unit tests pass
npm run test

# 4. Verify E2E tests pass (critical flows)
npm run test:e2e
```

### Regression Testing Strategy

- Run full test suite after each phase
- Manually test critical user flows:
  - Admin product CRUD operations
  - CMS page builder functionality
  - User authentication flows
  - File upload/management
  - AI path execution
- Review browser console for runtime errors in dev mode

### Success Metrics

1. ✅ `npm run lint` exits with code 0 (no errors or warnings)
2. ✅ `npm run build` completes successfully
3. ✅ `npm run test` shows all tests passing
4. ✅ `npm run test:e2e` shows all E2E tests passing
5. ✅ Manual smoke test of critical features passes
6. ✅ No new runtime errors in browser console

### Git Workflow

```bash
# After Phase 1 (auto-fix)
git add -A
git commit -m "style: auto-fix ESLint style violations (quotes, indent, imports)"

# After Phase 2 (type safety) - commit per directory or logical group
git add src/shared/ui
git commit -m "fix(shared/ui): improve type safety in UI components"

git add src/features/cms/components/page-builder
git commit -m "fix(cms): improve type safety in page builder components"
# ... etc

# After Phase 3 (architecture boundaries)
git add -A
git commit -m "refactor: fix architecture boundary violations"

# After Phase 4 (remaining issues)
git add -A
git commit -m "fix: address remaining ESLint logic and code quality issues"
```

## Delivery Phases

### Phase 1: Auto-Fix Style Issues (5-10 minutes)

**Deliverable**: 62,292 style violations fixed

**Tasks**:

1. Run `npx eslint src __tests__ --fix`
2. Review git diff for unexpected changes
3. Run `npm run build` to verify TypeScript compilation
4. Run `npm run test` to verify tests pass
5. Commit changes with descriptive message

**Acceptance Criteria**:

- ESLint error count reduced from 62,358 to ~81 (type safety issues only)
- All tests pass
- Build succeeds
- Code compiles without TypeScript errors

---

### Phase 2A: Type Safety - Shared UI Components (30-45 minutes)

**Deliverable**: Type safety improvements in `src/shared/ui` (62 files)

**Tasks**:

1. Fix explicit `any` types with proper interfaces
2. Add type guards for member access
3. Type API responses and external data
4. Validate and test each file group
5. Commit changes per component group

**Acceptance Criteria**:

- All type safety issues in `src/shared/ui` resolved
- No new TypeScript errors introduced
- All tests pass for affected components

---

### Phase 2B: Type Safety - CMS Components (30-45 minutes)

**Deliverable**: Type safety improvements in CMS-related directories

**Affected Directories**:

- `src/features/cms/components/page-builder` (28 files)
- `src/features/cms/components/frontend/sections` (21 files)

**Tasks**:

1. Fix type safety issues in page builder components
2. Improve type safety in frontend sections
3. Add runtime validation for dynamic CMS content
4. Test CMS functionality
5. Commit changes

**Acceptance Criteria**:

- All type safety issues in CMS components resolved
- CMS page builder works correctly
- Frontend rendering works correctly

---

### Phase 2C: Type Safety - AI Features (30-45 minutes)

**Deliverable**: Type safety improvements in AI-related directories

**Affected Directories**:

- `src/features/ai/ai-paths/components/node-config/dialog` (27 files)
- `src/features/ai/ai-paths/components` (19 files)

**Tasks**:

1. Fix type safety issues in AI path components
2. Add proper types for AI configuration objects
3. Add runtime validation for AI responses
4. Test AI path execution
5. Commit changes

**Acceptance Criteria**:

- All type safety issues in AI features resolved
- AI path creation and execution works correctly

---

### Phase 2D: Type Safety - Products & Remaining Features (30-45 minutes)

**Deliverable**: Type safety improvements in products and other features

**Affected Directories**:

- `src/features/products/hooks` (20 files)
- `src/shared/types/domain` (17 files)
- Other feature directories (< 10 files each)

**Tasks**:

1. Fix type safety issues in product hooks
2. Improve domain type definitions
3. Address remaining feature directories
4. Test product CRUD operations
5. Commit changes

**Acceptance Criteria**:

- All type safety issues in products resolved
- Product management works correctly
- Domain types properly defined

---

### Phase 2E: Type Safety - Test Files (15-20 minutes)

**Deliverable**: Type safety improvements in test files (low priority)

**Affected Directories**:

- `__tests__/features/agent-runtime/services` (14 files)
- Other test directories

**Note**: ESLint config allows `any` in test files, so these are warnings only.

**Tasks**:

1. Optionally improve type safety in test files
2. Focus on tests that would benefit from better types
3. Skip if low value
4. Commit if changes made

**Acceptance Criteria**:

- Test warnings reduced (optional)
- All tests still pass

---

### Phase 3: Architecture Boundary Fixes (15-30 minutes)

**Deliverable**: 5 import restriction violations resolved

**Tasks**:

1. Identify each violation using ESLint JSON output
2. Analyze each case and determine best fix approach
3. Refactor to respect architecture boundaries
4. Update imports
5. Test affected features
6. Commit changes

**Acceptance Criteria**:

- No `import/no-restricted-paths` violations
- `src/shared` does not import from `src/features`
- `src/app/api` does not import from `src/features`
- All functionality preserved

---

### Phase 4: Final Cleanup & Verification (15-30 minutes)

**Deliverable**: All ESLint issues resolved

**Tasks**:

1. Address any remaining issues from Phase 1-3
2. Fix logic issues (`no-useless-escape`, `no-redeclare`, etc.)
3. Run full verification suite
4. Perform manual smoke testing
5. Final commit

**Verification Checklist**:

```bash
✅ npm run lint         # 0 errors, 0 warnings
✅ npm run build        # Successful build
✅ npm run test         # All tests pass
✅ npm run test:e2e     # All E2E tests pass (or skip if too slow)
✅ npm run dev          # App starts without errors
✅ Manual smoke test    # Critical features work
```

**Acceptance Criteria**:

- **0 ESLint errors**
- **0 ESLint warnings**
- All tests pass
- Build succeeds
- Application runs correctly
- No regressions in functionality

---

## Risk Assessment & Mitigation

| Risk                                         | Likelihood | Impact | Mitigation                                                   |
| -------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Auto-fix breaks functionality                | Low        | High   | Run tests after Phase 1, review diff                         |
| Type fixes introduce runtime errors          | Medium     | High   | Systematic approach, test after each directory group         |
| Architecture fixes require major refactoring | Low        | Medium | Analyze before refactoring, keep changes minimal             |
| Tests fail after changes                     | Medium     | Medium | Fix tests as part of same phase, don't proceed until passing |
| Build time increases                         | Low        | Low    | ESLint doesn't affect build time                             |
| Merge conflicts during work                  | Low        | Low    | Work in isolated branch, commit frequently                   |

## Rollback Strategy

If critical issues discovered:

1. Revert last commit: `git reset --hard HEAD~1`
2. Or revert to specific commit: `git reset --hard <commit-hash>`
3. Re-apply changes more carefully
4. Add specific tests for problematic area

## Dependencies & Prerequisites

**Required**:

- ✅ Node.js and npm installed
- ✅ All dependencies installed (`npm install`)
- ✅ ESLint configuration working (verified in requirements phase)
- ✅ Database seeded (for testing): `npm run seed` and `npm run seed:admin`
- ✅ Environment variables configured (`.env` file)

**Optional**:

- Git branch for work: `git checkout -b fix/eslint-violations`
- IDE with ESLint integration (for real-time feedback)

## Timeline Estimate

| Phase                       | Estimated Time |
| --------------------------- | -------------- |
| Phase 1: Auto-fix           | 5-10 minutes   |
| Phase 2A: Shared UI         | 30-45 minutes  |
| Phase 2B: CMS               | 30-45 minutes  |
| Phase 2C: AI Features       | 30-45 minutes  |
| Phase 2D: Products & Others | 30-45 minutes  |
| Phase 2E: Tests (optional)  | 15-20 minutes  |
| Phase 3: Architecture       | 15-30 minutes  |
| Phase 4: Final Cleanup      | 15-30 minutes  |
| **Total**                   | **3-5 hours**  |

## Success Criteria Summary

**Technical**:

- ✅ 0 ESLint errors
- ✅ 0 ESLint warnings
- ✅ TypeScript compilation succeeds
- ✅ All unit tests pass
- ✅ All E2E tests pass (or critical subset)

**Functional**:

- ✅ Application starts without errors
- ✅ No console errors in browser
- ✅ Critical features work (admin, CMS, products, auth)
- ✅ No performance degradation

**Code Quality**:

- ✅ Consistent code style across codebase
- ✅ Improved type safety
- ✅ Better IDE autocomplete and type inference
- ✅ Reduced technical debt

## Notes

- ESLint configuration is correct and should not be modified
- All type safety warnings are set to "warn" level, but we'll treat them as errors to fix
- The codebase uses Next.js 16 App Router patterns - preserve "use client" directives
- Some `any` types may be legitimate (e.g., external library types) - use judgment
- Prioritize correctness over speed - better to take time and get it right
