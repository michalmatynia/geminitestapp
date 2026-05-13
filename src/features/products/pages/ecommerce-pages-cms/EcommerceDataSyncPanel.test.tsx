import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: mocks.apiPost,
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

import { EcommerceDataSyncPanel } from './EcommerceDataSyncPanel';

describe('EcommerceDataSyncPanel', () => {
  beforeEach(() => {
    mocks.apiPost.mockReset();
    mocks.toast.mockReset();
  });

  it('pushes categories and renders local and cloud ecommerce target results', async () => {
    mocks.apiPost.mockResolvedValueOnce({
      ok: true,
      sync: {
        sourceCategoryCount: 2,
        syncedAt: '2026-05-13T10:00:00.000Z',
        targets: [
          {
            categoryCount: 2,
            dbName: 'ecom_local',
            deletedCount: 1,
            matchedCount: 1,
            modifiedCount: 1,
            source: 'local',
            upsertedCount: 1,
          },
          {
            categoryCount: 2,
            dbName: 'ecom_cloud',
            deletedCount: 0,
            matchedCount: 2,
            modifiedCount: 0,
            source: 'cloud',
            upsertedCount: 0,
          },
        ],
      },
    });

    render(<EcommerceDataSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Push categories' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v2/products/pages/data-sync/categories',
        undefined,
        { logError: false, timeout: 120_000 }
      );
    });
    expect(await screen.findByText('Local ecommerce')).toBeInTheDocument();
    expect(screen.getByText('Cloud ecommerce')).toBeInTheDocument();
    expect(screen.getByText('ecom_local')).toBeInTheDocument();
    expect(screen.getByText('ecom_cloud')).toBeInTheDocument();
    expect(screen.getByText('2 source categories')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith('Categories pushed to ecommerce databases.', {
      variant: 'success',
    });
  });

  it('pushes the pricing system and renders ecommerce target results', async () => {
    mocks.apiPost.mockResolvedValueOnce({
      ok: true,
      sync: {
        sourceCurrencyCount: 2,
        sourcePriceGroupCount: 3,
        syncedAt: '2026-05-13T10:00:00.000Z',
        targets: [
          {
            currencyCount: 2,
            dbName: 'ecom_local',
            deletedCurrencyCount: 0,
            deletedPriceGroupCount: 0,
            matchedCurrencyCount: 1,
            matchedPriceGroupCount: 2,
            modifiedCurrencyCount: 1,
            modifiedPriceGroupCount: 1,
            priceGroupCount: 3,
            source: 'local',
            upsertedCurrencyCount: 1,
            upsertedPriceGroupCount: 1,
          },
        ],
      },
    });

    render(<EcommerceDataSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Push pricing system' }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v2/products/pages/data-sync/pricing',
        undefined,
        { logError: false, timeout: 120_000 }
      );
    });
    expect(await screen.findByText('Pricing System')).toBeInTheDocument();
    expect(screen.getByText('2 currencies, 3 price groups')).toBeInTheDocument();
    expect(screen.getByText('2 currencies, 3 groups')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith('Pricing system pushed to ecommerce databases.', {
      variant: 'success',
    });
  });

  it('shows the push error returned by the API client', async () => {
    mocks.apiPost.mockRejectedValue(new Error('Local ecommerce database is not reachable.'));

    render(<EcommerceDataSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Push categories' }));

    expect(await screen.findByText('Category push failed')).toBeInTheDocument();
    expect(screen.getByText('Local ecommerce database is not reachable.')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith('Local ecommerce database is not reachable.', {
      variant: 'error',
    });
  });
});
