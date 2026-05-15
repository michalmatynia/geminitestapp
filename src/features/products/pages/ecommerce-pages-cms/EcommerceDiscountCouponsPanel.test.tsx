import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    delete: mocks.apiDelete,
    get: mocks.apiGet,
    put: mocks.apiPut,
  },
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/primitives.public')>(
    '@/shared/ui/primitives.public'
  );
  return {
    ...actual,
    useToast: () => ({ toast: mocks.toast }),
  };
});

import { EcommerceDiscountCouponsPanel } from './EcommerceDiscountCouponsPanel';

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

const renderDiscountCouponsPanel = (): ReturnType<typeof render> =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <EcommerceDiscountCouponsPanel />
    </QueryClientProvider>
  );

describe('EcommerceDiscountCouponsPanel', () => {
  beforeEach(() => {
    mocks.apiDelete.mockReset();
    mocks.apiGet.mockReset();
    mocks.apiPut.mockReset();
    mocks.toast.mockReset();
  });

  it('loads coupons and saves percentage coupon updates', async () => {
    mocks.apiGet.mockResolvedValue({
      ok: true,
      coupons: [
        {
          code: 'WELCOME20',
          createdAt: null,
          discountType: 'percentage',
          enabled: true,
          endsAt: null,
          minOrderAmount: null,
          singleUse: false,
          startsAt: null,
          targetSources: ['local', 'cloud'],
          updatedAt: null,
          usageLimit: null,
          value: 0.2,
        },
      ],
    });
    mocks.apiPut.mockResolvedValue({
      ok: true,
      coupon: {
        code: 'WELCOME25',
        createdAt: null,
        discountType: 'percentage',
        enabled: true,
        endsAt: null,
        minOrderAmount: null,
        singleUse: false,
        startsAt: null,
        targetSources: ['local', 'cloud'],
        updatedAt: '2026-05-13T10:00:00.000Z',
        usageLimit: null,
        value: 0.25,
      },
    });

    renderDiscountCouponsPanel();

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'WELCOME25' } });
    fireEvent.change(screen.getByLabelText('Value (%)'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save coupon' }));

    await waitFor(() => {
      expect(mocks.apiPut).toHaveBeenCalledWith(
        '/api/v2/products/pages/discount-coupons',
        expect.objectContaining({
          code: 'WELCOME25',
          discountType: 'percentage',
          value: 0.25,
        }),
        { logError: false, timeout: 120_000 }
      );
    });
    expect(await screen.findByText('WELCOME25')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith('Discount coupon saved to ecommerce databases.', {
      variant: 'success',
    });
  });

  it('deletes coupons from the ecommerce databases', async () => {
    mocks.apiGet.mockResolvedValue({
      ok: true,
      coupons: [
        {
          code: 'WELCOME20',
          createdAt: null,
          discountType: 'percentage',
          enabled: true,
          endsAt: null,
          minOrderAmount: null,
          singleUse: false,
          startsAt: null,
          targetSources: ['local'],
          updatedAt: null,
          usageLimit: null,
          value: 0.2,
        },
      ],
    });
    mocks.apiDelete.mockResolvedValue({ ok: true, code: 'WELCOME20' });

    renderDiscountCouponsPanel();

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mocks.apiDelete).toHaveBeenCalledWith(
        '/api/v2/products/pages/discount-coupons/WELCOME20',
        { logError: false, timeout: 120_000 }
      );
    });
    expect(screen.queryByText('WELCOME20')).not.toBeInTheDocument();
  });
});
