// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode, SVGProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Language } from '@/shared/contracts/internationalization';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import { ProductFormCoreProvider } from '@/features/products/context/ProductFormCoreContext';
import {
  ProductFormMetadataContext,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';
import { ProductFormParameterProvider } from '@/features/products/context/ProductFormParameterContext';

const { useParametersMock, useTitleTermsMock } = vi.hoisted(() => ({
  useParametersMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useParameters: useParametersMock,
  useTitleTerms: useTitleTermsMock,
}));

vi.mock('lucide-react', () => ({
  X: (props: SVGProps<SVGSVGElement>) => <svg {...props} data-testid='remove-parameter' />,
  BookType: (props: SVGProps<SVGSVGElement>) => <svg {...props} data-testid='book-type-icon' />,
  ChevronRight: (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid='chevron-right-icon' />
  ),
}));

const TabsContext = React.createContext<{
  value: string;
  onValueChange?: (value: string) => void;
}>({ value: '' });

vi.mock('@/shared/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    type = 'button',
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    children: React.ReactNode;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, props);
    }
    return (
      <button type={type} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock('@/shared/ui/empty-state', () => ({
  CompactEmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/form-section', () => ({
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
  FormField: ({
    label,
    description,
    error,
    children,
    actions,
    id,
  }: {
    label: string;
    description?: string;
    error?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    id?: string;
  }) => (
    <div>
      <div>
        <label htmlFor={id}>{label}</label>
        {actions}
      </div>
      {description ? <p>{description}</p> : null}
      {children}
      {error ? <p>{error}</p> : null}
    </div>
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
}));

vi.mock('@/shared/ui/InsetPanel', () => ({
  insetPanelVariants: () => 'rounded border border-border/60 bg-card/40 p-3',
}));

vi.mock('@/shared/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('@/shared/ui/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/radio-group', () => ({
  RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadioGroupItem: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >(function RadioGroupItem(props, ref) {
    return <input ref={ref} type='radio' {...props} />;
  }),
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onChange,
    onValueChange,
    options,
    placeholder,
    disabled,
    ariaLabel,
  }: {
    value: string;
    onChange?: (value: string) => void;
    onValueChange?: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder ?? 'select'}
      value={value}
      disabled={disabled}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
        onChange?.(event.target.value);
        onValueChange?.(event.target.value);
      }}
    >
      <option value=''>{placeholder ?? 'Select'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/tabs', () => ({
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
    const tabs = React.useContext(TabsContext);
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
}));

vi.mock('@/shared/ui/textarea', () => ({
  Textarea: React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >(function Textarea(props, ref) {
    return <textarea ref={ref} {...props} />;
  }),
}));

vi.mock('@/shared/ui/toggle-row', () => ({
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
}));

import ProductFormParameters from './ProductFormParameters';
import { StructuredProductNameField } from './StructuredProductNameField';

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
  shippingGroups: [],
  shippingGroupsLoading: false,
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

const linkedMaterialParameter = {
  id: 'param-material',
  name_en: 'Material',
  name_pl: 'Materiał',
  name_de: null,
  catalogId: 'catalog-1',
  selectorType: 'text',
  optionLabels: [],
  linkedTitleTermType: 'material',
} as ProductParameter;

function IntegrationHarness({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <ProductFormCoreProvider requireSku={false}>
      <ProductFormMetadataContext.Provider value={metadataValue}>
        <ProductFormParameterProvider selectedCatalogIds={['catalog-1']}>
          {children}
        </ProductFormParameterProvider>
      </ProductFormMetadataContext.Provider>
    </ProductFormCoreProvider>
  );
}

