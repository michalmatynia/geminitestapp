# Developer Handbook: UI Consolidation Patterns

**Last Updated:** February 13, 2026
**Project Status:** Production-Ready ✅
**Framework:** Next.js 16.1.1 + React 19.2.3 + TypeScript 5.9.3

---

## Table of Contents

1. [Core Patterns Overview](#core-patterns-overview)
2. [FilterPanel Pattern](#filterpanel-pattern)
3. [Picker Components](#picker-components)
4. [Panel Components](#panel-components)
5. [Best Practices](#best-practices)
6. [Migration Guide](#migration-guide)
7. [FAQ](#faq)

---

## Core Patterns Overview

The consolidation project identified and standardized three core patterns used across 450+ components:

### 1. FilterPanel Pattern

**Used for:** Search, filtering, sorting, presets
**Deployed in:** 5 components (ProductFilters, NotesFilters, FileManagerFilters, etc.)
**LOC Savings:** 50-60% across filters
**Status:** Production-ready ✅

### 2. Picker Patterns

**Used for:** Dropdowns, grids, modal selection
**Deployed in:** 5 components (AnimationPresetPicker, SectionTemplatePicker, etc.)
**LOC Savings:** 10-60% per component
**Status:** Production-ready ✅

### 3. Panel Patterns

**Used for:** Headers, stats, pagination, layout structure
**Deployed in:** Core template system (6 sub-components)
**LOC Savings:** 25-30% potential
**Status:** Production-ready ✅

---

## FilterPanel Pattern

### Purpose

Create consistent, maintainable filter UIs with:

- Search functionality
- Multiple filter field types
- Preset support
- Reset buttons
- State management hooks

### Architecture

```
FilterPanel (wrapper with presets)
  ↓
PanelFilters (core filter renderer)
  ├── SearchInput
  ├── FilterField[text]
  ├── FilterField[select]
  ├── FilterField[number]
  ├── FilterField[date]
  ├── FilterField[dateRange]
  └── FilterField[checkbox]
```

### Usage Example

```typescript
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

export function MyFilters() {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
  });

  const filterConfig: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Type to search...',
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'a', label: 'Category A' },
        { value: 'b', label: 'Category B' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({ search: '', category: '', status: '' });
  };

  return (
    <FilterPanel
      filters={filterConfig}
      values={filters}
      onChange={handleFilterChange}
      onReset={handleReset}
      showHeader={true}
      title="My Filters"
    />
  );
}
```

### FilterField Types

#### Text Field

```typescript
{
  key: 'search',
  label: 'Search',
  type: 'text',
  placeholder: 'Search...',
}
```

#### Select (Single)

```typescript
{
  key: 'status',
  label: 'Status',
  type: 'select',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
}
```

#### Select (Multi)

```typescript
{
  key: 'tags',
  label: 'Tags',
  type: 'select',
  multi: true,
  options: [
    { value: 'tag1', label: 'Tag 1' },
    { value: 'tag2', label: 'Tag 2' },
  ],
}
```

#### Number Field

```typescript
{
  key: 'minPrice',
  label: 'Min Price',
  type: 'number',
  placeholder: '0',
}
```

#### Date Field

```typescript
{
  key: 'dateCreated',
  label: 'Created Date',
  type: 'date',
}
```

#### DateRange Field

```typescript
{
  key: 'dateRange',
  label: 'Date Range',
  type: 'dateRange',
}
// Value structure: { from?: string, to?: string }
```

#### Checkbox Field

```typescript
{
  key: 'includeArchived',
  label: 'Include Archived',
  type: 'checkbox',
}
```

### FilterPanel Props

```typescript
interface FilterPanelProps {
  // Required
  filters: FilterField[]; // Field configuration
  values: Record<string, any>; // Current filter values
  onChange: (key: string, value: any) => void; // Change handler
  onReset: () => void; // Reset handler

  // Optional
  showHeader?: boolean; // Show/hide header (default: true)
  title?: string; // Header title
  presets?: FilterPreset[]; // Quick filter presets
  onPresetChange?: (preset: FilterPreset) => void; // Preset handler
  className?: string; // Custom styling
}
```

### Styling & Customization

**Default Theme:**

- Dark background (gray-800/40)
- Light text (gray-400)
- Lucide icons
- Tailwind CSS utilities

**Customization:**

```typescript
<FilterPanel
  filters={filterConfig}
  values={filters}
  onChange={handleFilterChange}
  onReset={handleReset}
  className="bg-white rounded-lg shadow-md"
/>
```

---

## Picker Components

### GenericPickerDropdown

**Purpose:** Reusable grouped option dropdown picker
**Use When:** Selecting from a large list with categories/groups
**LOC Saved:** 50-60% vs custom implementations

#### Usage

```typescript
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers/GenericPickerDropdown';
import type { PickerOption, PickerGroup } from '@/shared/ui/templates/pickers/types';

const groups: PickerGroup<MyType>[] = [
  {
    label: 'Group A',
    options: [
      { value: item1, label: 'Item 1', icon: <Icon1 /> },
      { value: item2, label: 'Item 2', icon: <Icon2 /> },
    ],
  },
  {
    label: 'Group B',
    options: [
      { value: item3, label: 'Item 3', icon: <Icon3 /> },
    ],
  },
];

export function MyPicker() {
  const [selected, setSelected] = useState<MyType | null>(null);

  return (
    <GenericPickerDropdown<MyType>
      groups={groups}
      selected={selected}
      onSelect={setSelected}
      placeholder="Choose an item..."
      searchPlaceholder="Search items..."
      searchable={true}
      icon="Store"  // Optional: from lucide-react
    />
  );
}
```

#### Props

```typescript
interface GenericPickerDropdownProps<T> {
  // Required
  groups: PickerGroup<T>[];
  selected: T | null;
  onSelect: (item: T) => void;

  // Optional
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  searchMatcher?: (item: T, query: string) => boolean; // Custom search logic
  disabled?: boolean;
  className?: string;
  icon?: string; // Lucide icon name
}
```

### GenericGridPicker

**Purpose:** Grid-based picker with configurable columns and custom rendering
**Use When:** Visual selection (grid layout, thumbnails, icons)
**LOC Saved:** 40-50% vs custom implementations

#### Usage

```typescript
import { GenericGridPicker } from '@/shared/ui/templates/pickers/GenericGridPicker';
import type { GridPickerItem } from '@/shared/ui/templates/pickers/types';

const items: GridPickerItem<MyType>[] = [
  {
    value: item1,
    label: 'Item 1',
    render: () => <CustomThumbnail item={item1} />,
  },
  {
    value: item2,
    label: 'Item 2',
    render: () => <CustomThumbnail item={item2} />,
  },
];

export function MyGridPicker() {
  const [selected, setSelected] = useState<MyType | null>(null);

  return (
    <GenericGridPicker<MyType>
      items={items}
      selected={selected}
      onSelect={setSelected}
      columns={4}
      searchable={true}
      placeholder="Search items..."
    />
  );
}
```

#### Props

```typescript
interface GenericGridPickerProps<T> {
  // Required
  items: GridPickerItem<T>[];
  selected: T | null;
  onSelect: (item: T) => void;

  // Optional
  columns?: number; // Grid columns (default: 3)
  searchable?: boolean;
  searchPlaceholder?: string;
  searchMatcher?: (item: T, query: string) => boolean;
  disabled?: boolean;
  className?: string;
}
```

### usePickerSearch Hook

**Purpose:** Generic search/filter hook for pickers
**Use When:** Need search functionality without tight coupling

#### Usage

```typescript
import { usePickerSearch } from '@/shared/ui/templates/pickers/usePickerSearch';

export function MyComponent() {
  const items = [...];

  const { filtered, searchQuery, setSearchQuery } = usePickerSearch({
    items,
    searchMatcher: (item, query) => {
      return item.name.toLowerCase().includes(query.toLowerCase());
    },
  });

  return (
    <>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
      />
      <div>
        {filtered.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </>
  );
}
```

#### Custom Matcher Example

```typescript
// Default: JSON.stringify matching (permissive)
const { filtered } = usePickerSearch({ items });

// Custom: Match specific field
const { filtered } = usePickerSearch({
  items,
  searchMatcher: (item, query) => {
    return item.category.toLowerCase().includes(query.toLowerCase());
  },
});

// Complex: Multi-field matching
const { filtered } = usePickerSearch({
  items,
  searchMatcher: (item, query) => {
    return (
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.tags.some((t) => t.toLowerCase().includes(query))
    );
  },
});
```

---

## Panel Components

### PanelHeader

**Purpose:** Standardized panel header with title and actions
**Use When:** Creating consistent panel UI

```typescript
import { PanelHeader } from '@/shared/ui/templates/panels/PanelHeader';

<PanelHeader
  title="Items"
  subtitle="5 items selected"
  icon={<ListIcon />}
  actions={[
    { label: 'Delete', onClick: () => {} },
    { label: 'Export', onClick: () => {} },
  ]}
/>
```

### PanelFilters

**Purpose:** Core filter renderer (used by FilterPanel)
**Use When:** Building custom filter UI without presets

```typescript
import { PanelFilters } from '@/shared/ui/templates/panels/PanelFilters';
import type { FilterField } from '@/shared/ui/templates/panels';

<PanelFilters
  filters={filterConfig}
  values={filterValues}
  onChange={handleChange}
  search={searchQuery}
  onSearchChange={setSearchQuery}
/>
```

### PanelStats

**Purpose:** Display statistics/metrics
**Use When:** Showing counts, summaries

```typescript
import { PanelStats } from '@/shared/ui/templates/panels/PanelStats';

<PanelStats
  stats={[
    { label: 'Total', value: 100 },
    { label: 'Active', value: 75 },
    { label: 'Inactive', value: 25 },
  ]}
/>
```

### PanelPagination

**Purpose:** Pagination controls
**Use When:** Paginated data display

```typescript
import { PanelPagination } from '@/shared/ui/templates/panels/PanelPagination';

<PanelPagination
  page={currentPage}
  pageSize={pageSize}
  total={totalItems}
  onPageChange={setCurrentPage}
  onPageSizeChange={setPageSize}
/>
```

---

## Best Practices

### 1. State Management

✅ **DO:** Use FilterPanel's callback-based API

```typescript
const handleFilterChange = (key: string, value: any) => {
  // Works with any state manager (useState, Redux, Zustand, etc.)
  updateState({ [key]: value });
};
```

❌ **DON'T:** Rely on component-internal state

```typescript
// No! Component won't update external state
<FilterPanel defaultValues={filters} />
```

### 2. Styling

✅ **DO:** Use Tailwind classes for customization

```typescript
<FilterPanel
  filters={config}
  values={filters}
  onChange={handleChange}
  onReset={handleReset}
  className="bg-slate-50 rounded-lg"
/>
```

❌ **DON'T:** Override with inline styles

```typescript
<FilterPanel style={{ backgroundColor: 'red' }} />
```

### 3. Search Matching

✅ **DO:** Provide custom matchers for specific needs

```typescript
const matcher = (item, query) => item.name.toLowerCase().includes(query);
const { filtered } = usePickerSearch({ items, searchMatcher: matcher });
```

❌ **DON'T:** Assume default JSON.stringify matching works everywhere

```typescript
// Default works for simple fields, but might not for complex objects
const { filtered } = usePickerSearch({ items });
```

### 4. Accessibility

✅ **DO:** Include ARIA labels and keyboard navigation

```typescript
<GenericPickerDropdown
  groups={groups}
  selected={selected}
  onSelect={setSelected}
  placeholder="Select an option"
/>
```

❌ **DON'T:** Skip labels and keyboard support

```typescript
// Missing accessibility features
<div onClick={() => {}}>Click me</div>
```

### 5. Performance

✅ **DO:** Memoize filter config if it doesn't change

```typescript
const filterConfig = useMemo(() => [...], []);
<FilterPanel filters={filterConfig} ... />
```

❌ **DON'T:** Create new arrays on every render

```typescript
<FilterPanel filters={[...]} />  // New array every render
```

### 6. Testing

✅ **DO:** Test state changes, not component implementation

```typescript
const { getByRole } = render(<FilterPanel {...props} />);
fireEvent.change(getByRole('textbox'), { target: { value: 'test' } });
expect(onChange).toHaveBeenCalledWith('search', 'test');
```

❌ **DON'T:** Test internal component structure

```typescript
expect(container.querySelector('.filter-field')).toBeTruthy();
```

---

## Migration Guide

### Step 1: Identify Components to Migrate

Look for components with:

- Multiple filter/search fields
- Dropdown selections
- Grid-based pickers
- Similar UX patterns across features

Example candidates:

```
✅ ProductFilters → FilterPanel (done)
✅ NotesFilters → FilterPanel (done)
⏳ CustomFilters → FilterPanel (candidate)
⏳ ItemPicker → GenericPickerDropdown (candidate)
⏳ ImageGrid → GenericGridPicker (candidate)
```

### Step 2: Map Existing Implementation to Template

Before migration, understand current component:

```
Current: Custom filter UI
  ├── Search input
  ├── Category select
  ├── Date range picker
  ├── Reset button
  └── Apply button

Target: FilterPanel
  ├── Built-in search
  ├── Auto-rendered select
  ├── Auto-rendered dateRange
  ├── Built-in reset
  ├── Applies on change
```

### Step 3: Extract Filter Configuration

```typescript
// Before: Hardcoded in JSX
return (
  <input placeholder="Search..." />
  <select><option>Category A</option></select>
);

// After: Configuration-driven
const filterConfig: FilterField[] = [
  { key: 'search', label: 'Search', type: 'text', placeholder: '...' },
  { key: 'category', label: 'Category', type: 'select', options: [...] },
];
```

### Step 4: Adapt State Management

```typescript
// Before: Multiple setState calls
const [search, setSearch] = useState('');
const [category, setCategory] = useState('');
const handleSearchChange = (e) => setSearch(e.target.value);
const handleCategoryChange = (val) => setCategory(val);

// After: Single unified handler
const [filters, setFilters] = useState({ search: '', category: '' });
const handleFilterChange = (key, value) => {
  setFilters((prev) => ({ ...prev, [key]: value }));
};
```

### Step 5: Replace UI with FilterPanel

```typescript
// Before: 150+ LOC custom UI
<div className="space-y-4">
  <SearchInput value={search} onChange={handleSearchChange} />
  <Select value={category} onValueChange={handleCategoryChange} />
  <div className="flex gap-2">
    <Button onClick={handleReset}>Reset</Button>
    <Button onClick={handleApply}>Apply</Button>
  </div>
</div>

// After: Simple FilterPanel (20 LOC)
<FilterPanel
  filters={filterConfig}
  values={filters}
  onChange={handleFilterChange}
  onReset={handleReset}
/>
```

### Step 6: Test & Deploy

```bash
# Run tests to ensure no regressions
npm run test

# Lint for style compliance
npm run lint

# Build to catch TypeScript errors
npm run build

# Deploy when confident
git commit -m "refactor: migrate to FilterPanel"
```

---

## FAQ

### Q: Should I use FilterPanel for complex display toggles?

**A:** No. FilterPanel is optimized for simple filters (search, select, date). Keep complex display toggles (view modes, advanced settings) separate from FilterPanel for better reusability.

### Q: Can FilterPanel work with my state manager (Redux/Zustand)?

**A:** Yes! FilterPanel uses callback-based API (`onChange`). It works with any state manager:

```typescript
const handleFilterChange = (key, value) => {
  dispatch(updateFilter({ [key]: value })); // Redux
  store.setFilter(key, value); // Zustand
  updateSettings({ [key]: value }); // Context
};
```

### Q: How do I search for items with complex nested data?

**A:** Use custom `searchMatcher` in `usePickerSearch`:

```typescript
const matcher = (item, query) => {
  return item.nested?.field?.value?.includes(query) || item.other?.property?.includes(query);
};
const { filtered } = usePickerSearch({ items, searchMatcher: matcher });
```

### Q: Can I style FilterPanel to match my design system?

**A:** Yes, use Tailwind CSS classes via `className` prop:

```typescript
<FilterPanel
  filters={config}
  values={filters}
  onChange={handleChange}
  className="bg-blue-50 border-blue-200 rounded-xl"
/>
```

### Q: What's the performance impact of these components?

**A:** Minimal. All components use React.memo for memoization. Test with real data for your use case. Typical performance: 0-5ms render time.

### Q: Should I create new components or use templates?

**A:** Always try templates first. Only create new components if:

1. Template doesn't support your use case
2. Performance requirements are extreme
3. UI/UX significantly differs from template

### Q: How do I handle forms with these patterns?

**A:** Use with custom form state management:

```typescript
const [formData, setFormData] = useState({});
const handleFilterChange = (key, value) => {
  setFormData((prev) => ({ ...prev, [key]: value }));
};
// Then submit formData on button click
```

### Q: Can I combine FilterPanel with GenericPickerDropdown?

**A:** Yes! FilterPanel uses simple select fields. For complex picker logic, use GenericPickerDropdown separately:

```typescript
<FilterPanel {...props} />  // Standard filters
<GenericPickerDropdown {...props} />  // Complex selection
```

### Q: What if my filter fields have conditional visibility?

**A:** Dynamically generate filterConfig:

```typescript
const filterConfig = useMemo(() => {
  const config = [...baseConfig];
  if (showAdvanced) {
    config.push({ key: 'advanced', label: 'Advanced', type: 'text' });
  }
  return config;
}, [showAdvanced]);
```

---

## Resources

### Core Documentation

- **Component Patterns Guide:** `docs/COMPONENT_PATTERNS.md`
- **TypeScript Types:** `src/shared/ui/templates/pickers/types.ts`
- **Shared UI Exports:** `src/shared/ui/index.ts`

### Component Files

- **FilterPanel:** `src/shared/ui/templates/FilterPanel.tsx`
- **PanelFilters:** `src/shared/ui/templates/panels/PanelFilters.tsx`
- **GenericPickerDropdown:** `src/shared/ui/templates/pickers/GenericPickerDropdown.tsx`
- **GenericGridPicker:** `src/shared/ui/templates/pickers/GenericGridPicker.tsx`
- **usePickerSearch:** `src/shared/ui/templates/pickers/usePickerSearch.ts`

### Test Examples

- **FilterPanel Tests:** `__tests__/shared/ui/FilterPanel.test.tsx`
- **Picker Tests:** `__tests__/shared/ui/templates/pickers/`
- **Panel Tests:** `__tests__/shared/ui/templates/panels/`

### Real-World Examples

- **ProductFilters:** `src/features/products/components/list/ProductFilters.tsx`
- **NotesFilters:** `src/features/notesapp/components/NotesFilters.tsx`
- **AnimationPresetPicker:** `src/features/gsap/components/AnimationPresetPicker.tsx`

---

## Getting Help

1. **Check the FAQ** above
2. **Review real examples** in `/src/features/` (ProductFilters, NotesFilters, etc.)
3. **Read test files** in `__tests__/` for usage patterns
4. **Refer to types** in `src/shared/ui/templates/pickers/types.ts`

---

**Last Updated:** February 13, 2026
**Version:** 1.0 (Production-Ready)
**Maintained By:** UI Consolidation Project
