import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleSubmitMock,
  useListingSelectionMock,
  formModalPropsMock,
} = vi.hoisted(() => ({
  handleSubmitMock: vi.fn(),
  useListingSelectionMock: vi.fn(),
  formModalPropsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  ListingSettingsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useListingSelection: () => useListingSelectionMock(),
}));

vi.mock('./hooks/useListProductForm', () => ({
  useListProductForm: () => ({
    error: null,
    exportLogs: [],
    submitting: false,
    handleSubmit: handleSubmitMock,
    handleImageRetry: vi.fn(),
  }),
}));

vi.mock('./BaseListingSettings', () => ({
  BaseListingSettings: () => <div data-testid='base-settings' />,
}));

vi.mock('./TraderaListingSettings', () => ({
  TraderaListingSettings: () => <div data-testid='tradera-settings' />,
}));

vi.mock('./IntegrationAccountSummary', () => ({
  IntegrationAccountSummary: () => <div data-testid='integration-account-summary' />,
}));

vi.mock('./list-product-modal/IntegrationSelection', () => ({
  IntegrationSelection: () => <div data-testid='integration-selection' />,
}));

vi.mock('./ExportLogViewer', () => ({
  ExportLogViewer: () => <div data-testid='export-log-viewer' />,
}));

vi.mock('./list-product-modal/ListProductErrorPanel', () => ({
  ListProductErrorPanel: () => <div data-testid='list-product-error' />,
}));

vi.mock('./list-product-modal/context/ListProductModalFormContext', () => ({
  ListProductModalFormProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormModal: ({
    children,
    open,
    title,
    saveText,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    title?: string;
    saveText?: string;
  }) => {
    formModalPropsMock({ title, saveText });
    return open ? <div data-testid='form-modal'>{children}</div> : null;
  },
}));

import { ListProductModal } from './ListProductModal';

describe('ListProductModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleSubmitMock.mockResolvedValue(undefined);
    useListingSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
        },
      ],
      loadingIntegrations: false,
      selectedIntegrationId: 'integration-tradera-1',
      selectedConnectionId: 'conn-tradera-1',
      isBaseComIntegration: false,
      isTraderaIntegration: true,
    });
  });

  it('auto-submits once when opened from a preset Tradera recovery flow', async () => {
    const onSuccess = vi.fn();

    render(
      <ListProductModal
        isOpen={true}
        item={{
          id: 'product-1',
          sku: 'SKU-1',
          name: 'Product 1',
          images: [],
          catalogIds: [],
        } as never}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        initialIntegrationId='integration-tradera-1'
        initialConnectionId='conn-tradera-1'
        autoSubmitOnOpen={true}
      />
    );

    await waitFor(() => {
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);
    });
    expect(handleSubmitMock).toHaveBeenCalledWith(onSuccess);
  });

  it('does not auto-submit without the recovery auto-submit flag', async () => {
    render(
      <ListProductModal
        isOpen={true}
        item={{
          id: 'product-1',
          sku: 'SKU-1',
          name: 'Product 1',
          images: [],
          catalogIds: [],
        } as never}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialIntegrationId='integration-tradera-1'
        initialConnectionId='conn-tradera-1'
        autoSubmitOnOpen={false}
      />
    );

    await Promise.resolve();
    expect(handleSubmitMock).not.toHaveBeenCalled();
  });

  it('uses Tradera-specific modal copy for Tradera listing flows', async () => {
    render(
      <ListProductModal
        isOpen={true}
        item={{
          id: 'product-1',
          sku: 'SKU-1',
          name: 'Product 1',
          images: [],
          catalogIds: [],
        } as never}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialIntegrationId='integration-tradera-1'
        initialConnectionId='conn-tradera-1'
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'List on Tradera - Unnamed Product',
        saveText: 'List on Tradera',
      })
    );
  });

  it('uses Base-specific modal copy for Base export flows', async () => {
    useListingSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-base-1',
          name: 'Base.com',
          slug: 'baselinker',
          connections: [{ id: 'conn-base-1', name: 'Base account' }],
        },
      ],
      loadingIntegrations: false,
      selectedIntegrationId: 'integration-base-1',
      selectedConnectionId: 'conn-base-1',
      isBaseComIntegration: true,
      isTraderaIntegration: false,
      selectedIntegration: {
        id: 'integration-base-1',
        name: 'Base.com',
        slug: 'baselinker',
        connections: [{ id: 'conn-base-1', name: 'Base account' }],
      },
    });

    render(
      <ListProductModal
        isOpen={true}
        item={{
          id: 'product-1',
          sku: 'SKU-1',
          name: 'Product 1',
          images: [],
          catalogIds: [],
        } as never}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialIntegrationId='integration-base-1'
        initialConnectionId='conn-base-1'
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export to Base.com - Unnamed Product',
        saveText: 'Export to Base.com',
      })
    );
  });
});
