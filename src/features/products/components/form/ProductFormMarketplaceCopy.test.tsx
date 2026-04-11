// @vitest-environment jsdom

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

const {
  getAiPathRunMock,
  subscribeToTrackedAiPathRunMock,
  triggerButtonBarMock,
  useIntegrationsMock,
  useProductFormCoreMock,
} = vi.hoisted(() => ({
  getAiPathRunMock: vi.fn(),
  subscribeToTrackedAiPathRunMock: vi.fn(),
  triggerButtonBarMock: vi.fn(),
  useIntegrationsMock: vi.fn(),
  useProductFormCoreMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrations: () => useIntegrationsMock(),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  getAiPathRun: (...args: unknown[]) => getAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/client-run-tracker', () => ({
  subscribeToTrackedAiPathRun: (...args: unknown[]) => subscribeToTrackedAiPathRunMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar', () => ({
  TriggerButtonBar: (props: Record<string, unknown>) => {
    triggerButtonBarMock(props);
    const runtimeProps = props as {
      disabled?: boolean;
      entityId?: string | null;
      entityType: 'product' | 'note' | 'custom';
      location: string;
      onRunQueued?: ((args: {
        button: {
          id: string;
          name: string;
          pathId: string;
          locations: string[];
          mode: 'click';
          display: { label: string };
          sortIndex: number;
          createdAt: string;
          updatedAt: string;
        };
        runId: string;
        entityId?: string | null | undefined;
        entityType: 'product' | 'note' | 'custom';
      }) => void) | undefined;
    };
    return (
      <button
        type='button'
        aria-label='Mock Debrand Trigger'
        disabled={Boolean(runtimeProps.disabled)}
        onClick={() =>
          runtimeProps.onRunQueued?.({
            button: {
              id: 'trigger-debrand-marketplace-copy',
              name: 'Debrand',
              pathId: 'path-debrand-marketplace-copy',
              locations: [runtimeProps.location],
              mode: 'click',
              display: { label: 'Debrand' },
              sortIndex: 0,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            runId: 'run-debrand-marketplace-copy',
            entityId: runtimeProps.entityId,
            entityType: runtimeProps.entityType,
          })
        }
      >
        Debrand
      </button>
    );
  },
}));

vi.mock('lucide-react', () => ({
  Languages: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
  Plus: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
  Trash2: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}));

vi.mock('@/shared/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role='alert'>{children}</div>,
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

vi.mock('@/shared/ui/form-section', () => ({
  FormSection: ({
    title,
    description,
    children,
    actions,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
    </section>
  ),
  FormField: ({
    label,
    description,
    error,
    children,
  }: {
    label: string;
    description?: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      {children}
      {error ? <div role='alert'>{error}</div> : null}
    </label>
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
}));

vi.mock('@/shared/ui/textarea', () => ({
  Textarea: React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  >(function Textarea(props, ref) {
    return <textarea ref={ref} {...props} />;
  }),
}));

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: ({
    options,
    selected,
    onChange,
    ariaLabel,
  }: {
    options: Array<{ value: string; label: string; disabled?: boolean }>;
    selected: string[];
    onChange: (values: string[]) => void;
    ariaLabel?: string;
  }) => (
    <div aria-label={ariaLabel}>
      <div data-testid={ariaLabel}>{selected.join(',')}</div>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          disabled={option.disabled}
          onClick={() => {
            const next = selected.includes(option.value)
              ? selected.filter((value) => value !== option.value)
              : [...selected, option.value];
            onChange(next);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

import ProductFormMarketplaceCopy from './ProductFormMarketplaceCopy';

function renderMarketplaceCopy(
  defaultValues: Partial<ProductFormData> = {},
  options?: {
    coreValue?: Partial<ReturnType<typeof useProductFormCoreMock>>;
  }
) {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        sku: 'SKU-1',
        price: 0,
        stock: 0,
        name_en: '',
        name_pl: '',
        name_de: '',
        description_en: '',
        description_pl: '',
        description_de: '',
        marketplaceContentOverrides: [],
        ...defaultValues,
      },
    });

    useProductFormCoreMock.mockReturnValue({
      product: {
        id: 'product-1',
      },
      draft: null,
      getValues: methods.getValues,
      setValue: methods.setValue,
      ...(options?.coreValue ?? {}),
    });

    return <FormProvider {...methods}>{children}</FormProvider>;
  }

  return render(
    <Wrapper>
      <ProductFormMarketplaceCopy />
    </Wrapper>
  );
}

describe('ProductFormMarketplaceCopy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsMock.mockReturnValue({
      data: [
        { id: 'integration-tradera', name: 'Tradera', slug: 'tradera' },
        { id: 'integration-vinted', name: 'Vinted', slug: 'vinted' },
        { id: 'integration-base', name: 'Base', slug: 'base' },
      ],
      isLoading: false,
    });
    subscribeToTrackedAiPathRunMock.mockImplementation(() => vi.fn());
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        nodes: [],
      },
    });
  });

  it('adds an alternate copy rule and updates its marketplace summary', async () => {
    const user = userEvent.setup();
    renderMarketplaceCopy();

    await user.click(screen.getByRole('button', { name: /add override/i }));
    const firstSelector = screen.getByLabelText('Target integrations for alternate copy 1');
    await user.click(within(firstSelector).getByText('Tradera'));
    await user.type(screen.getByLabelText('Alternate title 1'), 'Alt title');

    expect(screen.getByText('Effective on: Tradera')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alt title')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Base' })).not.toBeInTheDocument();
  });

  it('disables integrations already assigned to another alternate copy rule', async () => {
    const user = userEvent.setup();
    renderMarketplaceCopy({
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera'],
          title: 'First title',
          description: '',
        },
        {
          integrationIds: [],
          title: '',
          description: '',
        },
      ],
    });

    const firstSelector = screen.getByLabelText('Target integrations for alternate copy 1');
    const secondSelector = screen.getByLabelText('Target integrations for alternate copy 2');

    expect(within(firstSelector).getByText('Tradera')).not.toBeDisabled();
    expect(within(secondSelector).getByText('Tradera')).toBeDisabled();

    await user.click(within(secondSelector).getByText('Vinted.pl'));
    expect(screen.getByText('Effective on: Vinted.pl')).toBeInTheDocument();
  });

  it('builds row-specific debrand trigger context from the current English copy', async () => {
    renderMarketplaceCopy({
      name_en: 'Warhammer 40,000 Space Marine Figure',
      description_en: 'Official branded description',
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera', 'integration-vinted'],
          title: 'Old alternate title',
          description: 'Old alternate description',
        },
      ],
    });

    const triggerProps = triggerButtonBarMock.mock.calls[0]?.[0] as {
      getEntityJson?: () => Record<string, unknown>;
      getTriggerExtras?: () => Record<string, unknown>;
      location?: string;
    };

    expect(triggerProps.location).toBe('product_marketplace_copy_row');
    expect(triggerProps.getEntityJson?.()).toMatchObject({
      id: 'product-1',
      name_en: 'Warhammer 40,000 Space Marine Figure',
      description_en: 'Official branded description',
      marketplaceCopyDebrandInput: {
        sourceEnglishTitle: 'Warhammer 40,000 Space Marine Figure',
        sourceEnglishDescription: 'Official branded description',
        targetRow: {
          id: expect.any(String),
          index: 0,
          integrationIds: ['integration-tradera', 'integration-vinted'],
          integrationNames: ['Tradera', 'Vinted.pl'],
          currentAlternateTitle: 'Old alternate title',
          currentAlternateDescription: 'Old alternate description',
        },
      },
    });
    expect(triggerProps.getTriggerExtras?.()).toMatchObject({
      marketplaceCopyDebrandInput: {
        sourceEnglishTitle: 'Warhammer 40,000 Space Marine Figure',
        sourceEnglishDescription: 'Official branded description',
        targetRow: {
          id: expect.any(String),
          index: 0,
          integrationIds: ['integration-tradera', 'integration-vinted'],
          integrationNames: ['Tradera', 'Vinted.pl'],
          currentAlternateTitle: 'Old alternate title',
          currentAlternateDescription: 'Old alternate description',
        },
      },
    });
  });

  it('writes completed debrand results back into the same alternate copy row', async () => {
    const user = userEvent.setup();
    const trackedCallbacks = new Map<string, (snapshot: Record<string, unknown>) => void>();
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (runId: string, callback: (snapshot: Record<string, unknown>) => void) => {
        trackedCallbacks.set(runId, callback);
        return vi.fn();
      }
    );
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        nodes: [
          {
            outputs: {
              bundle: {
                debrandedTitle: 'WH 40k Space Marine Figure',
                debrandedDescription: 'Compatible with grimdark sci-fi armies.',
              },
            },
          },
        ],
      },
    });

    renderMarketplaceCopy({
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera'],
          title: '',
          description: '',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Mock Debrand Trigger' }));

    expect(subscribeToTrackedAiPathRunMock).toHaveBeenCalledWith(
      'run-debrand-marketplace-copy',
      expect.any(Function)
    );

    const callback = trackedCallbacks.get('run-debrand-marketplace-copy');
    expect(callback).toBeTypeOf('function');

    callback?.({
      trackingState: 'stopped',
      status: 'completed',
      errorMessage: null,
    });

    expect(await screen.findByDisplayValue('WH 40k Space Marine Figure')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('Compatible with grimdark sci-fi armies.')
    ).toBeInTheDocument();
  });

  it('writes debrand results into the same row after earlier rows are removed', async () => {
    const user = userEvent.setup();
    const trackedCallbacks = new Map<string, (snapshot: Record<string, unknown>) => void>();
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (runId: string, callback: (snapshot: Record<string, unknown>) => void) => {
        trackedCallbacks.set(runId, callback);
        return vi.fn();
      }
    );
    getAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        nodes: [
          {
            outputs: {
              bundle: {
                debrandedTitle: 'WH 40k Space Marine Figure',
                debrandedDescription: 'Compatible with grimdark sci-fi armies.',
              },
            },
          },
        ],
      },
    });

    renderMarketplaceCopy({
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera'],
          title: 'First row title',
          description: 'First row description',
        },
        {
          integrationIds: ['integration-vinted'],
          title: '',
          description: '',
        },
      ],
    });

    await user.click(screen.getAllByRole('button', { name: 'Mock Debrand Trigger' })[1]!);

    const staleCallback = trackedCallbacks.get('run-debrand-marketplace-copy');
    expect(staleCallback).toBeTypeOf('function');

    await user.click(screen.getByRole('button', { name: 'Remove alternate copy 1' }));

    staleCallback?.({
      trackingState: 'stopped',
      status: 'completed',
      errorMessage: null,
    });

    expect(await screen.findByDisplayValue('WH 40k Space Marine Figure')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('Compatible with grimdark sci-fi armies.')
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue('First row title')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('First row description')).not.toBeInTheDocument();
  });

  it('shows a row-local error when completed run details cannot be loaded', async () => {
    const user = userEvent.setup();
    const trackedCallbacks = new Map<string, (snapshot: Record<string, unknown>) => void>();
    subscribeToTrackedAiPathRunMock.mockImplementation(
      (runId: string, callback: (snapshot: Record<string, unknown>) => void) => {
        trackedCallbacks.set(runId, callback);
        return vi.fn();
      }
    );
    getAiPathRunMock.mockRejectedValue(new Error('network failed'));

    renderMarketplaceCopy({
      marketplaceContentOverrides: [
        {
          integrationIds: ['integration-tradera'],
          title: '',
          description: '',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: 'Mock Debrand Trigger' }));

    trackedCallbacks.get('run-debrand-marketplace-copy')?.({
      trackingState: 'stopped',
      status: 'completed',
      errorMessage: null,
    });

    expect(
      await screen.findByText('Debrand failed: unable to load the completed AI Path run details.')
    ).toBeInTheDocument();
  });

  it('disables the row debrand trigger until the product has a real product id', () => {
    renderMarketplaceCopy(
      {
        marketplaceContentOverrides: [
          {
            integrationIds: ['integration-tradera'],
            title: '',
            description: '',
          },
        ],
      },
      {
        coreValue: {
          product: undefined,
          draft: { id: 'draft-1' },
        },
      }
    );

    expect(screen.getByRole('button', { name: 'Mock Debrand Trigger' })).toBeDisabled();

    const triggerProps = triggerButtonBarMock.mock.calls[0]?.[0] as {
      entityId?: string | null;
      disabled?: boolean;
    };
    expect(triggerProps.entityId).toBeNull();
    expect(triggerProps.disabled).toBe(true);
  });
});
