import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Language } from '@/shared/contracts/internationalization';
import type { ProductParameter, ProductWithImages } from '@/shared/contracts/products';
import {
  ProductFormMetadataContext,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';
import { ProductFormParameterProvider } from '@/features/products/context/ProductFormParameterContext';

const { useParametersMock } = vi.hoisted(() => ({
  useParametersMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useParameters: useParametersMock,
}));

vi.mock('lucide-react', () => ({
  X: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid='remove-parameter' />,
}));

vi.mock('@/shared/ui', async () => {
  const ReactModule = await import('react');
  const TabsContext = ReactModule.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: '' });

  return {
    Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Button: ({
      children,
      type = 'button',
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type={type} {...props}>
        {children}
      </button>
    ),
    EmptyState: ({ title, description }: { title: string; description: string }) => (
      <div>
        <div>{title}</div>
        <div>{description}</div>
      </div>
    ),
    FormSection: ({
      title,
      description,
      children,
    }: {
      title: string;
      description?: string;
      children: React.ReactNode;
    }) => (
      <section>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {children}
      </section>
    ),
    Input: ReactModule.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
      function Input(props, ref) {
        return <input ref={ref} {...props} />;
      }
    ),
    Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
      <label {...props}>{children}</label>
    ),
    LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
    RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioGroupItem: ReactModule.forwardRef<
      HTMLInputElement,
      React.InputHTMLAttributes<HTMLInputElement>
    >(function RadioGroupItem(props, ref) {
      return <input ref={ref} type='radio' {...props} />;
    }),
    SelectSimple: ({
      value,
      onValueChange,
      options,
      placeholder,
      disabled,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      options: Array<{ value: string; label: string }>;
      placeholder?: string;
      disabled?: boolean;
    }) => (
      <select
        aria-label={placeholder ?? 'select'}
        value={value}
        disabled={disabled}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
          onValueChange?.(event.target.value)
        }
      >
        <option value=''>{placeholder ?? 'Select'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div role='tablist'>{children}</div>,
    TabsTrigger: ({
      value,
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => {
      const tabs = ReactModule.useContext(TabsContext);
      const isActive = tabs.value === value;
      return (
        <button
          type='button'
          role='tab'
          aria-selected={isActive}
          data-state={isActive ? 'active' : 'inactive'}
          onClick={() => tabs.onValueChange?.(value)}
          {...props}
        >
          {children}
        </button>
      );
    },
    Textarea: ReactModule.forwardRef<
      HTMLTextAreaElement,
      React.TextareaHTMLAttributes<HTMLTextAreaElement>
    >(function Textarea(props, ref) {
      return <textarea ref={ref} {...props} />;
    }),
    ToggleRow: ({
      label,
      checked,
      onCheckedChange,
      disabled,
    }: {
      label: string;
      checked: boolean;
      onCheckedChange?: (checked: boolean) => void;
      disabled?: boolean;
    }) => (
      <label>
        <input
          type='checkbox'
          checked={checked}
          disabled={disabled}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onCheckedChange?.(event.target.checked)
          }
        />
        {label}
      </label>
    ),
  };
});

import ProductFormParameters from './ProductFormParameters';

const catalogLanguages: Language[] = [
  {
    id: 'lang-en',
    name: 'English',
    nativeName: 'English',
    code: 'en',
    isDefault: true,
    isActive: true,
    countries: [],
  } as Language,
  {
    id: 'lang-pl',
    name: 'Polish',
    nativeName: 'Polski',
    code: 'pl',
    isDefault: false,
    isActive: true,
    countries: [],
  } as Language,
];

const metadataValue: ProductFormMetadataContextType = {
  catalogs: [],
  catalogsLoading: false,
  catalogsError: null,
  selectedCatalogIds: ['catalog-1'],
  toggleCatalog: vi.fn(),
  categories: [],
  categoriesLoading: false,
  selectedCategoryId: null,
  setCategoryId: vi.fn(),
  tags: [],
  tagsLoading: false,
  selectedTagIds: [],
  toggleTag: vi.fn(),
  producers: [],
  producersLoading: false,
  selectedProducerIds: [],
  toggleProducer: vi.fn(),
  filteredLanguages: catalogLanguages,
  filteredPriceGroups: [],
};

const textParameter = {
  id: 'condition',
  name_en: 'Condition',
  name_pl: 'Stan',
  selectorType: 'text',
} as Partial<ProductParameter> as ProductParameter;

const createProduct = (
  parameters: NonNullable<ProductWithImages['parameters']>
): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: 'catalog-1',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters,
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as ProductWithImages;

function renderParameters(parameters: NonNullable<ProductWithImages['parameters']>) {
  useParametersMock.mockReturnValue({
    data: [textParameter],
    isLoading: false,
  });

  return render(
    <ProductFormMetadataContext.Provider value={metadataValue}>
      <ProductFormParameterProvider
        product={createProduct(parameters)}
        selectedCatalogIds={['catalog-1']}
      >
        <ProductFormParameters />
      </ProductFormParameterProvider>
    </ProductFormMetadataContext.Provider>
  );
}

describe('ProductFormParameters', () => {
  it('keeps Polish separate when English is cleared in the UI', async () => {
    const user = userEvent.setup();
    renderParameters([
      {
        parameterId: 'condition',
        value: 'Used',
        valuesByLanguage: { en: 'Used', pl: 'Uzywany' },
      },
    ]);

    const englishInput = screen.getByPlaceholderText('Value (English)');
    expect(englishInput).toHaveValue('Used');

    await user.clear(englishInput);

    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('');

    await user.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByPlaceholderText('Value (Polish)')).toHaveValue('Uzywany');

    await user.click(screen.getByRole('tab', { name: 'English' }));

    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('');
  });

  it('does not backfill the English field from a Polish-only localized value', async () => {
    const user = userEvent.setup();
    renderParameters([
      {
        parameterId: 'condition',
        value: 'Uzywany',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);

    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('');

    await user.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByPlaceholderText('Value (Polish)')).toHaveValue('Uzywany');
  });
});
