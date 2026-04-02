import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./ProductListingsSyncPanel', () => ({
  ProductListingsSyncPanel: () => <div data-testid='sync-panel' />,
}));

import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';

describe('ProductListingsScopedStatusPanel', () => {
  it('renders a compact scoped status row when a listing status is available', () => {
    render(
      <ProductListingsScopedStatusPanel
        statusTargetLabel='Tradera'
        status='auth_required'
        isBaseFilter={false}
        showSync={false}
      />
    );

    expect(screen.getByText('Tradera status: auth_required')).toBeInTheDocument();
    expect(screen.queryByTestId('sync-panel')).not.toBeInTheDocument();
  });

  it('renders a not-connected panel and Base sync controls when scoped to Base.com', () => {
    render(
      <ProductListingsScopedStatusPanel
        statusTargetLabel='Base.com'
        isBaseFilter={true}
        showSync={true}
      />
    );

    expect(screen.getByText('Base.com status')).toBeInTheDocument();
    expect(screen.getByText('Not connected.')).toBeInTheDocument();
    expect(screen.getByTestId('sync-panel')).toBeInTheDocument();
  });
});
