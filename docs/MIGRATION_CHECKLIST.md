# Component Migration Checklist

**Purpose:** Step-by-step guide for migrating components to consolidated templates
**Audience:** Frontend developers
**Last Updated:** February 13, 2026

---

## Pre-Migration Analysis

### Identify Migration Candidate

**Checklist:**
- [ ] Component has 100+ LOC of custom filter/picker logic
- [ ] Multiple similar fields or options
- [ ] Duplicates patterns seen in other components
- [ ] Team agrees on consolidation priority
- [ ] No blockers preventing refactoring

**Questions to Ask:**
1. Does this component have search/filter functionality?
2. Are there multiple similar select/option fields?
3. Is there a grid or list picker pattern?
4. Can the logic be separated into config + callbacks?
5. Are there tests covering current functionality?

### Create Refactoring Issue

```markdown
Title: Refactor [ComponentName] to use FilterPanel/Picker template

Scope:
- Current LOC: XXX
- Expected LOC: YYY
- Estimated savings: ZZZ (XX%)

Steps:
1. Extract filter configuration
2. Build FilterPanel/Picker integration
3. Verify all tests pass
4. Deploy to production

Risk Level: Low (templates proven in 5+ deployments)
Backward Compatibility: 100% (no breaking changes)
```

---

## Step 1: Code Analysis & Measurement

### Measure Current Implementation

**Tasks:**
- [ ] Open current component file
- [ ] Count total LOC
- [ ] Identify filter/picker sections
- [ ] Count test files and test cases
- [ ] Check for external dependencies

**Template:**

```
Component: [Name]
Current File: [path]
Current LOC: [number]

Sections to migrate:
- [ ] Section 1: [description] (~XX LOC)
- [ ] Section 2: [description] (~XX LOC)

Sections to keep:
- [ ] Section 1: [reason why]
- [ ] Section 2: [reason why]

Tests:
- [ ] Unit tests: [count]
- [ ] Integration tests: [count]
- [ ] E2E tests: [count]

Dependencies:
- [ ] [dependency 1]: [why needed]
```

### Map to Template Pattern

**For Filters (Use FilterPanel):**
```
Current             →  FilterPanel Field Type
─────────────────────────────────────
<SearchInput/>      →  { type: 'text' }
<Select/>           →  { type: 'select' }
<MultiSelect/>      →  { type: 'select', multi: true }
<DatePicker/>       →  { type: 'date' }
<NumberInput/>      →  { type: 'number' }
<Checkbox/>         →  { type: 'checkbox' }
<DateRangeInput/>   →  { type: 'dateRange' }
```

**For Pickers (Use GenericPickerDropdown/GridPicker):**
```
Current                  →  Template
──────────────────────────────────
<DropdownPicker/>        →  GenericPickerDropdown
<GridPicker/>            →  GenericGridPicker
<ModalPicker/>           →  GenericPickerDropdown + Modal
<CategorySelect/>        →  GenericPickerDropdown w/ groups
<ThumbnailGrid/>         →  GenericGridPicker w/ custom render
```

---

## Step 2: Extract Configuration

### Identify Filter Fields

**Example: NotesFilters Migration**

```typescript
// Before: Hardcoded UI
return (
  <div>
    <SearchInput
      placeholder="Search notes..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <MultiSelect
      options={tags.map(t => ({ value: t.id, label: t.name }))}
      selected={filterTagIds}
      onChange={setFilterTagIds}
      placeholder="Filter by tags..."
    />
    <UnifiedSelect
      value={sortBy}
      onValueChange={(val) => updateSettings({ sortBy: val })}
      options={[
        { value: 'created', label: 'Date Created' },
        { value: 'updated', label: 'Date Modified' },
        { value: 'name', label: 'Name' },
      ]}
    />
  </div>
);

// After: Configuration-driven
const filterConfig: FilterField[] = [
  {
    key: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search notes...',
  },
  {
    key: 'tags',
    label: 'Tags',
    type: 'select',
    multi: true,
    options: tags.map(t => ({ value: t.id, label: t.name })),
    placeholder: 'Filter by tags...',
  },
  {
    key: 'sortBy',
    label: 'Sort By',
    type: 'select',
    options: [
      { value: 'created', label: 'Date Created' },
      { value: 'updated', label: 'Date Modified' },
      { value: 'name', label: 'Name' },
    ],
  },
];
```

**Checklist:**
- [ ] Extracted all filter fields
- [ ] Mapped field types correctly
- [ ] Included all options/choices
- [ ] Preserved labels and placeholders
- [ ] Noted any complex validation

---

## Step 3: State Management Refactoring

### Consolidate State

**Before:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
const [sortBy, setSortBy] = useState('updated');

