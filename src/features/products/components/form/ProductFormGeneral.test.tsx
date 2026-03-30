// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData, ProductValidationPattern } from '@/shared/contracts/products';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

const { useProductFormMetadataMock, useProductValidationStateMock, setValueSpy } = vi.hoisted(
  () => ({
    useProductFormMetadataMock: vi.fn(),
    useProductValidationStateMock: vi.fn(),
    setValueSpy: vi.fn(),
  })
);

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/context/ProductValidationSettingsContext', () => ({
  useProductValidationState: () => useProductValidationStateMock(),
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
    <select aria-label={ariaLabel} value={value} onChange={(event) => onValueChange(event.target.value)}>
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

vi.mock('./ValidatedField', () => ({
  ValidatedField: ({ label, name }: { label: string; name: string }) => (
    <div data-testid={`validated-field-${name}`}>{label}</div>
  ),
}));

import ProductFormGeneral from './ProductFormGeneral';

const createPattern = (
  overrides: Partial<ProductValidationPattern> & { regex: string; target: ProductValidationPattern['target'] }
): ProductValidationPattern =>
  ({
    id: 'pattern-1',
    label: 'Pattern',
    target: overrides.target,
    locale: null,
    regex: overrides.regex,
    flags: null,
    message: 'Pattern mismatch',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: true,
    skipNoopReplacementProposal: false,
    replacementValue: 'SKU-101',
    replacementFields: ['sku'],
    replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    runtimeEnabled: false,
    runtimeType: 'none',
    runtimeConfig: null,
    postAcceptBehavior: 'revalidate',
    denyBehaviorOverride: null,
    validationDebounceMs: 0,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence: null,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: false,
    launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'current_field',
    launchSourceField: null,
    launchOperator: 'equals',
    launchValue: null,
    launchFlags: null,
    appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductValidationPattern;

function ValueProbe(): React.JSX.Element {
  const { watch } = useFormContext<ProductFormData>();
  const skuValue = watch('sku') ?? '';
  const sizeLengthValue = watch('sizeLength') ?? '';
  return (
    <>
      <output data-testid='sku-value'>{String(skuValue)}</output>
      <output data-testid='size-length-value'>{String(sizeLengthValue)}</output>
    </>
  );
}

function renderProductFormGeneral({
  defaultSku = 'AUTO',
  defaultSizeLength = 0,
}: {
  defaultSku?: string;
  defaultSizeLength?: number;
} = {}) {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: '',
        name_pl: '',
        name_de: '',
        description_en: '',
        description_pl: '',
        description_de: '',
        sku: defaultSku,
        ean: '',
        gtin: '',
        asin: '',
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

describe('ProductFormGeneral formatter auto-apply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [],
    });
    useProductValidationStateMock.mockReturnValue({
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      validatorPatterns: [],
      latestProductValues: null,
    });
  });

  it('auto-runs non-runtime SKU replacements configured for formatter auto-apply', async () => {
    useProductValidationStateMock.mockReturnValue({
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      validatorPatterns: [
        createPattern({
          regex: '^AUTO$',
          target: 'sku',
          replacementAutoApply: true,
          replacementValue: 'SKU-101',
          replacementFields: ['sku'],
        }),
      ],
      latestProductValues: null,
    });

    renderProductFormGeneral();

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('SKU-101');
    });
    expect(setValueSpy).toHaveBeenCalledWith(
      'sku',
      'SKU-101',
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
  });

  it('auto-runs decimal formatter replacements for the Length (cm) field', async () => {
    useProductValidationStateMock.mockReturnValue({
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      validatorPatterns: [
        createPattern({
          regex: '^10$',
          target: 'size_length',
          replacementAutoApply: true,
          replacementValue: '12.5',
          replacementFields: ['sizeLength'],
        }),
      ],
      latestProductValues: null,
    });

    renderProductFormGeneral({ defaultSizeLength: 10 });

    await waitFor(() => {
      expect(screen.getByTestId('size-length-value')).toHaveTextContent('12.5');
    });
    expect(setValueSpy).toHaveBeenCalledWith(
      'sizeLength',
      12.5,
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
  });

  it('keeps proposal-only SKU replacers out of automatic formatter execution', async () => {
    useProductValidationStateMock.mockReturnValue({
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      validatorPatterns: [
        createPattern({
          regex: '^AUTO$',
          target: 'sku',
          replacementAutoApply: false,
          replacementValue: 'SKU-101',
          replacementFields: ['sku'],
        }),
      ],
      latestProductValues: null,
    });

    renderProductFormGeneral();

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('AUTO');
    });
    expect(setValueSpy).not.toHaveBeenCalledWith(
      'sku',
      'SKU-101',
      expect.anything()
    );
  });

  it('applies SKU formatter replacements when formatter is turned on during an open session', async () => {
    const validationState = {
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: false,
      validatorPatterns: [
        createPattern({
          regex: '^AUTO$',
          target: 'sku',
          replacementAutoApply: true,
          replacementValue: 'SKU-101',
          replacementFields: ['sku'],
        }),
      ],
      latestProductValues: null,
    };
    useProductValidationStateMock.mockImplementation(() => validationState);

    const view = renderProductFormGeneral();

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('AUTO');
    });
    expect(setValueSpy).not.toHaveBeenCalledWith(
      'sku',
      'SKU-101',
      expect.anything()
    );

    validationState.formatterEnabled = true;

    await act(async () => {
      view.rerenderForm();
    });

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('SKU-101');
    });
    expect(setValueSpy).toHaveBeenCalledWith(
      'sku',
      'SKU-101',
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
  });

  it('retries latest-product SKU formatter patterns when latest source values arrive after formatter starts', async () => {
    const validationState = {
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      validatorPatterns: [
        createPattern({
          regex: '^KEYCHA000$',
          target: 'sku',
          replacementAutoApply: true,
          replacementValue: encodeDynamicReplacementRecipe({
            version: 1,
            sourceMode: 'latest_product_field',
            sourceField: 'sku',
            sourceRegex: '(\\d+)$',
            sourceFlags: null,
            sourceMatchGroup: 1,
            mathOperation: 'add',
            mathOperand: 1,
            roundMode: 'none',
            padLength: 3,
            padChar: '0',
            logicOperator: 'none',
            logicOperand: '',
            logicFlags: '',
            logicWhenTrueAction: 'keep',
            logicWhenTrueValue: '',
            logicWhenFalseAction: 'keep',
            logicWhenFalseValue: '',
            resultAssembly: 'source_replace_match',
            targetApply: 'replace_whole_field',
          }),
          replacementFields: ['sku'],
          launchEnabled: true,
          launchSourceMode: 'current_field',
          launchOperator: 'equals',
          launchValue: 'KEYCHA000',
          sequenceGroupId: 'sku-sequence',
          sequenceGroupLabel: 'SKU Auto Increment',
          sequenceGroupDebounceMs: 300,
          chainMode: 'stop_on_replace',
        }),
      ],
      latestProductValues: null,
    };
    useProductValidationStateMock.mockImplementation(() => validationState);

    const view = renderProductFormGeneral({ defaultSku: 'KEYCHA000' });

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('KEYCHA000');
    });
    expect(setValueSpy).not.toHaveBeenCalledWith(
      'sku',
      'KEYCHA1272',
      expect.anything()
    );

    validationState.latestProductValues = { sku: 'KEYCHA1271' };

    await act(async () => {
      view.rerenderForm();
    });

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('KEYCHA1272');
    });
    expect(setValueSpy).toHaveBeenCalledWith(
      'sku',
      'KEYCHA1272',
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
  });
});
