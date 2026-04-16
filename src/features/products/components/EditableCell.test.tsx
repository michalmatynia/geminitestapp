/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPatch: vi.fn(),
  toast: vi.fn(),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    patch: (...args: unknown[]) => mocks.apiPatch(...args),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: mocks.logClientCatch,
}));

vi.mock('@/shared/ui/input', async () => {
  const ReactModule = await import('react');

  return {
    Input: ReactModule.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
      (props, ref) => <input ref={ref} {...props} />
    ),
  };
});

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

import { EditableCell } from './EditableCell';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('EditableCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiPatch.mockResolvedValue({ id: 'product-1', price: 125.5, stock: 5 });
  });

  it('saves an updated price when the field loses focus', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <EditableCell value={100} productId='product-1' field='price' onUpdate={onUpdate} />
      </QueryClientProvider>
    );

    await user.dblClick(screen.getByText('100.00'));

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '125.5');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/v2/products/product-1', { price: 125.5 });
    });

    expect(onUpdate).toHaveBeenCalledWith(125.5);
    expect(mocks.toast).toHaveBeenCalledWith('Price updated', { variant: 'success' });
  });

  it('rejects fractional stock values before calling the API', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <EditableCell value={5} productId='product-1' field='stock' onUpdate={onUpdate} />
      </QueryClientProvider>
    );

    await user.dblClick(screen.getByText('5'));

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '2.5');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith('Invalid stock value', { variant: 'error' });
    });

    expect(mocks.apiPatch).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
