# Full SDD workflow

## Configuration

- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements

<!-- chat-id: a9507fde-532a-44c2-a304-c1c6f8054375 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

<!-- chat-id: aa40d1fe-fb9e-4c5b-a14c-d62f700ea81c -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning

<!-- chat-id: 01cad206-c8dd-4839-b70b-2f25760f0695 -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

### [x] Step: Phase 1 - Auto-Fix Style Issues

<!-- chat-id: dece3a4d-4c25-451b-bea7-57d525d52b04 -->

**Objective**: Fix 62,292 auto-fixable ESLint violations using `eslint --fix`.

**Tasks**:

1. Run `npx eslint src __tests__ --fix` to automatically resolve:
   - 47,451 `quotes` violations (double → single quotes)
   - 11,028 `indent` violations (standardize to 2-space indentation)
   - 3,603 `import/order` violations (reorganize imports)
   - 217 `semi` violations (add missing semicolons)
   - 32 `no-useless-escape` violations
2. Review git diff to verify changes are expected
3. Run `npm run build` to verify TypeScript compilation
4. Run `npm run test` to verify all tests pass

**Verification**:

- ESLint error count reduced from 62,358 to ~81 (type safety issues only)
- Build succeeds without TypeScript errors
- All tests pass
- No unexpected code changes in git diff

**Commit**: `style: auto-fix ESLint style violations (quotes, indent, imports)`

---

### [x] Step: Phase 2A - Type Safety in Shared UI Components

<!-- chat-id: edee74d3-8d0b-480a-9521-7511d27346ad -->

**Objective**: Fix type safety issues in `src/shared/ui` (62 files, highest impact).

**Target Rules**:

- `@typescript-eslint/no-explicit-any` (replace with proper types)
- `@typescript-eslint/no-unsafe-member-access` (add type guards)
- `@typescript-eslint/no-unsafe-assignment` (validate before assignment)
- `@typescript-eslint/no-unsafe-call` (type function calls)
- `@typescript-eslint/no-unsafe-argument` (type function parameters)
- `@typescript-eslint/no-unsafe-return` (add return type annotations)

**Tasks**:

1. Identify all ESLint violations in `src/shared/ui`
2. Fix explicit `any` types with proper interfaces
3. Add type guards for property access
4. Type component props and event handlers
5. Add runtime validation where needed
6. Run `npm run lint` to verify fixes
7. Run `npm run test` to verify no regressions

**Verification**:

- No type safety issues in `src/shared/ui` directory
- All tests for shared UI components pass
- TypeScript compilation succeeds

**Commit**: `fix(shared/ui): improve type safety in UI components`

---

### [ ] Step: Phase 2B - Type Safety in CMS Page Builder

<!-- chat-id: 11e2e75c-fd01-4df1-a537-475a1682e0ad -->

**Objective**: Fix type safety issues in `src/features/cms/components/page-builder` (28 files).

**Tasks**:

1. Identify all ESLint violations in page builder components
2. Fix explicit `any` types with CMS-specific interfaces
3. Add type guards for dynamic CMS content
4. Type block components and their props
5. Add runtime validation for user-generated content
6. Run `npm run lint` to verify fixes
7. Run `npm run test` to verify CMS tests pass
8. Manually test page builder functionality

**Verification**:

- No type safety issues in page builder directory
- CMS page builder works correctly in browser
- All CMS-related tests pass

**Commit**: `fix(cms): improve type safety in page builder components`

---

### [ ] Step: Phase 2C - Type Safety in AI Paths Components

**Objective**: Fix type safety issues in AI paths components (46 files total).

**Affected Directories**:

- `src/features/ai/ai-paths/components/node-config/dialog` (27 files)
- `src/features/ai/ai-paths/components` (19 files)

**Tasks**:

1. Identify all ESLint violations in AI paths components
2. Fix explicit `any` types with AI path-specific types
3. Add type guards for node configuration data
4. Type dialog components and form handlers
5. Add Zod schemas for runtime validation of dynamic data
6. Run `npm run lint` to verify fixes
7. Run `npm run test` to verify AI paths tests pass

**Verification**:

- No type safety issues in AI paths component directories
- AI path configuration works correctly
- All AI paths tests pass

**Commit**: `fix(ai-paths): improve type safety in components`

---

### [ ] Step: Phase 2D - Type Safety in CMS Frontend Sections

**Objective**: Fix type safety issues in `src/features/cms/components/frontend/sections` (21 files).

**Tasks**:

1. Identify all ESLint violations in frontend sections
2. Fix explicit `any` types with section-specific interfaces
3. Add type guards for section content rendering
4. Type GSAP animation configurations
5. Add validation for section data
6. Run `npm run lint` to verify fixes
7. Run `npm run test` to verify frontend tests pass
8. Manually test section rendering

**Verification**:

