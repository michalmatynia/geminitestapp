# Component Patterns & Consolidation Guide

This document describes reusable component patterns to maintain consistency and reduce duplication across features.

## Table of Contents
1. [Modal Templates](#modal-templates)
2. [Settings Panel Factory](#settings-panel-factory)
3. [Form State Hook](#form-state-hook)
4. [Migration Guide](#migration-guide)

---

## Modal Templates

Modal templates provide consistent, reusable patterns for common modal use cases.

### Available Templates

#### 1. SelectModal
**Purpose**: Single/multi-select operations
**Replaces**: `SelectIntegrationModal`, `SelectProductForListingModal`, custom selection modals

```tsx
import { SelectModal, type SelectOption } from '@/shared/ui/templates/modals/SelectModal';

const options: SelectOption<string>[] = [
  { id: '1', label: 'Option 1', value: 'opt1', description: 'First option' },
  { id: '2', label: 'Option 2', value: 'opt2', description: 'Second option' },
];

<SelectModal
  open={isOpen}
  onClose={handleClose}
  title="Select Integration"
  options={options}
  onSelect={(option) => console.log('Selected:', option)}
  searchable={true}
  multiple={false}
/>
```

**Props**:
- `open: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `title: string` - Modal title
- `subtitle?: string` - Optional subtitle
- `options: SelectOption<T>[]` - Options to select from
- `onSelect: (option: SelectOption<T>) => void` - Selection handler
- `loading?: boolean` - Loading state
- `searchable?: boolean` - Enable search filter (default: true)
- `multiple?: boolean` - Allow multi-select (default: false)
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal size

#### 2. ConfirmModal
**Purpose**: Confirmation dialogs for destructive/important actions
**Replaces**: Custom delete/confirm modals, `*ConfirmDialog` components

```tsx
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

<ConfirmModal
  open={isOpen}
  onClose={handleClose}
  onConfirm={async () => {
    await api.delete(item);
  }}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  isDangerous={true}
/>
```

**Props**:
- `open: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `onConfirm: () => void | Promise<void>` - Confirmation handler
- `title: string` - Modal title
- `subtitle?: string` - Optional subtitle
- `message?: React.ReactNode` - Confirmation message
- `confirmText?: string` - Confirm button text (default: "Confirm")
- `cancelText?: string` - Cancel button text (default: "Cancel")
- `loading?: boolean` - Loading state during submit
- `isDangerous?: boolean` - Show destructive button style (default: false)
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal size

#### 3. DetailModal
**Purpose**: Display detailed information, logs, or read-only content
**Replaces**: `*DetailModal`, `*PreviewModal`, `LogModal`, `ContentDisplayModal`

```tsx
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

<DetailModal
  open={isOpen}
  onClose={handleClose}
  title="Sync Result"
  subtitle="View details of the last synchronization"
>
  <div className="space-y-4">
    <p>Status: Success</p>
    <pre>{JSON.stringify(syncLog, null, 2)}</pre>
  </div>
</DetailModal>
```

**Props**:
- `open: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `title: string` - Modal title
- `subtitle?: string` - Optional subtitle
- `children: React.ReactNode` - Modal content
- `footer?: React.ReactNode` - Optional footer content
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Modal size
- `maxHeight?: string` - Max height class (default: 'max-h-[70vh]')

---

## Settings Panel Factory

Generic settings panel builder for consistent CRUD settings UI.

**Replaces**: Individual settings modals (Theme, Component, Menu, Viewer3D, etc.)

```tsx
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  theme: 'light' | 'dark';
  fontSize: number;
  enableAnimations: boolean;
}

const fields: SettingsField<ThemeSettings>[] = [
  {
    key: 'primaryColor',
    label: 'Primary Color',
    type: 'text',
    placeholder: '#000000',
    helperText: 'Use hex format',
    required: true,
  },
  {
    key: 'theme',
    label: 'Theme',
    type: 'select',
    options: [
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ],
  },
  {
    key: 'fontSize',
    label: 'Font Size',
    type: 'number',
    placeholder: '14',
  },
  {
    key: 'enableAnimations',
    label: 'Enable Animations',
    type: 'checkbox',
    placeholder: 'Enable smooth animations',
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Enter description...',
  },
];

const [settings, setSettings] = useState<ThemeSettings>(initialSettings);
const [errors, setErrors] = useState<Partial<Record<keyof ThemeSettings, string>>>({});

<SettingsPanelBuilder
  open={isOpen}
  onClose={handleClose}
  title="Theme Settings"
  fields={fields}
  values={settings}
  errors={errors}
  onChange={setSettings}
  onSave={async () => {
    const validationErrors = await validateSettings(settings);
    if (validationErrors) {
      setErrors(validationErrors);
      return;
    }
    await api.saveThemeSettings(settings);
  }}
  isSaving={isSaving}
/>
```

**Custom Field Rendering**:
For complex fields, use the `render` prop:

```tsx
const fields: SettingsField<Settings>[] = [
  {
    key: 'colors',
    label: 'Color Palette',
    type: 'custom',
    render: ({ value, onChange, disabled }) => (
      <ColorPaletteSelector
        colors={value}
        onChange={onChange}
        disabled={disabled}
      />
    ),
  },
];
```

---

## Form State Hook

Generic hook for managing form state, validation, and submission.

**Replaces**: `ProductFormContext`, `NoteFormContext`, `DraftCreatorFormContext`, `CategoryFormContext`

```tsx
import { useFormState } from '@/shared/hooks/useFormState';

interface ProductForm {
  name: string;
  price: number;
  description: string;
}

const { state, actions } = useFormState<ProductForm>({
  initialValues: {
    name: '',
    price: 0,
    description: '',
  },
  
  validate: async (values) => {
    const errors: Partial<Record<keyof ProductForm, string>> = {};
    
    if (!values.name) {
      errors.name = 'Product name is required';
    }
    if (values.price < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    return errors;
  },
  
  onSubmit: async (values) => {
    await api.saveProduct(values);
  },
  
  onSubmitSuccess: () => {
    toast.success('Product saved!');
  },
  
  onSubmitError: (error) => {
    toast.error(`Failed to save: ${error.message}`);
  },
});

// Use in component
return (
  <form>
    <input
      value={state.values.name}
      onChange={(e) => actions.setValue('name', e.target.value)}
    />
    {state.errors.name && <p>{state.errors.name}</p>}
    
    <button
      onClick={actions.handleSubmit}
      disabled={!state.isValid || state.isSubmitting}
    >
      {state.isSubmitting ? 'Saving...' : 'Save'}
    </button>
  </form>
);
```

**State**:
- `values: T` - Current form values
- `errors: Partial<Record<keyof T, string>>` - Validation errors
- `isSubmitting: boolean` - Submission in progress
- `isDirty: boolean` - Form has been modified
- `isValid: boolean` - No validation errors

**Actions**:
- `setValue(field, value)` - Update single field
- `setValues(values)` - Update multiple fields
- `setFieldError(field, error)` - Set field error
- `clearFieldError(field)` - Clear field error
- `clearErrors()` - Clear all errors
- `handleSubmit()` - Validate and submit
- `reset()` - Reset to initial values
- `getValues()` - Get current form values
- `getValue(field)` - Get specific field value

---

## Migration Guide

### Migrating from Custom Modals to Templates

#### Example: Replace `SelectIntegrationModal`

**Before**:
```tsx
export function SelectIntegrationModal({ onClose, onSelect }) {
  const [search, setSearch] = useState('');
  const [integrations, setIntegrations] = useState([]);
  
  useEffect(() => {
    // Custom search logic
  }, [search]);
  
  return (
    <AppModal open={true} onClose={onClose} title="Select Integration">
      {/* Custom UI */}
    </AppModal>
  );
}
```

**After**:
```tsx
import { SelectModal, type SelectOption } from '@/shared/ui/templates/modals/SelectModal';

export function SelectIntegrationModal({ onClose, onSelect }) {
  const integrations = useIntegrations(); // Your data hook
  
  const options: SelectOption<Integration>[] = integrations.map(i => ({
    id: i.id,
    label: i.name,
    value: i,
    description: i.description,
  }));
  
  return (
    <SelectModal
      open={true}
      onClose={onClose}
      title="Select Integration"
      options={options}
      onSelect={(option) => onSelect(option.value)}
      searchable={true}
    />
  );
}
```

### Migrating from Context to useFormState

**Before**:
```tsx
// src/features/products/context/ProductFormContext.tsx
export const ProductFormContext = createContext<ProductFormContextType | null>(null);

export function useProductForm() {
  const context = useContext(ProductFormContext);
  if (!context) throw new Error('Not in ProductFormProvider');
  return context;
}
```

**After**:
```tsx
import { useFormState } from '@/shared/hooks/useFormState';

export function useProductForm(product?: Product) {
  return useFormState<ProductFormData>({
    initialValues: product ? productToFormData(product) : defaultFormData,
    validate: validateProductForm,
    onSubmit: submitProductForm,
    onSubmitSuccess: () => router.push('/products'),
  });
}
```

### Migrating Settings Modals to SettingsPanelBuilder

**Before**:
```tsx
export function ThemeSettingsModal({ open, onClose }) {
  const [theme, setTheme] = useState('');
  const [color, setColor] = useState('');
  // ... many useState hooks
  
  return (
    <FormModal open={open} onClose={onClose} title="Theme">
      <input
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      />
      {/* More fields */}
    </FormModal>
  );
}
```

**After**:
```tsx
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface ThemeSettings {
  theme: string;
  color: string;
}

export function ThemeSettingsModal({ open, onClose }) {
  const [settings, setSettings] = useState<ThemeSettings>(initialSettings);
  const [errors, setErrors] = useState({});
  
  const fields: SettingsField<ThemeSettings>[] = [
    { key: 'theme', label: 'Theme', type: 'select', options: [...] },
    { key: 'color', label: 'Color', type: 'text' },
  ];
  
  return (
    <SettingsPanelBuilder
      open={open}
      onClose={onClose}
      title="Theme Settings"
      fields={fields}
      values={settings}
      errors={errors}
      onChange={setSettings}
      onSave={async () => {
        await api.saveThemeSettings(settings);
      }}
    />
  );
}
```

---

## Best Practices

1. **Use modal templates for consistency** - If modal fits a pattern, use the template
2. **Keep forms simple** - Use `useFormState` for all forms to maintain consistency
3. **Validate early** - Pass validation function to `useFormState`
4. **Provide feedback** - Use callbacks (`onSubmitSuccess`, `onSubmitError`) for user feedback
5. **Make fields optional** - Only require fields that are truly necessary
6. **Add helper text** - Help users understand complex fields
7. **Test your templates** - Unit test any custom field renderers or complex logic

---

**Last Updated**: February 13, 2026

---

# Phase 2: Integration Layer Consolidation

## Base Mapper Consolidation

### Problem
Three nearly-identical mapper components (`BaseTagMapper`, `BaseProducerMapper`, `BaseCategoryMapper`) with 95% code duplication:
- Identical UI/UX patterns
- Identical state management logic
- Identical error handling
- Only differences: field names and data sources

**Code Duplicated**: ~470 lines

### Solution: GenericItemMapper

A single reusable generic component that consolidates all three mappers.

```tsx
import { GenericItemMapper } from '@/features/integrations/components/marketplaces/category-mapper/GenericItemMapper';
import type { GenericItemMapperConfig } from '@/features/integrations/components/marketplaces/category-mapper/GenericItemMapper';

// Type-safe configuration
interface TagMapperConfig extends GenericItemMapperConfig<ProductTag, ExternalTag, TagMapping> {
  // ...
}

// Usage
<GenericItemMapper<ProductTag, ExternalTag, TagMapping>
  config={{
    title: 'Base.com Tags',
    internalColumnHeader: 'Internal Tag',
    externalColumnHeader: 'Base.com Tag',
    additionalColumnsHeader: 'Catalog', // Optional
    
    // Data
    internalItems: tags,
    externalItems: externalTags,
    currentMappings: mappings,
    
    // Accessors (map data to display)
    getInternalId: (tag) => tag.id,
    getInternalLabel: (tag) => tag.name,
    getExternalId: (tag) => tag.id,
    getExternalLabel: (tag) => tag.name,
    getInternalAdditionalLabel: (tag) => catalogName, // Optional
    
    // Mapping accessors
    getMappingInternalId: (mapping) => mapping.internalTagId,
    getMappingExternalId: (mapping) => mapping.externalTagId,
    
    // Operations
    onFetch: async () => await fetchTagsMutation(),
    onSave: async (mappings) => await saveMappingsMutation(mappings),
    
    // Loading states
    isLoadingInternal: tagsQuery.isLoading,
    isLoadingExternal: externalTagsQuery.isLoading,
    isLoadingMappings: mappingsQuery.isLoading,
    isFetching: fetchMutation.isPending,
    isSaving: saveMutation.isPending,
  }}
/>
```

### Migration Path

#### Before: BaseTagMapper (226 lines)
```tsx
export function BaseTagMapper(): React.JSX.Element {
  const { connectionId, connectionName } = useCategoryMapper();
  const { toast } = useToast();
  const internalTagsQuery = useQuery({...});
  const externalTagsQuery = useExternalTags(connectionId);
  const mappingsQuery = useTagMappings(connectionId);
  const fetchMutation = useFetchExternalTagsMutation();
  const saveMutation = useSaveTagMappingsMutation();

  const internalTags = useMemo(() => [...].sort(...), [...]);
  const externalTagOptions = useMemo(() => [...].map(...), [...]);
  
  const { pendingMappings, ... } = usePendingExternalMappings({...});

  const handleFetch = async () => { try { ... } catch (error) { ... } };
  const handleSave = async () => { try { ... } catch (error) { ... } };

  return (
    <div className='space-y-4 border-t ...'>
      <SectionHeader title='Base.com Tags' actions={...} />
      <div className='flex gap-6'>...</div>
      <Table>
        <TableHeader>...</TableHeader>
        <TableBody>
          {internalTags.map(tag => (
            <TableRow key={tag.id}>...</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### After: BaseTagMapper (Refactored, ~40 lines)
```tsx
export function BaseTagMapper(): React.JSX.Element {
  const { connectionId } = useCategoryMapper();
  const internalTagsQuery = useQuery({...});
  const externalTagsQuery = useExternalTags(connectionId);
  const mappingsQuery = useTagMappings(connectionId);
  const fetchMutation = useFetchExternalTagsMutation();
  const saveMutation = useSaveTagMappingsMutation();

  return (
    <GenericItemMapper<ProductTag, any, TagMapping>
      config={{
        title: 'Base.com Tags',
        internalColumnHeader: 'Internal Tag',
        externalColumnHeader: 'Base.com Tag',
        additionalColumnsHeader: 'Catalog',
        // Data mapping...
        getInternalId: tag => tag.id,
        getInternalLabel: tag => tag.name,
        // ... rest of accessors
        onFetch: () => fetchMutation.mutateAsync({ connectionId }),
        onSave: (mappings) => saveMutation.mutateAsync({...}),
      }}
    />
  );
}
```

### Impact
- **Lines Reduced**: 226 → 40 lines per component (82% reduction)
- **Total Reduction**: 470 → ~280 lines (40% total reduction)
- **Maintenance**: Single source of truth for mapper UI/logic
- **Extensibility**: Easy to create new mappers for other resources

### Key Features of GenericItemMapper
- ✅ Full TypeScript generics (`<TInternal, TExternal, TMapping>`)
- ✅ Flexible data accessors (callbacks for field extraction)
- ✅ Optional additional column support
- ✅ Built-in pending mappings tracking
- ✅ Consistent error handling and logging
- ✅ Loading state management
- ✅ Toast notifications for user feedback
- ✅ Backward compatible with existing code

### Refactored Components
The following components have been refactored to use `GenericItemMapper`:

1. **BaseTagMapper.tsx** - Maps internal product tags to external marketplace tags
2. **BaseProducerMapper.tsx** - Maps internal producers to external marketplace producers
3. **BaseCategoryMapper.tsx** (partial) - Can use generic mapper for category mapping sub-component

### Usage Pattern

All refactored mappers follow this pattern:

```tsx
1. Fetch and sort data using hooks
2. Create accessor functions (getInternalLabel, getExternalId, etc.)
3. Create operation handlers (onFetch, onSave)
4. Pass everything to GenericItemMapper via config

Result: 
- Cleaner component logic
- Less boilerplate
- Type-safe with generics
- Easier to test
- Consistent behavior across all mappers
```

### Testing

GenericItemMapper should be tested for:
- ✓ Rendering with different data types
- ✓ Handling fetch operations
- ✓ Handling save operations
- ✓ Pending changes tracking
- ✓ Loading states
- ✓ Error handling and toast notifications
- ✓ Sorting and filtering
- ✓ Optional additional columns

Example test:
```tsx
it('should save pending mappings', async () => {
  const onSave = vi.fn().mockResolvedValue({ message: 'Saved' });
  const { getByText } = render(
    <GenericItemMapper<MockItem, ExternalItem, MockMapping>
      config={{
        // ... config
        onSave,
      }}
    />
  );

  fireEvent.click(getByText('Save'));
  await waitFor(() => {
    expect(onSave).toHaveBeenCalled();
  });
});
```

---

**Last Updated**: February 13, 2026

---

# Phase 2.2: API Console Base Consolidation

## Problem
Three API console wrapper components (`BaseApiConsole`, `AllegroApiConsole`) with duplicate logic:
- Nearly identical wrapper implementation (63 + 70 lines)
- Generic UI component (`ApiConsole`, 178 lines) used by both
- Only differences: context variable names and preset definitions

**Code Duplicated**: ~130 lines of wrapper logic

## Solution: GenericApiConsole

Refactored the generic UI component to be config-driven, eliminating the need for wrapper duplicates.

### Before: Separate Wrappers (70 lines each)
```tsx
export function BaseApiConsole(): React.JSX.Element {
  const {
    connections,
    baseApiMethod,
    setBaseApiMethod,
    baseApiParams,
    setBaseApiParams,
    baseApiLoading,
    baseApiError,
    baseApiResponse,
    handleBaseApiRequest,
  } = useIntegrationsContext();

  // ... preset definitions ...

  return (
    <ApiConsole
      title='Base.com API Console'
      description='Send Base.com API requests...'
      presets={baseApiPresets}
      method={baseApiMethod}
      setMethod={setBaseApiMethod}
      bodyOrParams={baseApiParams}
      setBodyOrParams={setBaseApiParams}
      bodyOrParamsLabel='Parameters (JSON)'
      loading={baseApiLoading}
      error={baseApiError}
      response={baseApiResponse}
      onRequest={() => { void handleBaseApiRequest(); }}
      baseUrl='https://api.baselinker.com/connector.php'
      methodType='input'
    />
  );
}

export function AllegroApiConsole(): React.JSX.Element {
  const {
    connections,
    allegroApiMethod,
    setAllegroApiMethod,
    allegroApiPath,
    setAllegroApiPath,
    allegroApiBody,
    setAllegroApiBody,
    allegroApiLoading,
    allegroApiError,
    allegroApiResponse,
    handleAllegroApiRequest,
  } = useIntegrationsContext();

  // ... similar preset definitions ...

  return (
    <ApiConsole
      title='Allegro API Console'
      // ... 30+ props for API config ...
    />
  );
}
```

### After: Config-Driven (30-40 lines each)
```tsx
export function BaseApiConsole(): React.JSX.Element {
  const {
    baseApiMethod,
    setBaseApiMethod,
    baseApiParams,
    setBaseApiParams,
    baseApiLoading,
    baseApiError,
    baseApiResponse,
    handleBaseApiRequest,
  } = useIntegrationsContext();

  return (
    <GenericApiConsole
      config={{
        title: 'Base.com API Console',
        description: 'Send Base.com API requests...',
        baseUrl: 'https://api.baselinker.com/connector.php',
        methodType: 'input',
        bodyOrParamsLabel: 'Parameters (JSON)',
      }}
      state={{
        method: baseApiMethod,
        bodyOrParams: baseApiParams,
        loading: baseApiLoading,
        error: baseApiError,
        response: baseApiResponse,
      }}
      presets={baseApiPresets}
      onSetMethod={setBaseApiMethod}
      onSetBodyOrParams={setBaseApiParams}
      onRequest={() => { void handleBaseApiRequest(); }}
    />
  );
}
```

### GenericApiConsole Props Interface

```tsx
export interface GenericApiConsoleConfig {
  title: string;
  description: string;
  baseUrl: string;
  methodType?: 'select' | 'input';           // How to input HTTP method
  bodyOrParamsLabel?: string;                 // Label for body/params field
  connectionWarning?: string;                 // Warning if not connected
}

export interface GenericApiConsoleState {
  method: string;
  path?: string;
  bodyOrParams: string;
  loading: boolean;
  error: string | null;
  response: {
    status?: number;
    statusText?: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
}

export interface GenericApiConsoleProps {
  config: GenericApiConsoleConfig;
  state: GenericApiConsoleState;
  presets: ApiPreset[];
  isConnected?: boolean;
  onSetMethod: (value: string) => void;
  onSetPath?: (value: string) => void;
  onSetBodyOrParams: (value: string) => void;
  onRequest: () => void;
}
```

### Key Features

✅ **Configuration-Driven**
- All UI/display options in `config` object
- Reusable for any API endpoint

✅ **Flexible State Management**
- Accepts external state (can be from context, useState, etc.)
- Doesn't impose state management approach

✅ **Optional Path Support**
- `onSetPath` callback only rendered if provided
- Works with path-based APIs (Allegro) and parameter-based (Base.com)

✅ **Provider-Agnostic**
- No hard-coded API provider logic
- Easy to add new providers (Shopify, WooCommerce, etc.)

✅ **Connection Status**
- Optional `isConnected` prop
- Optional `connectionWarning` in config
- Disables send button when not connected

## Impact

- **Wrapper Lines Reduced**: 70 → 35 lines per wrapper (50% reduction)
- **Total Reduction**: 130+ lines eliminated
- **Maintainability**: Single source of truth for API console UI
- **Extensibility**: Easy to add new API providers

## Refactored Components

1. **BaseApiConsole.tsx** - Base.com API console wrapper
2. **AllegroApiConsole.tsx** - Allegro API console wrapper

Both maintain 100% backward compatibility with existing code.

## Usage Example

```tsx
// For a new provider (e.g., Shopify)
export function ShopifyApiConsole(): React.JSX.Element {
  const {
    shopifyMethod,
    setShopifyMethod,
    shopifyPath,
    setShopifyPath,
    shopifyBody,
    setShopifyBody,
    shopifyLoading,
    shopifyError,
    shopifyResponse,
    handleShopifyRequest,
  } = useIntegrationsContext();

  return (
    <GenericApiConsole
      config={{
        title: 'Shopify API Console',
        description: 'Test Shopify REST API endpoints',
        baseUrl: 'https://your-store.myshopify.com/admin/api/2024-01',
        methodType: 'select',
        bodyOrParamsLabel: 'JSON body',
      }}
      state={{
        method: shopifyMethod,
        path: shopifyPath,
        bodyOrParams: shopifyBody,
        loading: shopifyLoading,
        error: shopifyError,
        response: shopifyResponse,
      }}
      presets={shopifyPresets}
      isConnected={hasShopifyConnection}
      onSetMethod={setShopifyMethod}
      onSetPath={setShopifyPath}
      onSetBodyOrParams={setShopifyBody}
      onRequest={handleShopifyRequest}
    />
  );
}
```

## Testing

GenericApiConsole includes comprehensive test coverage:

- ✓ Renders title, description, presets
- ✓ Handles preset clicks (updates state)
- ✓ Shows/hides path input based on onSetPath prop
- ✓ Disables send button when loading or not connected
- ✓ Displays error alerts
- ✓ Displays response with status/data
- ✓ Shows token refreshed badge
- ✓ Shows connection warning

---

**Last Updated**: February 13, 2026