const handleSearchChange = (e) => setSearchQuery(e.target.value);
const handleTagsChange = (tags) => setFilterTagIds(tags);
const handleSortChange = (val) => setSortBy(val);
```

**After:**
```typescript
const [filters, setFilters] = useState({
  search: '',
  tags: [],
  sortBy: 'updated',
});

const handleFilterChange = (key: string, value: any) => {
  setFilters(prev => ({ ...prev, [key]: value }));
};
```

**Checklist:**
- [ ] Unified related state into single object
- [ ] Created single change handler
- [ ] Maintained backward compatibility
- [ ] Updated dependent code

---

## Step 4: Component Integration

### Replace UI with Template

**Migration Template:**

```typescript
'use client';

import { useMemo, useState } from 'react';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';
import { useContext } from '@/hooks/useContext';

export function [ComponentName]() {
  // 1. Extract existing state/context
  const { data, updateData } = useContext();

  // 2. Local state for filters
  const [filters, setFilters] = useState({
    search: '',
    // ... other filter keys
  });

  // 3. Build filter config
  const filterConfig = useMemo<FilterField[]>(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search...',
    },
    // ... other fields
  ], []);  // Add deps if options depend on external data

  // 4. Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Trigger search/filter if needed
    performSearch({ ...filters, [key]: value });
  };

  // 5. Handle reset
  const handleReset = () => {
    setFilters({
      search: '',
      // ... reset to defaults
    });
  };

  // 6. Render template
  return (
    <div>
      <FilterPanel
        filters={filterConfig}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        title="[Title]"
        showHeader={true}
      />
      {/* Other UI components */}
    </div>
  );
}
```

**Checklist:**
- [ ] Imported FilterPanel/Picker
- [ ] Extracted state properly
- [ ] Created filter config
- [ ] Implemented change handler
- [ ] Implemented reset handler
- [ ] Rendered template
- [ ] Removed old filter UI code

---

## Step 5: Testing & Validation

### Run Existing Tests

```bash
# Verify existing tests still pass
npm run test -- [component path] --watch