- No type safety issues in frontend sections directory
- Frontend sections render correctly with animations
- All tests pass

**Commit**: `fix(cms): improve type safety in frontend sections`

---

### [ ] Step: Phase 2E - Type Safety in Products Hooks

**Objective**: Fix type safety issues in `src/features/products/hooks` (20 files).

**Tasks**:

1. Identify all ESLint violations in product hooks
2. Fix explicit `any` types with product domain types
3. Type API responses for product data
4. Add type guards for product transformations
5. Type hook return values properly
6. Run `npm run lint` to verify fixes
7. Run `npm run test` to verify product tests pass

**Verification**:

- No type safety issues in products hooks directory
- Product hooks work correctly
- All product tests pass

**Commit**: `fix(products): improve type safety in hooks`

---

### [ ] Step: Phase 2F - Type Safety in Domain Types

**Objective**: Fix type safety issues in `src/shared/types/domain` (17 files).

**Tasks**:

1. Identify all ESLint violations in domain type files
2. Fix explicit `any` types with proper type definitions
3. Improve type utility functions
4. Add proper generics constraints
5. Ensure type exports are correctly typed
6. Run `npm run lint` to verify fixes
7. Run `npm run build` to verify type compilation

**Verification**:

- No type safety issues in domain types directory
- All type exports compile correctly
- No regression in type inference across codebase

**Commit**: `fix(types): improve type safety in domain types`

---

### [ ] Step: Phase 2G - Type Safety in Remaining Directories

**Objective**: Fix type safety issues in remaining affected directories (< 10 files each).

**Affected Directories**:

- `__tests__/features/agent-runtime/services` (14 files)
- Other directories with < 10 affected files

**Tasks**:

1. Identify all remaining ESLint violations
2. Fix type safety issues directory by directory
3. Remove or prefix unused variables with underscore
4. Run `npm run lint` after each directory
5. Run `npm run test` to verify tests pass

**Verification**:

- No remaining type safety issues
- All tests pass
- Build succeeds

**Commit**: `fix: improve type safety in remaining directories`

---

### [ ] Step: Phase 3 - Fix Architecture Boundary Violations

**Objective**: Fix 5 `import/no-restricted-paths` violations.

**Rules to Enforce**:

- `src/shared` must NOT import from `src/features`
- `src/app/api` must NOT import from `src/features`

**Tasks**:

1. Identify violations: `npx eslint src --format=json | jq '.[] | select(.messages[].ruleId == "import/no-restricted-paths")'`
2. For each violation, determine fix strategy:
   - Move shared code from `src/features` to `src/shared`, OR
   - Create abstraction in `src/shared` with feature implementations, OR
   - Refactor to remove circular dependency
3. Update imports and implementations
4. Run `npm run lint` to verify fixes
5. Run `npm run test` to verify functionality
6. Manually test affected features

**Verification**:

- No architecture boundary violations
- All tests pass
- Application functionality unchanged

**Commit**: `refactor: fix architecture boundary violations`

---

### [ ] Step: Phase 4 - Fix Remaining Logic Issues

**Objective**: Fix remaining ESLint issues (~43 logic and code quality issues).

**Target Rules**:

- `no-redeclare` (duplicate variable declarations)
- `no-empty` (empty blocks)
- Other minor issues

**Tasks**:

1. Run `npm run lint` to identify remaining issues
2. Fix each issue individually:
   - Remove duplicate declarations
   - Add comments or remove empty blocks
   - Fix any remaining edge cases
3. Run `npm run lint` to verify 0 errors/warnings
4. Run `npm run build` to verify compilation
5. Run `npm run test` to verify tests pass

**Verification**:

- `npm run lint` reports 0 errors and 0 warnings
- Build succeeds
- All tests pass

**Commit**: `fix: address remaining ESLint logic and code quality issues`

---

### [ ] Step: Final Verification

**Objective**: Comprehensive verification that all ESLint issues are resolved and application works correctly.

**Tasks**:

1. Run `npm run lint` and verify 0 errors/warnings
2. Run `npm run build` and verify successful compilation
3. Run `npm run test` and verify all unit tests pass
4. Run `npm run test:e2e` and verify all E2E tests pass
5. Start dev server with `npm run dev`
6. Manually test critical user flows:
   - Admin product CRUD operations
   - CMS page builder functionality
   - User authentication flows
   - File upload/management
   - AI path execution
7. Check browser console for runtime errors
8. Review git history and squash commits if needed

**Success Criteria**:

- ✅ `npm run lint` exits with code 0
- ✅ `npm run build` completes successfully
- ✅ `npm run test` shows all tests passing
- ✅ `npm run test:e2e` shows all E2E tests passing
- ✅ Manual smoke tests pass
- ✅ No runtime errors in browser console
- ✅ All changes committed with descriptive messages

**Deliverable**: Codebase with 0 ESLint errors/warnings, passing tests, and verified functionality.
