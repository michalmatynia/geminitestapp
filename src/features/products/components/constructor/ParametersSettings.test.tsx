// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

const { saveMutateAsyncMock, deleteMutateAsyncMock, toastMock } = vi.hoisted(() => ({
  saveMutateAsyncMock: vi.fn(),
  deleteMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSaveParameterMutation: () => ({
    mutateAsync: saveMutateAsyncMock,
    isPending: false,
  }),
  useDeleteParameterMutation: () => ({
    mutateAsync: deleteMutateAsyncMock,
    isPending: false,
  }),
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
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/FormModal', () => ({
  FormModal: ({
    open,
    title,
    children,
    onSave,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    onSave: () => void;
  }) =>
    open ? (
      <div role='dialog' aria-label={title}>
        {children}
        <button type='button' onClick={onSave}>
          Save
        </button>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    function Input(props, ref) {
      return <input ref={ref} {...props} />;
    }
  ),
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    ariaLabel,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder ?? 'select'}
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
}));

vi.mock('@/shared/ui/templates/modals/ConfirmModal', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/shared/ui/templates/SimpleSettingsList', () => ({
  SimpleSettingsList: ({
    items,
  }: {
    items: Array<{ title: string; description?: React.ReactNode }>;
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.title}>
          <div>{item.title}</div>
          <div>{item.description}</div>
        </div>
      ))}
    </div>
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

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { ParametersSettings } from './ParametersSettings';

const catalog = {
  id: 'catalog-1',
  name: 'Pins',
  isDefault: true,
  languageIds: [],
  defaultLanguageId: null,
  defaultPriceGroupId: null,
  priceGroupIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as CatalogRecord;

function renderSettings(parameters: ProductParameter[] = []) {
  return render(
    <ParametersSettings
      loading={false}
      parameters={parameters}
      catalogs={[catalog]}
      selectedCatalogId='catalog-1'
      onCatalogChange={vi.fn()}
      onRefresh={vi.fn()}
    />
  );
}

describe('ParametersSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMutateAsyncMock.mockResolvedValue({
      id: 'parameter-1',
      name_en: 'Material',
      selectorType: 'text',
      linkedTitleTermType: 'material',
    });
    deleteMutateAsyncMock.mockResolvedValue(undefined);
  });

  it('saves linked English Title term mapping for text parameters', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /add parameter/i }));

    await user.type(screen.getByLabelText('Field name in English'), 'Material');
    fireEvent.change(screen.getByLabelText('Linked English Title term'), {
      target: { value: 'material' },
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveMutateAsyncMock).toHaveBeenCalledWith({
        id: undefined,
        data: expect.objectContaining({
          name_en: 'Material',
          catalogId: 'catalog-1',
          selectorType: 'text',
          linkedTitleTermType: 'material',
        }),
      });
    });
  });

  it('clears and disables linked English Title mapping when selector changes to a non-linkable type', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: /add parameter/i }));

    await user.type(screen.getByLabelText('Field name in English'), 'Material');
    fireEvent.change(screen.getByLabelText('Linked English Title term'), {
      target: { value: 'material' },
    });
    fireEvent.change(screen.getByLabelText('Select selector type'), {
      target: { value: 'select' },
    });

    const linkedTitleTermSelect = screen.getByLabelText('Linked English Title term');
    expect(linkedTitleTermSelect).toBeDisabled();
    expect(linkedTitleTermSelect).toHaveValue('');

    await user.type(
      screen.getByLabelText(/one value label per line/i),
      'Steel'
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveMutateAsyncMock).toHaveBeenCalledWith({
        id: undefined,
        data: expect.objectContaining({
          selectorType: 'select',
          linkedTitleTermType: null,
          optionLabels: ['Steel'],
        }),
      });
    });
  });
});
