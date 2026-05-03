import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductBatchEditResponse } from '@/shared/contracts/products';

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    children,
    footer,
    isOpen,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen?: boolean;
    title?: string;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={title}>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    disabled,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const toastMock = vi.fn();

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { ProductBatchEditModal } from './ProductBatchEditModal';

const createResponse = (dryRun: boolean): ProductBatchEditResponse => ({
  status: 'ok',
  dryRun,
  requested: 2,
  matched: 2,
  changed: 2,
  unchanged: 0,
  failed: 0,
  results: [
    {
      productId: 'product-1',
      status: 'changed',
      changes: [{ field: 'name_en', oldValue: 'Old', newValue: 'New' }],
    },
  ],
});

describe('ProductBatchEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits a dry-run request for the default localized field operation', async () => {
    const onSubmit = vi.fn().mockResolvedValue(createResponse(true));

    render(
      <ProductBatchEditModal
        isOpen
        onClose={vi.fn()}
        productIds={['product-1', 'product-2']}
        isSubmitting={false}
        onSubmit={onSubmit}
        onApplied={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Operation 1 value'), {
      target: { value: 'New product name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        productIds: ['product-1', 'product-2'],
        dryRun: true,
        operations: [
          {
            field: 'name',
            language: 'en',
            mode: 'set',
            value: 'New product name',
          },
        ],
      });
    });
    expect(toastMock).toHaveBeenCalledWith('Batch edit preview generated.', {
      variant: 'success',
    });
  });

  it('builds replace operations and calls onApplied after apply succeeds', async () => {
    const onSubmit = vi.fn().mockResolvedValue(createResponse(false));
    const onApplied = vi.fn();

    render(
      <ProductBatchEditModal
        isOpen
        onClose={vi.fn()}
        productIds={['product-1']}
        isSubmitting={false}
        onSubmit={onSubmit}
        onApplied={onApplied}
      />
    );

    fireEvent.change(screen.getByLabelText('Operation 1 field'), {
      target: { value: 'ean' },
    });
    fireEvent.change(screen.getByLabelText('Operation 1 mode'), {
      target: { value: 'replace' },
    });
    fireEvent.change(screen.getByLabelText('Operation 1 find value'), {
      target: { value: '111' },
    });
    fireEvent.change(screen.getByLabelText('Operation 1 replacement value'), {
      target: { value: '222' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        productIds: ['product-1'],
        dryRun: false,
        operations: [
          {
            field: 'ean',
            mode: 'replace',
            find: '111',
            replaceWith: '222',
          },
        ],
      });
    });
    expect(onApplied).toHaveBeenCalledWith(createResponse(false));
  });

  it('allows text replace operations with an empty replacement value', async () => {
    const onSubmit = vi.fn().mockResolvedValue(createResponse(false));

    render(
      <ProductBatchEditModal
        isOpen
        onClose={vi.fn()}
        productIds={['product-1']}
        isSubmitting={false}
        onSubmit={onSubmit}
        onApplied={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Operation 1 field'), {
      target: { value: 'ean' },
    });
    fireEvent.change(screen.getByLabelText('Operation 1 mode'), {
      target: { value: 'replace' },
    });
    fireEvent.change(screen.getByLabelText('Operation 1 find value'), {
      target: { value: '111' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        productIds: ['product-1'],
        dryRun: false,
        operations: [
          {
            field: 'ean',
            mode: 'replace',
            find: '111',
            replaceWith: '',
          },
        ],
      });
    });
  });
});
