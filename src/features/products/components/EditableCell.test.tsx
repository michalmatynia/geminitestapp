/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toast: vi.fn(),
  logClientError: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductsMutations', () => ({
  useUpdateProductField: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: mocks.logClientError,
}));

vi.mock('@/shared/ui', async () => {
  const ReactModule = await import('react');

  return {
    Input: ReactModule.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
      (props, ref) => <input ref={ref} {...props} />
    ),
    useToast: () => ({
      toast: mocks.toast,
    }),
  };
});

import { EditableCell } from './EditableCell';

describe('EditableCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutateAsync.mockResolvedValue(undefined);
  });

  it('saves an updated price when the field loses focus', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(<EditableCell value={100} productId='product-1' field='price' onUpdate={onUpdate} />);

    await user.dblClick(screen.getByText('100.00'));

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '125.5');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        id: 'product-1',
        field: 'price',
        value: 125.5,
      });
    });

    expect(onUpdate).toHaveBeenCalledWith(125.5);
    expect(mocks.toast).toHaveBeenCalledWith('Price updated', { variant: 'success' });
  });

  it('rejects fractional stock values before calling the API', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(<EditableCell value={5} productId='product-1' field='stock' onUpdate={onUpdate} />);

    await user.dblClick(screen.getByText('5'));

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '2.5');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith('Invalid stock value', { variant: 'error' });
    });

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
