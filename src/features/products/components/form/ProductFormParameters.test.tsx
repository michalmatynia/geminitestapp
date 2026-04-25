import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Language } from '@/shared/contracts/internationalization';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import {
  ProductFormMetadataContext,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';
import { ProductFormParameterProvider } from '@/features/products/context/ProductFormParameterContext';
import {
  PARAMETER_VALUE_INFERENCE_PATH_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
  PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
} from '@/shared/lib/ai-paths/parameter-value-inference';

const {
  fireAiPathTriggerEventMock,
  getAiPathRunMock,
  subscribeToTrackedAiPathRunMock,
  useParametersMock,
  useSimpleParametersMock,
  useTitleTermsMock,
} = vi.hoisted(() => ({
  fireAiPathTriggerEventMock: vi.fn(),
  getAiPathRunMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
  useParametersMock: vi.fn(),
  useSimpleParametersMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useParameters: useParametersMock,
  useSimpleParameters: useSimpleParametersMock,
  useTitleTerms: useTitleTermsMock,
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => getAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) =>
    subscribeToTrackedAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent', () => ({
  useAiPathTriggerEvent: () => ({
    fireAiPathTriggerEvent: fireAiPathTriggerEventMock,
  }),
}));

vi.mock('lucide-react', () => ({
  Ban: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid='skip-sequence' />,
  RotateCcw: (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} data-testid='include-sequence' />
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} data-testid='remove-parameter' />,
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
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
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
  }: {
    value: string;
    onChange?: (value: string) => void;
    onValueChange?: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={placeholder ?? 'select'}
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

const materialParameter = {
  id: 'material',
  name_en: 'Material',
  name_pl: 'Materiał',
  selectorType: 'text',
} as Partial<ProductParameter> as ProductParameter;

type ParameterTriggerCallArgs = {
  onSuccess?: (runId: string) => void;
  getEntityJson?: () => Record<string, unknown>;
  extras?: {
    parameterValueInferenceInput?: {
      targetParameter?: {
        id?: string;
      };
    };
  };
};

const createProduct = ({
  parameters,
  nameEn = 'Product 1',
  descriptionEn = '',
  imageLinks = [],
}: {
  parameters: NonNullable<ProductWithImages['parameters']>;
  nameEn?: string;
  descriptionEn?: string;
  imageLinks?: string[];
}
): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: nameEn, pl: null, de: null },
    description: { en: descriptionEn, pl: null, de: null },
    name_en: nameEn,
    name_pl: null,
    name_de: null,
    description_en: descriptionEn,
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
    imageLinks,
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as ProductWithImages;

function renderParameters({
  parameters,
  parameterDefinitions = [textParameter],
  simpleParameterDefinitions = [],
  nameEn = 'Product 1',
  descriptionEn = '',
  imageLinks = [],
}: {
  parameters: NonNullable<ProductWithImages['parameters']>;
  parameterDefinitions?: ProductParameter[];
  simpleParameterDefinitions?: ProductSimpleParameter[];
  nameEn?: string;
  descriptionEn?: string;
  imageLinks?: string[];
}) {
  useParametersMock.mockReturnValue({
    data: parameterDefinitions,
    isLoading: false,
  });
  useSimpleParametersMock.mockReturnValue({
    data: simpleParameterDefinitions,
    isLoading: false,
  });

  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: nameEn,
        description_en: descriptionEn,
      } as ProductFormData,
    });

    return <FormProvider {...methods}>{children}</FormProvider>;
  }

  const imageContextValue = {
    imageSlots: [],
    imageLinks,
    imageBase64s: [],
    productId: 'product-1',
    uploading: false,
    uploadError: null,
    uploadSuccess: false,
    showFileManager: false,
    setShowFileManager: vi.fn(),
    handleSlotImageChange: vi.fn(),
    handleSlotFileSelect: vi.fn(),
    handleSlotDisconnectImage: vi.fn(),
    handleMultiImageChange: vi.fn(),
    handleMultiFileSelect: vi.fn(),
    swapImageSlots: vi.fn(),
    setImageLinkAt: vi.fn(),
    setImageBase64At: vi.fn(),
    setImagesReordering: vi.fn(),
    refreshImagesFromProduct: vi.fn(),
  };

  return render(
    <Wrapper>
      <ProductFormMetadataContext.Provider value={metadataValue}>
        <ProductFormImageContext.Provider value={imageContextValue}>
          <ProductFormParameterProvider
            product={createProduct({ parameters, nameEn, descriptionEn, imageLinks })}
            selectedCatalogIds={['catalog-1']}
          >
            <ProductFormParameters />
          </ProductFormParameterProvider>
        </ProductFormImageContext.Provider>
      </ProductFormMetadataContext.Provider>
    </Wrapper>
  );
}

