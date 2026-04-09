// @vitest-environment jsdom

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

const { useIntegrationsMock } = vi.hoisted(() => ({
  useIntegrationsMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrations: () => useIntegrationsMock(),
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

function renderMarketplaceCopy(defaultValues: Partial<ProductFormData> = {}) {
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
});
