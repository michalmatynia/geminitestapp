import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useProductListingsModalsMock } = vi.hoisted(() => ({
  useProductListingsModalsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

vi.mock('./ProductListingsSyncPanel', () => ({
  ProductListingsSyncPanel: () => <div data-testid='sync-panel' />,
}));

import {
  ProductListingsViewProvider,
  type ProductListingsViewContextValue,
} from './context/ProductListingsViewContext';
import { ProductListingsEmpty } from './ProductListingsEmpty';

const baseViewContextValue: ProductListingsViewContextValue = {
  filteredListings: [],
  statusTargetLabel: 'Base.com',
  filterIntegrationSlug: undefined,
  isBaseFilter: false,
  showSync: false,
};

describe('ProductListingsEmpty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductListingsModalsMock.mockReturnValue({
      recoveryContext: null,
    });
  });

  it('renders failed Base.com recovery details when there is no saved listing yet', () => {
    useProductListingsModalsMock.mockReturnValue({
      recoveryContext: {
        source: 'base_quick_export_failed',
        integrationSlug: 'baselinker',
        status: 'failed',
        runId: 'run-base-failed-99',
      },
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsEmpty />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Previous Base.com export failed')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The last Base.com one-click export failed before a listing record was created. Use the options above to retry or choose a different connection.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('run-base-failed-99')).toBeInTheDocument();
  });
});