# Watch for failures
npm run test:ui
```

**Checklist:**
- [ ] All existing tests passing
- [ ] No new errors in console
- [ ] No TypeScript errors
- [ ] No ESLint violations

### Add Integration Tests

```typescript
describe('[ComponentName] - FilterPanel Integration', () => {
  it('filters data when search changes', () => {
    const { getByRole } = render(<[ComponentName] />);
    
    fireEvent.change(getByRole('textbox'), { target: { value: 'test' } });
    
    expect(screen.getByText(/filtered/i)).toBeInTheDocument();
  });

  it('resets filters when reset button clicked', () => {
    const { getByText, getByRole } = render(<[ComponentName] />);
    
    fireEvent.change(getByRole('textbox'), { target: { value: 'test' } });
    fireEvent.click(getByText(/reset/i));
    
    expect(getByRole('textbox')).toHaveValue('');
  });

  it('maintains backward compatibility', () => {
    // Verify old API still works if needed
    render(<[ComponentName] />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
```

**Checklist:**
- [ ] Added FilterPanel integration tests
- [ ] Tested filter change behavior
- [ ] Tested reset functionality
- [ ] Verified backward compatibility
- [ ] All new tests passing

### Manual Testing

**Checklist:**
- [ ] Render component in browser
- [ ] Test search functionality
- [ ] Test filter selection
- [ ] Test reset button
- [ ] Test with empty data
- [ ] Test with large dataset (100+ items)
- [ ] Verify keyboard navigation works
- [ ] Check mobile responsiveness

---

## Step 6: Performance Validation

### Measure Before/After

```bash
# Before migration (original component)
npm run build
# Check build size, runtime performance

# After migration (refactored)
npm run build
# Compare metrics
```

**Checklist:**
- [ ] Build size not increased
- [ ] Component renders within 16ms
- [ ] No memory leaks detected
- [ ] Search response time acceptable
- [ ] No performance regressions

### Profile with DevTools

1. Open React DevTools Profiler
2. Record component interaction
3. Check render times
4. Look for unnecessary re-renders

**Targets:**
- Initial render: < 50ms
- Filter change: < 100ms
- Reset: < 50ms

---

## Step 7: Code Review

### Prepare for Review

**Checklist:**
- [ ] Created GitHub Pull Request
- [ ] Added clear PR description
- [ ] Linked migration issue
- [ ] Ran tests and linter
- [ ] Got team approval on approach
- [ ] Included before/after metrics

**PR Description Template:**

```markdown
## Refactor [ComponentName] to use FilterPanel

**Scope:** Consolidate filter UI to use proven FilterPanel template

**Changes:**
- Extracted filter configuration from inline JSX
- Unified state management into single `filters` object
- Replaced custom filter UI with FilterPanel component
- Maintained 100% backward compatibility

**Metrics:**
- Before: XXX LOC
- After: YYY LOC
- Savings: ZZZ (XX%)

**Testing:**
- All existing tests passing: ✅
- New integration tests added: ✅
- Manual testing complete: ✅
- No regressions detected: ✅

**Breaking Changes:** None
**Migration Path:** Automatic (no user action needed)
```

### Address Feedback

**Common Review Comments:**
- "Missing memoization" → Add `useMemo` for filterConfig
- "State update in effect" → Move to callback handler
- "No error handling" → Add error state
- "Accessibility issue" → Add ARIA labels

---

## Step 8: Deployment

### Pre-Deployment Checklist

- [ ] PR approved by team
- [ ] All CI checks passing
- [ ] Code review approved
- [ ] Tests passing on main branch
- [ ] No merge conflicts
- [ ] Documentation updated
- [ ] Migration guide reviewed

### Deployment Steps

```bash
# 1. Merge PR to main branch
git checkout main
git pull origin main
git merge --no-ff feature/refactor-component

# 2. Verify build succeeds
npm run build

# 3. Verify tests pass
npm run test

# 4. Deploy to staging first
npm run deploy:staging

# 5. Test in staging environment
# ... manual testing ...

# 6. Deploy to production
npm run deploy:production
```

### Post-Deployment

**Checklist:**
- [ ] Verify component renders correctly
- [ ] Test all filter functionality
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Collect user feedback
- [ ] Document any issues

---

## Step 9: Documentation

### Update Component Documentation

**Add to COMPONENT_PATTERNS.md:**
```markdown
### [ComponentName]

**Before:** [Old pattern] (XXX LOC)
**After:** FilterPanel pattern (YYY LOC)
**Savings:** ZZZ (XX% reduction)
**Status:** ✅ Deployed [date]

**Key Changes:**
- Replaced custom filter UI with FilterPanel
- Unified state management
- Added reusable configuration

**Usage Example:**
\`\`\`typescript
// ... example code
\`\`\`
```

**Checklist:**
- [ ] Updated DEVELOPER_HANDBOOK.md if needed
- [ ] Added real-world example to docs
- [ ] Updated migration guide
- [ ] Added before/after code snippets

---

## Troubleshooting

### Common Issues

**Issue: TypeScript errors in filter config**
```typescript
// Wrong: Type inference fails
const filterConfig = [
  { key: 'search', type: 'text' },
];

// Right: Explicit type
const filterConfig: FilterField[] = [
  { key: 'search', label: 'Search', type: 'text' },
];
```

**Issue: Callback not firing**
```typescript
// Wrong: Component manages state internally
<FilterPanel filters={config} />

// Right: Use onChange callback
<FilterPanel
  filters={config}
  onChange={(key, value) => setFilter(key, value)}
/>
```

**Issue: Options not updating**
```typescript
// Wrong: Options created outside component
const options = data.map(d => ({ value: d.id, label: d.name }));
const filterConfig = [{ key: 'category', options }];

// Right: Memoize options
const filterConfig = useMemo(() => [
  {
    key: 'category',
    options: data.map(d => ({ value: d.id, label: d.name })),
  },
], [data]);
```

---

## Success Criteria

**Component migration is successful when:**

- ✅ All existing tests passing (100%)
- ✅ New tests added for FilterPanel integration
- ✅ TypeScript strict mode compliance
- ✅ Zero ESLint violations
- ✅ No breaking changes
- ✅ 100% backward compatible
- ✅ LOC reduced by 10-60% (expected: 30%)
- ✅ Documentation updated
- ✅ Code reviewed and approved
- ✅ Deployed to production
- ✅ No user-reported issues

---

## Quick Reference Commands

```bash
# Run tests for specific component
npm run test -- src/features/[feature]/components/[component] --watch

# Check TypeScript compilation
npx tsc --noEmit

# Run ESLint on files
npm run lint -- src/features/[feature]/

# Build project
npm run build

# Profile component performance
npm run dev
# Then use React DevTools Profiler
```

---

## Need Help?

1. **Stuck?** Check docs/DEVELOPER_HANDBOOK.md
2. **Best practices?** Read docs/BEST_PRACTICES.md
3. **See real examples?** Check src/features/products/components/list/ProductFilters.tsx
4. **Test examples?** Check __tests__/shared/ui/FilterPanel.test.tsx

---

**Last Updated:** February 13, 2026
**Next Candidates:** Review COMPONENT_PATTERNS.md section "Consolidation Opportunities"
