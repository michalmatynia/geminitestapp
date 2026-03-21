import { fireEvent, render, screen } from '@/__tests__/test-utils';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductFormParameters from '@/features/products/components/form/ProductFormParameters';
import {
  useProductFormParameters,
  type ProductFormParameterContextType,
} from '@/features/products/context/ProductFormParameterContext';
import {
  useProductFormMetadata,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';

vi.mock('@/features/products/context/ProductFormParameterContext', () => ({
  useProductFormParameters: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  FormSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Label: ({ children, htmlFor, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
  RadioGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadioGroupItem: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input type='radio' {...props} />
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
  }: {
    value?: string;
    onValueChange?: (nextValue: string) => void;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <select
      value={value ?? ''}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
        onValueChange?.(event.target.value)
      }
      disabled={disabled}
      aria-label={placeholder || 'select'}
    >
      <option value=''>{placeholder || 'Select'}</option>
      {(options ?? []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (nextValue: string) => void;
  }) => (
    <div>
      {React.Children.map(children, (child: React.ReactNode) => {
        if (!React.isValidElement(child)) return child;
        const childType = child.type as { displayName?: string };
        if (childType.displayName === 'TabsList') {
          return React.cloneElement(child as React.ReactElement, {
            ...(value !== undefined ? { activeValue: value } : {}),
            ...(onValueChange !== undefined ? { onValueChange } : {}),
          });
        }
        return child;
      })}
    </div>
  ),
  TabsList: Object.assign(
    ({
      children,
      activeValue,
      onValueChange,
    }: {
      children: React.ReactNode;
      activeValue?: string;
      onValueChange?: (nextValue: string) => void;
    }) => (
      <div>
        {React.Children.map(children, (child: React.ReactNode) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement, {
              ...(activeValue !== undefined ? { activeValue } : {}),
              ...(onValueChange !== undefined ? { onValueChange } : {}),
            })
            : child
        )}
      </div>
    ),
    { displayName: 'TabsList' }
  ),
  TabsTrigger: ({
    children,
    value,
    activeValue,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    activeValue?: string;
    onValueChange?: (nextValue: string) => void;
  }) => (
    <button
      type='button'
      role='tab'
      aria-selected={value === activeValue}
      onClick={() => value && onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}));

describe('ProductFormParameters multilingual values', () => {
  const updateParameterValue = vi.fn();
  const updateParameterValueByLanguage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProductFormParameters).mockReturnValue({
      parameters: [
        {
          id: 'param-1',
          name_en: 'Material',
          name_pl: 'Materiał',
          name_de: null,
          selectorType: 'text',
          optionLabels: [],
        },
      ],
      parametersLoading: false,
      parameterValues: [
        {
          parameterId: 'param-1',
          value: 'Cotton',
          valuesByLanguage: {
            en: 'Cotton',
            pl: 'Bawełna',
          },
        },
      ],
      addParameterValue: vi.fn(),
      updateParameterId: vi.fn(),
      updateParameterValue,
      updateParameterValueByLanguage,
      removeParameterValue: vi.fn(),
    } as unknown as ProductFormParameterContextType);

    vi.mocked(useProductFormMetadata).mockReturnValue({
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
      filteredLanguages: [
        {
          id: 'lang-en',
          code: 'EN',
          name: 'English',
          nativeName: 'English',
          isDefault: true,
          enabled: true,
        },
        {
          id: 'lang-pl',
          code: 'PL',
          name: 'Polish',
          nativeName: 'Polski',
          isDefault: false,
          enabled: true,
        },
      ],
      filteredPriceGroups: [],
    } as unknown as ProductFormMetadataContextType);
  });

  it('switches parameter input by language tab and syncs primary language to base value', () => {
    render(<ProductFormParameters />);

    const englishInput = screen.getByPlaceholderText('Value (English)');
    expect(englishInput).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Value (Polish)')).not.toBeInTheDocument();

    fireEvent.change(englishInput, { target: { value: 'Steel' } });
    expect(updateParameterValueByLanguage).toHaveBeenCalledWith(0, 'en', 'Steel');

    fireEvent.click(screen.getByRole('tab', { name: 'Polish' }));
    const polishInput = screen.getByPlaceholderText('Value (Polish)');
    expect(polishInput).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Value (English)')).not.toBeInTheDocument();

    fireEvent.change(polishInput, { target: { value: 'Stal' } });
    expect(updateParameterValueByLanguage).toHaveBeenCalledWith(0, 'pl', 'Stal');
  });
});