describe('ProductFormParameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fireAiPathTriggerEventMock.mockResolvedValue(undefined);
    subscribeToTrackedAiPathRunMock.mockReturnValue(vi.fn());
    getAiPathRunMock.mockResolvedValue({ ok: true, data: {} });
    useSimpleParametersMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useTitleTermsMock.mockImplementation(() => ({
      data: [],
      isLoading: false,
    }));
  });

  it('preserves spaces while typing text parameter values', async () => {
    const user = userEvent.setup();
    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: '',
        },
      ],
    });

    const englishInput = screen.getByPlaceholderText('Value (English)');

    await user.type(englishInput, 'Soft plush');

    expect(englishInput).toHaveValue('Soft plush');
  });

  it('fires the row-level parameter trigger with product copy, images, and selected parameter metadata', async () => {
    const user = userEvent.setup();
    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: { en: 'Used' },
        },
      ],
      nameEn: 'Soft plush keychain',
      descriptionEn: 'Small plush keychain with metal ring.',
      imageLinks: ['https://example.test/keychain.jpg'],
    });

    await user.click(
      screen.getByRole('button', { name: 'Trigger parameter inference for Condition' })
    );

    expect(fireAiPathTriggerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerEventId: PARAMETER_VALUE_INFERENCE_TRIGGER_BUTTON_ID,
        preferredPathId: PARAMETER_VALUE_INFERENCE_PATH_ID,
        entityType: 'product',
        source: {
          tab: 'product',
          location: PARAMETER_VALUE_INFERENCE_TRIGGER_LOCATION,
        },
      })
    );

    const triggerArgs = fireAiPathTriggerEventMock.mock.calls[0]?.[0] as {
      extras: Record<string, unknown>;
      getEntityJson: () => Record<string, unknown>;
    };
    expect(triggerArgs.extras['parameterValueInferenceInput']).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({
          title: 'Soft plush keychain',
          description: 'Small plush keychain with metal ring.',
          imageLinks: ['https://example.test/keychain.jpg'],
        }),
        targetParameter: expect.objectContaining({
          id: 'condition',
          name: 'Condition',
          selectorType: 'text',
          currentValue: 'Used',
        }),
      })
    );
    expect(triggerArgs.getEntityJson()['parameterValueInferenceInput']).toEqual(
      triggerArgs.extras['parameterValueInferenceInput']
    );
  });

  it('applies a completed row-level parameter inference result to the active language value', async () => {
    const user = userEvent.setup();
    fireAiPathTriggerEventMock.mockImplementation(
      async (args: { onSuccess?: (runId: string) => void }) => {
        args.onSuccess?.('run-parameter-value-1');
      }
    );
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (_runId: string, listener: (snapshot: Record<string, unknown>) => void) => {
        listener({
          trackingState: 'stopped',
          status: 'completed',
          errorMessage: null,
        });
        return vi.fn();
      }
    );
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        run: {
          runtimeState: {
            nodeOutputs: {
              'node-trigger': {
                trigger: 'Parameter Value Inference',
                entityJson: {
                  parameters: [
                    {
                      parameterId: 'material',
                      value: 'Metal',
                    },
                  ],
                },
              },
              'node-regex': {
                value: {
                  parameterId: 'condition',
                  value: 'Soft plush',
                  confidence: 0.91,
                },
              },
              'node-viewer': {
                context: {
                  product: {
                    parameters: [
                      {
                        parameterId: 'material',
                        value: 'Metal',
                      },
                    ],
                  },
                },
                bundle: {
                  parameters: [
                    {
                      parameterId: 'material',
                      value: 'Metal',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: '',
        },
      ],
      nameEn: 'Soft plush keychain',
      descriptionEn: 'Small plush keychain with metal ring.',
    });

    await user.click(
      screen.getByRole('button', { name: 'Trigger parameter inference for Condition' })
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Soft plush');
    });
  });

  it('runs parameter inference for eligible parameters one by one in sequence', async () => {
    const user = userEvent.setup();
    const trackedCallbacks = new Map<string, (snapshot: Record<string, unknown>) => void>();
    let runIndex = 0;

    fireAiPathTriggerEventMock.mockImplementation(async (args: ParameterTriggerCallArgs) => {
      runIndex += 1;
      args.onSuccess?.(`run-parameter-sequence-${runIndex}`);
    });
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (runId: string, listener: (snapshot: Record<string, unknown>) => void) => {
        trackedCallbacks.set(runId, listener);
        return vi.fn();
      }
    );
    getAiPathRunMock.mockImplementation(async (runId: string) => {
      const parameterId =
        runId === 'run-parameter-sequence-1' ? 'condition' : 'material';
      const value = parameterId === 'condition' ? 'Soft plush' : 'Metal';
      return {
        ok: true,
        data: {
          nodes: [
            {
              type: 'regex',
              outputs: {
                value: {
                  parameterId,
                  value,
                  confidence: 0.91,
                },
              },
            },
          ],
        },
      };
    });

    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: '',
        },
        {
          parameterId: 'material',
          value: '',
        },
      ],
      parameterDefinitions: [textParameter, materialParameter],
      nameEn: 'Soft plush keychain',
      descriptionEn: 'Small plush keychain with metal ring.',
    });

    await user.click(screen.getByRole('button', { name: 'Run parameter sequence' }));

    await waitFor(() => {
      expect(fireAiPathTriggerEventMock).toHaveBeenCalledTimes(1);
    });
    expect(
      (fireAiPathTriggerEventMock.mock.calls[0]?.[0] as ParameterTriggerCallArgs).extras
        ?.parameterValueInferenceInput?.targetParameter?.id
    ).toBe('condition');

    trackedCallbacks.get('run-parameter-sequence-1')?.({
      trackingState: 'stopped',
      status: 'completed',
      errorMessage: null,
    });

    await waitFor(() => {
      expect(fireAiPathTriggerEventMock).toHaveBeenCalledTimes(2);
    });
    expect(
      (fireAiPathTriggerEventMock.mock.calls[1]?.[0] as ParameterTriggerCallArgs).extras
        ?.parameterValueInferenceInput?.targetParameter?.id
    ).toBe('material');
    expect(
      (fireAiPathTriggerEventMock.mock.calls[1]?.[0] as ParameterTriggerCallArgs)
        .getEntityJson?.()['parameters']
    ).toEqual(
      expect.arrayContaining([
        {
          parameterId: 'condition',
          value: 'Soft plush',
          valuesByLanguage: {
            en: 'Soft plush',
          },
        },
      ])
    );

    trackedCallbacks.get('run-parameter-sequence-2')?.({
      trackingState: 'stopped',
      status: 'completed',
      errorMessage: null,
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Soft plush')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Metal')).toBeInTheDocument();
      expect(
        screen.getByText('Parameter sequence completed for 2 parameters.')
      ).toBeInTheDocument();
    });
  });

  it('skips parameters excluded from the parameter sequence', async () => {
    const user = userEvent.setup();
    const trackedCallbacks = new Map<string, (snapshot: Record<string, unknown>) => void>();

    fireAiPathTriggerEventMock.mockImplementation(async (args: ParameterTriggerCallArgs) => {
      args.onSuccess?.('run-parameter-sequence-material-only');
    });
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (runId: string, listener: (snapshot: Record<string, unknown>) => void) => {
        trackedCallbacks.set(runId, listener);
        return vi.fn();
      }
    );
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        nodes: [
          {
            type: 'regex',
            outputs: {
              value: {
                parameterId: 'material',
                value: 'Metal',
                confidence: 0.91,
              },
            },
          },
        ],
      },
    });

    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: 'Soft plush',
          valuesByLanguage: { en: 'Soft plush' },
        },
        {
          parameterId: 'material',
          value: '',
        },
      ],
      parameterDefinitions: [textParameter, materialParameter],
    });

    await user.click(
      screen.getByRole('button', { name: 'Skip Condition in parameter sequence' })
    );

    expect(
      screen.getByRole('button', { name: 'Include Condition in parameter sequence' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Trigger parameter inference for Condition' })
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Run parameter sequence' }));

    await waitFor(() => {
      expect(fireAiPathTriggerEventMock).toHaveBeenCalledTimes(1);
    });
    expect(
      (fireAiPathTriggerEventMock.mock.calls[0]?.[0] as ParameterTriggerCallArgs).extras
        ?.parameterValueInferenceInput?.targetParameter?.id
    ).toBe('material');

    trackedCallbacks.get('run-parameter-sequence-material-only')?.({
      trackingState: 'stopped',
      status: 'completed',
      errorMessage: null,
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Soft plush')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Metal')).toBeInTheDocument();
      expect(
        screen.getByText('Parameter sequence completed for 1 parameter.')
      ).toBeInTheDocument();
    });
  });

  it('skips blank rows and synced linked parameters when running the parameter sequence', async () => {
    const user = userEvent.setup();
    const linkedMaterialParameter = {
      id: 'material',
      name_en: 'Material',
      name_pl: 'Materiał',
      selectorType: 'text',
      linkedTitleTermType: 'material',
    } as Partial<ProductParameter> as ProductParameter;

    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'material'
          ? [
              {
                id: 'term-metal',
                catalogId: 'catalog-1',
                type: 'material',
                name_en: 'Metal',
                name_pl: 'Metal PL',
              },
            ]
          : [],
      isLoading: false,
    }));

    renderParameters({
      parameters: [
        {
          parameterId: '',
          value: '',
        },
        {
          parameterId: 'condition',
          value: '',
        },
      ],
      parameterDefinitions: [textParameter, linkedMaterialParameter],
      nameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });

    await user.click(screen.getByRole('button', { name: 'Run parameter sequence' }));

    await waitFor(() => {
      expect(fireAiPathTriggerEventMock).toHaveBeenCalledTimes(1);
    });
    expect(
      (fireAiPathTriggerEventMock.mock.calls[0]?.[0] as ParameterTriggerCallArgs).extras
        ?.parameterValueInferenceInput?.targetParameter?.id
    ).toBe('condition');
  });

  it('stops the parameter sequence when a parameter inference run fails', async () => {
    const user = userEvent.setup();
    const trackedCallbacks = new Map<string, (snapshot: Record<string, unknown>) => void>();

    fireAiPathTriggerEventMock.mockImplementation(async (args: ParameterTriggerCallArgs) => {
      args.onSuccess?.('run-parameter-sequence-failed');
    });
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (runId: string, listener: (snapshot: Record<string, unknown>) => void) => {
        trackedCallbacks.set(runId, listener);
        return vi.fn();
      }
    );

    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: '',
        },
        {
          parameterId: 'material',
          value: '',
        },
      ],
      parameterDefinitions: [textParameter, materialParameter],
    });

    await user.click(screen.getByRole('button', { name: 'Run parameter sequence' }));

    await waitFor(() => {
      expect(fireAiPathTriggerEventMock).toHaveBeenCalledTimes(1);
    });

    trackedCallbacks.get('run-parameter-sequence-failed')?.({
      trackingState: 'stopped',
      status: 'failed',
      errorMessage: 'Model failed',
    });

    await waitFor(() => {
      expect(screen.getByText('Condition: Model failed')).toBeInTheDocument();
    });
    expect(fireAiPathTriggerEventMock).toHaveBeenCalledTimes(1);
  });

  it('keeps Polish separate when English is cleared in the UI', async () => {
    const user = userEvent.setup();
    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: { en: 'Used', pl: 'Uzywany' },
        },
      ],
    });

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
    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: 'Uzywany',
          valuesByLanguage: { pl: 'Uzywany' },
        },
      ],
    });

    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('');

    await user.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByPlaceholderText('Value (Polish)')).toHaveValue('Uzywany');
  });

  it('uses the active language tab for parameter names', async () => {
    const user = userEvent.setup();
    renderParameters({
      parameters: [
        {
          parameterId: 'model-name',
          value: 'Model X',
          valuesByLanguage: { pl: 'Model X' },
        },
      ],
      parameterDefinitions: [
        {
          id: 'model-name',
          name_en: 'Base Model Name',
          name_pl: 'Nazwa Modelu',
          selectorType: 'text',
        } as Partial<ProductParameter> as ProductParameter,
      ],
    });

    expect(screen.getByText('Base Model Name')).toBeInTheDocument();
    expect(screen.queryByText('Nazwa Modelu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByText('Nazwa Modelu')).toBeInTheDocument();
  });

  it('does not show legacy Polish-only parameter names on the English tab', async () => {
    const user = userEvent.setup();
    renderParameters({
      parameters: [
        {
          parameterId: 'base-model-name',
          value: 'Model X',
          valuesByLanguage: { pl: 'Model X' },
        },
      ],
      parameterDefinitions: [
        {
          id: 'base-model-name',
          name_en: 'Nazwa Modelu',
          name_pl: null,
          selectorType: 'text',
        } as Partial<ProductParameter> as ProductParameter,
      ],
    });

    expect(screen.getByText('Base Model Name')).toBeInTheDocument();
    expect(screen.queryByText('Nazwa Modelu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByText('Nazwa Modelu')).toBeInTheDocument();
  });

  it('renders saved legacy simple parameters when no synced parameter definitions exist', () => {
    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: 'Used',
        },
      ],
      parameterDefinitions: [],
      simpleParameterDefinitions: [
        {
          id: 'condition',
          catalogId: 'catalog-1',
          name_en: 'Condition',
        },
      ],
    });

    expect(screen.queryByText('No parameters')).not.toBeInTheDocument();
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Used');
  });

  it('offers legacy simple parameters when adding a new parameter value', async () => {
    const user = userEvent.setup();
    renderParameters({
      parameters: [],
      parameterDefinitions: [
        {
          id: 'synced-condition',
          name_en: 'Synced Condition',
          selectorType: 'text',
        } as Partial<ProductParameter> as ProductParameter,
      ],
      simpleParameterDefinitions: [
        {
          id: 'legacy-material',
          catalogId: 'catalog-1',
          name_en: 'Legacy Material',
          options: ['Metal', 'Plastic'],
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Add parameter' }));

    const parameterSelect = screen.getByLabelText('Select parameter');
    expect(parameterSelect).toHaveTextContent('Legacy Material');
    expect(parameterSelect).toHaveTextContent('Synced Condition');
  });

  it('renders saved legacy parameters when their metadata definition is gone', () => {
    renderParameters({
      parameters: [
        {
          parameterId: 'legacy_condition',
          value: 'Used',
        },
      ],
      parameterDefinitions: [],
      simpleParameterDefinitions: [],
    });

    expect(screen.queryByText('No parameters')).not.toBeInTheDocument();
    expect(screen.getByText('Legacy Condition')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Used');
  });

  it('renders linked parameters as synced read-only values from English Title terms', () => {
    const linkedMaterialParameter = {
      id: 'material',
      name_en: 'Material',
      name_pl: 'Materiał',
      selectorType: 'text',
      linkedTitleTermType: 'material',
    } as Partial<ProductParameter> as ProductParameter;

    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'material'
          ? [
              {
                id: 'term-metal',
                catalogId: 'catalog-1',
                type: 'material',
                name_en: 'Metal',
                name_pl: 'Metal PL',
              },
            ]
          : [],
      isLoading: false,
    }));

    renderParameters({
      parameters: [],
      parameterDefinitions: [linkedMaterialParameter],
      nameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });

    expect(screen.getByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getByText('Material term')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');
    expect(screen.getByPlaceholderText('Value (English)')).toBeDisabled();
    expect(screen.getByLabelText('Remove parameter')).toBeDisabled();
  });

  it('renders saved legacy simple parameters alongside synced title parameters', () => {
    const linkedMaterialParameter = {
      id: 'material',
      name_en: 'Material',
      name_pl: 'Materiał',
      selectorType: 'text',
      linkedTitleTermType: 'material',
    } as Partial<ProductParameter> as ProductParameter;

    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'material'
          ? [
              {
                id: 'term-metal',
                catalogId: 'catalog-1',
                type: 'material',
                name_en: 'Metal',
                name_pl: 'Metal PL',
              },
            ]
          : [],
      isLoading: false,
    }));

    renderParameters({
      parameters: [
        {
          parameterId: 'condition',
          value: 'Used',
        },
      ],
      parameterDefinitions: [linkedMaterialParameter],
      simpleParameterDefinitions: [
        {
          id: 'condition',
          catalogId: 'catalog-1',
          name_en: 'Condition',
        },
      ],
      nameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });

    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.getByText('Synced from English Title')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('Value (English)')[0]).toHaveValue('Used');
    expect(screen.getAllByPlaceholderText('Value (English)')[1]).toHaveValue('Metal');
  });

  it('shows the English synced value on the Polish tab when no Polish term translation exists', async () => {
    const user = userEvent.setup();
    const linkedMaterialParameter = {
      id: 'material',
      name_en: 'Material',
      name_pl: 'Materiał',
      selectorType: 'text',
      linkedTitleTermType: 'material',
    } as Partial<ProductParameter> as ProductParameter;

    useTitleTermsMock.mockImplementation((_catalogId: string, type: string) => ({
      data:
        type === 'material'
          ? [
              {
                id: 'term-metal',
                catalogId: 'catalog-1',
                type: 'material',
                name_en: 'Metal',
                name_pl: null,
              },
            ]
          : [],
      isLoading: false,
    }));

    renderParameters({
      parameters: [],
      parameterDefinitions: [linkedMaterialParameter],
      nameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
    });

    expect(screen.getByPlaceholderText('Value (English)')).toHaveValue('Metal');

    await user.click(screen.getByRole('tab', { name: 'Polish' }));

    expect(screen.getByPlaceholderText('Value (Polish)')).toHaveValue('Metal');
    expect(screen.getByPlaceholderText('Value (Polish)')).toBeDisabled();
  });
});
