// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

const {
  useProductFormMetadataMock,
  useTitleTermsMock,
  setValueSpy,
} = vi.hoisted(() => ({
    useProductFormMetadataMock: vi.fn(),
    useTitleTermsMock: vi.fn(),
    setValueSpy: vi.fn(),
  }));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

vi.mock('@/features/products/ui', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type='button'>{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  FormSection: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => <section aria-label={title}>{children}</section>,
  FormField: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Skeleton: () => <div data-testid='skeleton' />,
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('./ValidatedField', () => ({
  ValidatedField: ({
    label,
    name,
    type,
  }: {
    label: string;
    name: string;
    type?: string;
  }) => {
    const { register } = useFormContext<ProductFormData>();
    if (type === 'textarea') {
      return (
        <label>
          <span>{label}</span>
          <textarea aria-label={label} data-testid={`validated-field-${name}`} {...register(name)} />
        </label>
      );
    }
    return (
      <label>
        <span>{label}</span>
        <input aria-label={label} data-testid={`validated-field-${name}`} {...register(name)} />
      </label>
    );
  },
}));

vi.mock('./StructuredProductNameField', () => ({
  StructuredProductNameField: () => {
    const { register } = useFormContext<ProductFormData>();
    return (
      <label>
        <span>English Name</span>
        <input aria-label='English Name' data-testid='structured-name-field' {...register('name_en')} />
      </label>
    );
  },
}));

vi.mock('./ProductFormLatestAmazonExtraction', () => ({
  default: () => null,
}));

import ProductFormGeneral from './ProductFormGeneral';

function ValueProbe(): React.JSX.Element {
  const { watch } = useFormContext<ProductFormData>();
  const skuValue = watch('sku') ?? '';
  const sizeLengthValue = watch('sizeLength') ?? '';
  const eanValue = watch('ean') ?? '';
  const gtinValue = watch('gtin') ?? '';
  const asinValue = watch('asin') ?? '';
  return (
    <>
      <output data-testid='sku-value'>{String(skuValue)}</output>
      <output data-testid='size-length-value'>{String(sizeLengthValue)}</output>
      <output data-testid='ean-value'>{String(eanValue)}</output>
      <output data-testid='gtin-value'>{String(gtinValue)}</output>
      <output data-testid='asin-value'>{String(asinValue)}</output>
    </>
  );
}

function renderProductFormGeneral({
  defaultSku = 'AUTO',
  defaultSizeLength = 0,
  defaultNameEn = '',
  defaultEan = '',
  defaultGtin = '',
  defaultAsin = '',
}: {
  defaultSku?: string;
  defaultSizeLength?: number;
  defaultNameEn?: string;
  defaultEan?: string;
  defaultGtin?: string;
  defaultAsin?: string;
} = {}) {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: defaultNameEn,
        name_pl: '',
        name_de: '',
        description_en: '',
        description_pl: '',
        description_de: '',
        sku: defaultSku,
        ean: defaultEan,
        gtin: defaultGtin,
        asin: defaultAsin,
        price: 0,
        stock: 0,
        weight: 0,
        sizeLength: defaultSizeLength,
        sizeWidth: 0,
        length: 0,
        supplierName: '',
        supplierLink: '',
        priceComment: '',
        categoryId: '',
      },
    });
    const originalSetValueRef = React.useRef(methods.setValue);
    methods.setValue = ((fieldName, value, options) => {
      setValueSpy(fieldName, value, options);
      return originalSetValueRef.current(fieldName, value, options);
    }) as typeof methods.setValue;

    return <FormProvider {...methods}>{children}</FormProvider>;
  }

  const createUi = (): React.JSX.Element => (
    <Wrapper>
      <ProductFormGeneral />
      <ValueProbe />
    </Wrapper>
  );

  const view = render(createUi());
  return {
    ...view,
    rerenderForm: (): void => {
      view.rerender(createUi());
    },
  };
}

describe('ProductFormGeneral', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [],
      selectedCatalogIds: [],
      catalogsLoading: false,
      languagesLoading: false,
      hasExistingProduct: false,
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('preserves EAN when switching the identifier input to ASIN', async () => {
    renderProductFormGeneral({ defaultEan: '5901234567890' });

    expect(screen.getByLabelText('Enter EAN')).toHaveValue('5901234567890');

    fireEvent.change(screen.getByLabelText('Product identifier type'), {
      target: { value: 'asin' },
    });

    expect(screen.getByTestId('ean-value')).toHaveTextContent('5901234567890');
    expect(screen.getByLabelText('Enter ASIN')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Enter ASIN'), {
      target: { value: 'B000123456' },
    });

    expect(screen.getByTestId('ean-value')).toHaveTextContent('5901234567890');
    expect(screen.getByTestId('asin-value')).toHaveTextContent('B000123456');

    fireEvent.change(screen.getByLabelText('Product identifier type'), {
      target: { value: 'ean' },
    });

    expect(screen.getByLabelText('Enter EAN')).toHaveValue('5901234567890');
  });
});
