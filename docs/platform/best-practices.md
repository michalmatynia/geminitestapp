---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'platform'
canonical: true
---

# Best Practices: UI Consolidation Patterns

**Purpose:** Essential guidelines for using consolidated UI templates
**Audience:** All frontend developers
**Last Updated:** February 13, 2026

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Data Transfer Objects (DTOs) and Contracts](#data-transfer-objects-dtos-and-contracts)
3. [FilterPanel Best Practices](#filterpanel-best-practices)
3. [Picker Best Practices](#picker-best-practices)
4. [State Management](#state-management)
5. [Performance Optimization](#performance-optimization)
6. [Accessibility Guidelines](#accessibility-guidelines)
7. [Common Pitfalls](#common-pitfalls)
8. [Testing Strategy](#testing-strategy)

---

## General Principles

### 1. Prefer Configuration Over Customization

✅ **Good:** Use built-in props and config objects

```typescript
const filterConfig: FilterField[] = [
  { key: 'status', label: 'Status', type: 'select', options: [...] },
];
<FilterPanel filters={filterConfig} />
```

❌ **Avoid:** Creating wrapper components for minor customizations

```typescript
export function CustomFilterPanel(props) {
  return <FilterPanel {...props} className="custom" />;
}
```

### 2. Keep Concerns Separated

✅ **Good:** Separate filter logic from display logic

```typescript
// FilterPanel handles: search, filtering, sorting
<FilterPanel filters={filterConfig} onChange={handleChange} />

// Component handles: display toggles, view modes
<Button onClick={() => setViewMode('grid')}>Grid View</Button>
```

❌ **Avoid:** Mixing everything into FilterPanel

```typescript
// Don't try to force everything into FilterPanel
<FilterPanel filters={[...viewModeSettings, ...filterSettings]} />
```

### 3. Callback-Based APIs Over Context

✅ **Good:** Use `onChange` callbacks for state management

```typescript
const handleFilterChange = (key: string, value: any) => {
  updateFilters({ [key]: value });
};
<FilterPanel filters={config} onChange={handleFilterChange} />
```

❌ **Avoid:** Assuming component manages own state

```typescript
// Components don't provide context, they're pure
<FilterPanel defaultValues={filters} />  // No effect
```

---

## Data Transfer Objects (DTOs) and Contracts

**Purpose:** Ensure type safety and consistency across the entire stack (Frontend <-> API <-> Backend).

### 1. Centralize Types in `src/shared/contracts/`

All domain-specific types, interfaces, and Zod schemas MUST be located in `src/shared/contracts/`. This directory serves as the "Single Source of Truth" for the project's data structures.

✅ **Good:** Import from contracts

```typescript
import type { ProductRecord } from '@/shared/contracts/products';
```

❌ **Avoid:** Local type definitions for domain objects

```typescript
// Don't define this in features/products/types.ts
export type Product = { id: string; name: string; ... };
```

### 2. Use Zod for Schema-Backed DTOs

Prefer Zod schemas for defining DTOs to enable both static type inference and runtime validation.

```typescript
// src/shared/contracts/my-feature.ts
import { z } from 'zod';

export const myFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'inactive']),
});

export type MyFeatureDto = z.infer<typeof myFeatureSchema>;
export type MyFeature = MyFeatureDto;
```

### 3. Maintain Backward Compatibility

When refactoring, use type aliases to maintain backward compatibility with existing code while transitioning to centralized DTOs.

```typescript
// Use Dto suffix for the "pure" data structure
export type AiNodeDto = z.infer<typeof aiNodeSchema>;
// Alias for legacy code
export type AiNode = AiNodeDto;
```

### 4. Explicit Type Safety in Factories

When using query and mutation factories (`createListQueryV2`, `createMutationV2`), always provide explicit types or ensure the generic inference is clean. Avoid using `any` casts unless absolutely necessary for complex tuple inference.

✅ **Good:** Typed success callbacks

```typescript
invalidate: async (queryClient, data: ProductRecord) => {
  await invalidateProductDetail(queryClient, data.id);
}
```

### 5. Standardized Metadata

Every API request MUST include a `meta` object with correct `domain`, `resource`, and `operation` fields for telemetry and debugging.

```typescript
meta: {
  source: 'features.my-feature.hooks.useMyQuery',
  operation: 'list',
  resource: 'my-feature.items',
  domain: 'global', // Choose from TanstackFactoryDomain enum
  tags: ['my-feature', 'items'],
}
```

---

## FilterPanel Best Practices

### 1. Memoize Filter Configuration

**Why:** Prevents unnecessary re-renders and filter recreation

```typescript
const filterConfig = useMemo<FilterField[]>(() => {
  return [
    { key: 'search', label: 'Search', type: 'text', placeholder: 'Search...' },
    { key: 'category', label: 'Category', type: 'select', options: categoryOptions },
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange',
    },
  ];
}, [categoryOptions]);  // Only recreate if options change

<FilterPanel filters={filterConfig} values={filters} onChange={handleChange} />;
```

### 2. Handle All Filter Change Cases

**Why:** Ensures consistent state updates across different field types

```typescript
const handleFilterChange = (key: string, value: any) => {
  // Value could be:
  // - string (text, select)
  // - string[] (multi-select)
  // - number (number field)
  // - { from?: string, to?: string } (dateRange)
  // - boolean (checkbox)

  setFilters((prev) => ({
    ...prev,
    [key]: value === '' ? undefined : value, // Clear empty values
  }));
};
```

### 3. Implement Smart Reset

**Why:** Reset should return to sensible defaults, not just clear

```typescript
const handleReset = () => {
  setFilters({
    search: '',           // Clear search
    category: defaults.defaultCategory,  // Reset to default, not empty
    dateRange: undefined, // Clear optional fields
    // Keep pagination state separate
  });
};

<FilterPanel
  filters={filterConfig}
  values={filters}
  onChange={handleFilterChange}
  onReset={handleReset}
/>;
```

### 4. Support Dynamic Field Visibility

**Why:** Different views need different filter sets

```typescript
const filterConfig = useMemo<FilterField[]>(() => {
  const base = [
    { key: 'search', label: 'Search', type: 'text' },
  ];

  if (userRole === 'admin') {
    base.push(
      { key: 'approvalStatus', label: 'Status', type: 'select', options: [...] },
      { key: 'createdBy', label: 'Created By', type: 'select', options: [...] }
    );
  }

  return base;
}, [userRole]);
```

### 5. Preset Patterns

**Good:** Define presets that make sense for common workflows

```typescript
const presets = [
  {
    name: 'Active Items',
    filters: { status: 'active' },
  },
  {
    name: 'Recent',
    filters: { dateRange: { from: last30Days, to: today } },
  },
];

<FilterPanel
  filters={filterConfig}
  values={filters}
  onChange={handleChange}
  presets={presets}
/>;
```

---

## Picker Best Practices

### 1. Optimize Search for Large Lists

**Why:** Search performance degrades with 10,000+ items

```typescript
// Good: Use efficient search matcher
const searchMatcher = (item: Item, query: string) => {
  if (!query) return true;
  // Only search high-value fields
  return item.name.toLowerCase().includes(query) || item.id.toString().includes(query);
};

const { filtered } = usePickerSearch({
  items: largeList,
  searchMatcher,
});

// Bad: Searching entire item structure
const { filtered } = usePickerSearch({
  items: largeList,
  // Default matcher searches JSON.stringify(item)
  // Slow with complex nested objects
});
```

### 2. Lazy Load Picker Items

**Why:** Rendering 10,000 items at once causes UI lag

```typescript
export function MyPicker() {
  const [items, setItems] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPickerItems().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return <GenericPickerDropdown groups={items} ... />;
}
```

### 3. Group Items Logically

**Why:** Grouping improves usability and navigation

```typescript
// Good: Logical grouping
const groups = [
  {
    label: 'Recent',
    options: recentItems, // 5-10 items
  },
  {
    label: 'All Presets',
    options: allPresets, // 100+ items
  },
];

// Bad: Random grouping
const groups = [
  {
    label: 'Group A',
    options: [...allItems.slice(0, 50)],
  },
  {
    label: 'Group B',
    options: [...allItems.slice(50)],
  },
];
```

### 4. Provide Custom Rendering for Complex Items

**Why:** Default text rendering doesn't work for all data types

```typescript
// Good: Custom render for thumbnails
const items = products.map(p => ({
  value: p,
  label: p.name,
  render: () => (
    <div className="flex gap-2">
      <img src={p.thumbnail} alt={p.name} className="h-8 w-8 rounded" />
      <span>{p.name}</span>
    </div>
  ),
}));

<GenericGridPicker items={items} columns={4} />;
```

### 5. Handle Loading and Empty States

**Why:** Better UX during data loading

```typescript
export function ItemPicker({ items, loading, error }) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (items.length === 0) return <EmptyState />;

  return <GenericPickerDropdown groups={[{ options: items }]} />;
}
```

---

## State Management

### 1. Use Context for Global Filter State

✅ **Good:** Share filter state via React Context

```typescript
const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({});

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <FilterContext.Provider value={{ filters, updateFilter }}>
      {children}
    </FilterContext.Provider>
  );
}

// In component
const { filters, updateFilter } = useContext(FilterContext);
<FilterPanel onChange={(key, value) => updateFilter(key, value)} />;
```

### 2. Sync Filters with URL Params

✅ **Good:** Persist filters in URL for shareability

```typescript
function useFilterSync() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({});

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, String(v));
    });
    router.push(`?${params.toString()}`);
  };

  return { filters, handleFilterChange };
}
```

### 3. Debounce Search Input

✅ **Good:** Reduce API calls with debounced search

```typescript
function useSearchDebounce(delay = 300) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), delay);
    return () => clearTimeout(timer);
  }, [search, delay]);

  return { search, setSearch, debouncedSearch };
}

// In component
const { search, setSearch, debouncedSearch } = useSearchDebounce();

useEffect(() => {
  // Fetch data using debouncedSearch
  fetchItems(debouncedSearch);
}, [debouncedSearch]);

<FilterPanel
  filters={filterConfig}
  onChange={(key, value) => {
    if (key === 'search') setSearch(value);
    else setFilter(key, value);
  }}
/>;
```

---

## Performance Optimization

### 1. Memoize Callbacks

**Why:** Prevents child components from unnecessary re-renders

```typescript
const handleFilterChange = useCallback((key: string, value: any) => {
  setFilters(prev => ({ ...prev, [key]: value }));
}, []);  // No deps because we're using functional update

const handleReset = useCallback(() => {
  setFilters(initialFilters);
}, [initialFilters]);

<FilterPanel
  filters={filterConfig}
  values={filters}
  onChange={handleFilterChange}
  onReset={handleReset}
/>;
```

### 2. Virtualize Long Lists

**Why:** Rendering all picker items causes lag

```typescript
// For GridPicker with many items, consider virtual scrolling
import { FixedSizeGrid } from 'react-window';

// Instead of rendering 1000 items, virtualize
<GenericGridPicker
  items={items}  // Only render visible items
  columns={4}
  // Virtual scrolling handled internally for dropdowns
/>;
```

### 3. Cache Filter Options

**Why:** Re-fetching options on every render is wasteful

```typescript
const categoryOptions = useMemo(
  () =>
    categories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  [categories]
);

const filterConfig = useMemo(
  () => [
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: categoryOptions,
    },
  ],
  [categoryOptions]
);
```

---

## Accessibility Guidelines

### 1. Always Include Labels

```typescript
// Good
<FilterPanel
  filters={[
    {
      key: 'search',
      label: 'Search Notes',  // Label visible and accessible
      type: 'text',
    },
  ]}
  values={filters}
  onChange={handleChange}
/>

// Bad
<FilterPanel
  filters={[
    {
      key: 'search',
      type: 'text',
      placeholder: 'Search...',  // No label = inaccessible
    },
  ]}
/>
```

### 2. Support Keyboard Navigation

✅ Built-in for FilterPanel and pickers (no action needed)

- Tab: Move between fields
- Enter/Space: Select from picker
- Escape: Close dropdown
- Arrow keys: Navigate options

### 3. Test with Screen Readers

```bash
# Use accessibility testing tools
npm run test -- --coverage
# Check WCAG compliance
axe DevTools Chrome Extension
```

---

## Common Pitfalls

### ❌ Pitfall 1: Creating Props That Don't Exist

```typescript
// WRONG - These props don't exist
<FilterPanel
  defaultFilters={filters}
  onFilterApply={handleApply}
  clearAll={true}
/>

// RIGHT - Use actual props
<FilterPanel
  filters={filterConfig}
  values={filters}
  onChange={handleChange}
  onReset={handleReset}
/>
```

### ❌ Pitfall 2: Trying to Control State Internally

```typescript
// WRONG - Component won't update external state
const MyFilters = ({ filters }) => {
  return <FilterPanel filters={config} />;
};

// RIGHT - Use onChange callback
const MyFilters = ({ filters, onFilterChange }) => {
  return (
    <FilterPanel
      filters={config}
      values={filters}
      onChange={onFilterChange}
    />
  );
};
```

### ❌ Pitfall 3: Not Memoizing Expensive Computations

```typescript
// WRONG - Recreates array on every render
function MyComponent() {
  return (
    <FilterPanel
      filters={[
        ...generateFilterConfig(),  // Called every render
      ]}
    />
  );
}

// RIGHT - Memoize configuration
function MyComponent() {
  const filterConfig = useMemo(() => generateFilterConfig(), []);
  return <FilterPanel filters={filterConfig} />;
}
```

### ❌ Pitfall 4: Overloading FilterPanel

```typescript
// WRONG - Mixing filter concerns
const filterConfig = [
  { key: 'search', label: 'Search', type: 'text' },
  { key: 'viewMode', label: 'View', type: 'select', options: ['list', 'grid'] },
  { key: 'sortBy', label: 'Sort', type: 'select', options: ['name', 'date'] },
  { key: 'showArchived', label: 'Show Archived', type: 'checkbox' },
];

// RIGHT - Separate display from filter concerns
const filterConfig = [
  { key: 'search', label: 'Search', type: 'text' },
  { key: 'sortBy', label: 'Sort', type: 'select', options: ['name', 'date'] },
];

// Keep display separately
<Button onClick={() => setViewMode('grid')}>Grid</Button>
<Button onClick={() => setShowArchived(!showArchived)}>Show Archived</Button>
```

---

## Testing Strategy

### 1. Test Callback Invocation

```typescript
it('calls onChange when filter changes', () => {
  const onChange = vitest.fn();

  render(
    <FilterPanel
      filters={[{ key: 'search', type: 'text' }]}
      values={{ search: '' }}
      onChange={onChange}
    />
  );

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
  expect(onChange).toHaveBeenCalledWith('search', 'test');
});
```

### 2. Test State Updates

```typescript
it('updates filters when callback is used', () => {
  const [filters, setFilters] = useState({ search: '' });

  const { rerender } = render(
    <FilterPanel
      filters={filterConfig}
      values={filters}
      onChange={(key, value) => setFilters({ ...filters, [key]: value })}
    />
  );

  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });

  rerender(
    <FilterPanel
      filters={filterConfig}
      values={{ search: 'test' }}
      onChange={(key, value) => setFilters({ ...filters, [key]: value })}
    />
  );

  expect(screen.getByRole('textbox')).toHaveValue('test');
});
```

### 3. Test Picker Selection

```typescript
it('calls onSelect when item is selected', async () => {
  const onSelect = vitest.fn();
  const items = [{ value: 'a', label: 'Item A' }];

  render(
    <GenericPickerDropdown
      groups={[{ options: items }]}
      selected={null}
      onSelect={onSelect}
    />
  );

  fireEvent.click(screen.getByText('Item A'));
  expect(onSelect).toHaveBeenCalledWith('a');
});
```

---

## Quick Reference Checklist

**Before Using FilterPanel:**

- [ ] Identified all filter fields needed
- [ ] Mapped field types (text, select, date, etc.)
- [ ] Memoized filter configuration
- [ ] Implemented onChange callback
- [ ] Implemented onReset callback

**Before Using Picker:**

- [ ] Decided on picker type (Dropdown vs Grid)
- [ ] Prepared items/groups
- [ ] Implemented search matcher if needed
- [ ] Handled loading/empty states
- [ ] Tested with expected data volume

**Before Deploying:**

- [ ] All tests passing
- [ ] TypeScript strict mode check
- [ ] ESLint compliance
- [ ] Accessibility audit
- [ ] Performance profiled

---

**Last Updated:** February 13, 2026
**Version:** 1.0
**Questions?** See DEVELOPER_HANDBOOK.md or check examples in `/src/features/`