describe('Structured title to parameter mapping integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParametersMock.mockReturnValue({
      data: [linkedMaterialParameter],
      isLoading: false,
    });
    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'size'
          ? [
              {
                id: 'size-4cm',
                catalogId: 'catalog-1',
                type: 'size',
                name_en: '4 cm',
                name_pl: '4 cm',
              },
            ]
          : type === 'material'
            ? [
                {
                  id: 'material-metal',
                  catalogId: 'catalog-1',
                  type: 'material',
                  name_en: 'Metal',
                  name_pl: 'Metal PL',
                },
                {
                  id: 'material-steel',
                  catalogId: 'catalog-1',
                  type: 'material',
                  name_en: 'Steel',
                  name_pl: 'Steel PL',
                },
              ]
            : [
                {
                  id: 'theme-aot',
                  catalogId: 'catalog-1',
                  type: 'theme',
                  name_en: 'Attack On Titan',
                  name_pl: 'Attack On Titan PL',
                },
              ],
      isLoading: false,
    }));
  });

  it('hydrates linked parameters from an already structured English title on first render', async () => {
    render(
      <ProductFormCoreProvider
        requireSku={false}
        draft={
          {
            id: 'draft-1',
            name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
          } as never
        }
      >
        <ProductFormMetadataContext.Provider value={metadataValue}>
          <ProductFormParameterProvider selectedCatalogIds={['catalog-1']}>
            <StructuredProductNameField />
            <ProductFormParameters />
          </ProductFormParameterProvider>
        </ProductFormMetadataContext.Provider>
      </ProductFormCoreProvider>
    );

    expect(await screen.findByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByText('Material term')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');
  });

  it('shows the linked parameter row after selecting a material title term', async () => {
    render(
      <IntegrationHarness>
        <StructuredProductNameField />
        <ProductFormParameters />
      </IntegrationHarness>
    );

    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | et' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | et'.length,
      'Scout Regiment | 4 cm | et'.length
    );
    fireEvent.keyUp(input, { key: 't' });

    const listbox = await screen.findByRole('listbox', { name: 'Material suggestions' });
    const metalOptionButton = within(listbox)
      .getByRole('option', { name: /Metal/ })
      .closest('button');

    fireEvent.click(metalOptionButton as HTMLButtonElement);

    await waitFor(() => {
      expect(input).toHaveValue('Scout Regiment | 4 cm | Metal | ');
    });

    expect(await screen.findByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByText('Material term')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');
    expect(screen.getByPlaceholderText('Value (English)')).toBeDisabled();
    expect(screen.getByLabelText('Remove parameter')).toBeDisabled();
  });

  it('maps linked parameters when the exact material term is typed manually without selecting from the list', async () => {
    render(
      <IntegrationHarness>
        <StructuredProductNameField />
        <ProductFormParameters />
      </IntegrationHarness>
    );

    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | ' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | '.length,
      'Scout Regiment | 4 cm | Metal | '.length
    );
    fireEvent.keyUp(input, { key: 'l' });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');
    });
    expect(screen.getByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByText('Material term')).toBeInTheDocument();
  });

  it('removes the linked parameter row when the material segment no longer matches a stored term', async () => {
    render(
      <IntegrationHarness>
        <StructuredProductNameField />
        <ProductFormParameters />
      </IntegrationHarness>
    );

    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | et' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | et'.length,
      'Scout Regiment | 4 cm | et'.length
    );
    fireEvent.keyUp(input, { key: 't' });

    const listbox = await screen.findByRole('listbox', { name: 'Material suggestions' });
    const metalOptionButton = within(listbox)
      .getByRole('option', { name: /Metal/ })
      .closest('button');

    fireEvent.click(metalOptionButton as HTMLButtonElement);

    expect(await screen.findByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Wood | ' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Wood | '.length,
      'Scout Regiment | 4 cm | Wood | '.length
    );
    fireEvent.keyUp(input, { key: 'd' });

    await waitFor(() => {
      expect(screen.queryByText('Synced from English Title')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No values')).toBeInTheDocument();
  });

  it('updates the linked parameter row when the selected material term changes', async () => {
    render(
      <IntegrationHarness>
        <StructuredProductNameField />
        <ProductFormParameters />
      </IntegrationHarness>
    );

    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | et' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | et'.length,
      'Scout Regiment | 4 cm | et'.length
    );
    fireEvent.keyUp(input, { key: 't' });

    let listbox = await screen.findByRole('listbox', { name: 'Material suggestions' });
    let optionButton = within(listbox)
      .getByRole('option', { name: /Metal/ })
      .closest('button');
    fireEvent.click(optionButton as HTMLButtonElement);

    expect(await screen.findByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | te' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | te'.length,
      'Scout Regiment | 4 cm | te'.length
    );
    fireEvent.keyUp(input, { key: 'e' });

    listbox = await screen.findByRole('listbox', { name: 'Material suggestions' });
    optionButton = within(listbox)
      .getByRole('option', { name: /Steel/ })
      .closest('button');
    fireEvent.click(optionButton as HTMLButtonElement);

    await waitFor(() => {
      expect(input).toHaveValue('Scout Regiment | 4 cm | Steel | ');
    });
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Steel');
    expect(screen.getAllByText('Synced from English Title')).toHaveLength(1);
  });

  it('syncs multiple linked title-term parameters at the same time', async () => {
    useParametersMock.mockReturnValue({
      data: [
        {
          id: 'param-size',
          name_en: 'Size',
          name_pl: 'Rozmiar',
          name_de: null,
          catalogId: 'catalog-1',
          selectorType: 'text',
          optionLabels: [],
          linkedTitleTermType: 'size',
        },
        linkedMaterialParameter,
        {
          id: 'param-theme',
          name_en: 'Theme',
          name_pl: 'Motyw',
          name_de: null,
          catalogId: 'catalog-1',
          selectorType: 'text',
          optionLabels: [],
          linkedTitleTermType: 'theme',
        },
      ] as ProductParameter[],
      isLoading: false,
    });

    render(
      <ProductFormCoreProvider
        requireSku={false}
        draft={
          {
            id: 'draft-2',
            name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
          } as never
        }
      >
        <ProductFormMetadataContext.Provider value={metadataValue}>
          <ProductFormParameterProvider selectedCatalogIds={['catalog-1']}>
            <ProductFormParameters />
          </ProductFormParameterProvider>
        </ProductFormMetadataContext.Provider>
      </ProductFormCoreProvider>
    );

    expect(await screen.findAllByText('Synced from English Title')).toHaveLength(3);
    expect(screen.getAllByPlaceholderText('Value (English)').map((field) => (field as HTMLInputElement).value)).toEqual(
      expect.arrayContaining(['4 cm', 'Metal', 'Attack On Titan'])
    );
  });
});
