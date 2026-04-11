// @vitest-environment jsdom

import React, { useMemo, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  ProductValidationSettingsProvider,
  type ProductValidationSettingsValue,
} from '@/features/products/context/ProductValidationSettingsContext';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationAcceptIssueInput, ProductValidationDenyBehavior, ProductValidationDenyIssueInput, ProductValidationPattern } from '@/shared/contracts/products/validation';

const { useProductFormMetadataMock, setValueSpy } = vi.hoisted(() => ({
  useProductFormMetadataMock: vi.fn(),
  setValueSpy: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
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
  ValidatorFormatterToggle: ({
    validatorEnabled,
    formatterEnabled,
    onValidatorChange,
    onFormatterChange,
  }: {
    validatorEnabled: boolean;
    formatterEnabled: boolean;
    onValidatorChange: (next: boolean) => void;
    onFormatterChange: (next: boolean) => void;
  }) => (
    <div>
      <button type='button' onClick={() => onValidatorChange(!validatorEnabled)}>
        {validatorEnabled ? 'Validator ON' : 'Validator OFF'}
      </button>
      {validatorEnabled ? (
        <button type='button' onClick={() => onFormatterChange(!formatterEnabled)}>
          {formatterEnabled ? 'Formatter ON' : 'Formatter OFF'}
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('./ValidatedField', () => ({
  ValidatedField: ({ label, name }: { label: string; name: string }) => (
    <div data-testid={`validated-field-${name}`}>{label}</div>
  ),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: () => ({
    data: [],
    isLoading: false,
  }),
}));

import ProductFormGeneral from './ProductFormGeneral';
import { ProductFormValidationTab } from './ProductFormValidationTab';

const createPattern = (
  overrides: Partial<ProductValidationPattern> & {
    regex: string;
    target: ProductValidationPattern['target'];
  }
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
  return (
    <>
      <output data-testid='sku-value'>{String(watch('sku') ?? '')}</output>
      <output data-testid='size-length-value'>{String(watch('sizeLength') ?? '')}</output>
    </>
  );
}

function ValidationHarness({
  patterns,
  defaultSku = 'AUTO',
  defaultSizeLength = 0,
}: {
  patterns: ProductValidationPattern[];
  defaultSku?: string;
  defaultSizeLength?: number;
}): React.JSX.Element {
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

  const [validatorEnabled, setValidatorEnabled] = useState(true);
  const [formatterEnabled, setFormatterEnabled] = useState(false);
  const [validationDenyBehavior, setValidationDenyBehavior] =
    useState<ProductValidationDenyBehavior>('mute_session');

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: Infinity,
          },
        },
      }),
    []
  );

  const providerValue = useMemo<ProductValidationSettingsValue>(
    () => ({
      validationInstanceScope: 'product_create',
      validatorEnabled,
      formatterEnabled,
      setValidatorEnabled,
      setFormatterEnabled,
      validationDenyBehavior,
      setValidationDenyBehavior,
      denyActionLabel: 'Mute',
      getDenyActionLabel: () => 'Mute',
      isIssueDenied: () => false,
      denyIssue: async (_input: ProductValidationDenyIssueInput) => {},
      isIssueAccepted: () => false,
      acceptIssue: async (_input: ProductValidationAcceptIssueInput) => {},
      validatorPatterns: patterns,
      latestProductValues: null,
      visibleFieldIssues: {},
    }),
    [formatterEnabled, patterns, validationDenyBehavior, validatorEnabled]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <ProductValidationSettingsProvider value={providerValue}>
          <ProductFormGeneral />
          <ProductFormValidationTab />
          <ValueProbe />
        </ProductValidationSettingsProvider>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe('Product form validation formatter flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [],
    });
  });

  it('runs the mounted general-form SKU formatter when the validation-tab formatter toggle is enabled', async () => {
    render(
      <ValidationHarness
        patterns={[
          createPattern({
            regex: '^AUTO$',
            target: 'sku',
            replacementAutoApply: true,
            replacementValue: 'SKU-101',
            replacementFields: ['sku'],
          }),
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('sku-value')).toHaveTextContent('AUTO');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Formatter OFF' }));
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

  it('runs decimal Length (cm) formatter replacements when the validation-tab formatter toggle is enabled', async () => {
    render(
      <ValidationHarness
        defaultSizeLength={10}
        patterns={[
          createPattern({
            regex: '^10$',
            target: 'size_length',
            replacementAutoApply: true,
            replacementValue: '12.5',
            replacementFields: ['sizeLength'],
          }),
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('size-length-value')).toHaveTextContent('10');
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Formatter OFF' }));
    });

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
});
