import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useIntegrationSelectionMock, useProductListingsModalsMock } = vi.hoisted(() => ({
  useIntegrationSelectionMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
}));

vi.mock('@/features/integrations/components/listings/hooks/useIntegrationSelection', () => ({
  useIntegrationSelection: (...args: unknown[]) => useIntegrationSelectionMock(...args),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  IntegrationSelector: () => <div data-testid='integration-selector' />,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
}));

import {
  ProductListingsViewProvider,
  type ProductListingsViewContextValue,
} from './context/ProductListingsViewContext';
import { ProductListingsStartPanel } from './ProductListingsStartPanel';

const baseViewContextValue: ProductListingsViewContextValue = {
  filteredListings: [],
  integrationScopeLabel: null,
  statusTargetLabel: 'Integrations',
  filterIntegrationSlug: null,
  isScopedMarketplaceFlow: false,
  isBaseFilter: false,
  showSync: false,
};

describe('ProductListingsStartPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: vi.fn(),
      recoveryContext: null,
    });
    useIntegrationSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-1', name: 'Browser', integrationId: 'integration-tradera-1' }],
        },
      ],
      loading: false,
      selectedIntegrationId: 'integration-tradera-1',
      selectedConnectionId: 'conn-tradera-1',
      selectedIntegration: undefined,
      isBaseComIntegration: false,
      isTraderaIntegration: true,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });
  });

  it('seeds integration selection from Tradera recovery context', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: vi.fn(),
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: null,
        integrationId: 'integration-tradera-7',
        connectionId: 'conn-tradera-7',
      },
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          filterIntegrationSlug: 'tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    expect(useIntegrationSelectionMock).toHaveBeenCalledWith(
      'integration-tradera-7',
      'conn-tradera-7',
      { filterIntegrationSlug: 'tradera' }
    );
  });

  it('does not recompute marketplace scope from recovery context when the view filter is unset', () => {
    useProductListingsModalsMock.mockReturnValue({
      onStartListing: vi.fn(),
      recoveryContext: {
        source: 'tradera_quick_export_failed',
        integrationSlug: 'tradera',
        status: 'failed',
        runId: 'run-tradera-1',
        integrationId: 'integration-tradera-7',
        connectionId: 'conn-tradera-7',
      },
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    expect(useIntegrationSelectionMock).toHaveBeenCalledWith(
      'integration-tradera-7',
      'conn-tradera-7',
      { filterIntegrationSlug: null }
    );
    expect(screen.queryByText('Tradera options')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Continue with a Tradera account only.')
    ).not.toBeInTheDocument();
  });

  it('starts listing with the selected integration and connection', () => {
    const onStartListing = vi.fn();
    useProductListingsModalsMock.mockReturnValue({
      onStartListing,
      recoveryContext: null,
    });

    render(
      <ProductListingsViewProvider value={baseViewContextValue}>
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'List Product' }));

    expect(onStartListing).toHaveBeenCalledWith('integration-tradera-1', 'conn-tradera-1', {
      autoSubmit: false,
    });
  });

  it('auto-submits when restarting from a matching recovery selection', () => {
    const onStartListing = vi.fn();
    useProductListingsModalsMock.mockReturnValue({
      onStartListing,
      recoveryContext: {
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        runId: null,
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      },
    });
    useIntegrationSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-vinted-1',
          name: 'Vinted.pl',
          slug: 'vinted',
          connections: [
            { id: 'conn-vinted-1', name: 'Vinted Browser', integrationId: 'integration-vinted-1' },
          ],
        },
      ],
      loading: false,
      selectedIntegrationId: 'integration-vinted-1',
      selectedConnectionId: 'conn-vinted-1',
      selectedIntegration: undefined,
      isBaseComIntegration: false,
      isTraderaIntegration: false,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          filterIntegrationSlug: 'vinted',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'List Product' }));

    expect(onStartListing).toHaveBeenCalledWith('integration-vinted-1', 'conn-vinted-1', {
      autoSubmit: true,
    });
  });

  it('keeps restart manual when the user changes away from the recovery connection', () => {
    const onStartListing = vi.fn();
    useProductListingsModalsMock.mockReturnValue({
      onStartListing,
      recoveryContext: {
        source: 'vinted_quick_export_auth_required',
        integrationSlug: 'vinted',
        status: 'auth_required',
        runId: null,
        integrationId: 'integration-vinted-1',
        connectionId: 'conn-vinted-1',
      },
    });
    useIntegrationSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-vinted-1',
          name: 'Vinted.pl',
          slug: 'vinted',
          connections: [
            { id: 'conn-vinted-1', name: 'Vinted Browser', integrationId: 'integration-vinted-1' },
            { id: 'conn-vinted-2', name: 'Backup Browser', integrationId: 'integration-vinted-1' },
          ],
        },
      ],
      loading: false,
      selectedIntegrationId: 'integration-vinted-1',
      selectedConnectionId: 'conn-vinted-2',
      selectedIntegration: undefined,
      isBaseComIntegration: false,
      isTraderaIntegration: false,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          integrationScopeLabel: 'Vinted.pl',
          statusTargetLabel: 'Vinted.pl',
          filterIntegrationSlug: 'vinted',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'List Product' }));

    expect(onStartListing).toHaveBeenCalledWith('integration-vinted-1', 'conn-vinted-2', {
      autoSubmit: false,
    });
  });

  it('shows marketplace-specific copy for filtered integration flows', () => {
    render(
      <ProductListingsViewProvider
        value={{
          ...baseViewContextValue,
          integrationScopeLabel: 'Tradera',
          statusTargetLabel: 'Tradera',
          filterIntegrationSlug: 'tradera',
          isScopedMarketplaceFlow: true,
        }}
      >
        <ProductListingsStartPanel />
      </ProductListingsViewProvider>
    );

    expect(screen.getByText('Tradera options')).toBeInTheDocument();
    expect(screen.getByText('Continue with a Tradera account only.')).toBeInTheDocument();
  });
});
