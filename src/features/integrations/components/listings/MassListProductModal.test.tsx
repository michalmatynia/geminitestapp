import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useListingSelectionMock,
  formModalPropsMock,
} = vi.hoisted(() => ({
  useListingSelectionMock: vi.fn(),
  formModalPropsMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  ListingSettingsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useListingSelection: () => useListingSelectionMock(),
}));

vi.mock('./hooks/useMassListForm', () => ({
  useMassListForm: () => ({
    error: null,
    progress: null,
    exportLogs: [],
    handleSubmit: vi.fn(),
    submitting: false,
  }),
}));

vi.mock('./IntegrationAccountSummary', () => ({
  IntegrationAccountSummary: () => <div data-testid='integration-account-summary' />,
}));

vi.mock('./BaseListingSettings', () => ({
  BaseListingSettings: () => <div data-testid='base-settings' />,
}));

vi.mock('./ExportLogViewer', () => ({
  ExportLogViewer: () => <div data-testid='export-log-viewer' />,
}));

vi.mock('./mass-list-modal/MassListProgressPanel', () => ({
  MassListProgressPanel: () => <div data-testid='mass-list-progress-panel' />,
}));

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
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

import { MassListProductModal } from './MassListProductModal';

describe('MassListProductModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListingSelectionMock.mockReturnValue({
      loadingIntegrations: false,
      selectedIntegration: {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
      },
      isBaseComIntegration: false,
    });
  });

  it('uses generic mass-list copy for non-Base integrations', () => {
    render(
      <MassListProductModal
        isOpen={true}
        item={['product-1', 'product-2', 'product-3']}
        integrationId='integration-tradera-1'
        connectionId='conn-tradera-1'
        onClose={vi.fn()}
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'List 3 Products to Tradera',
        saveText: 'List Products',
      })
    );
  });

  it('uses Base-specific save copy for Base.com mass export', () => {
    useListingSelectionMock.mockReturnValue({
      loadingIntegrations: false,
      selectedIntegration: {
        id: 'integration-base-1',
        name: 'Base.com',
        slug: 'baselinker',
      },
      isBaseComIntegration: true,
    });

    render(
      <MassListProductModal
        isOpen={true}
        item={['product-1', 'product-2']}
        integrationId='integration-base-1'
        connectionId='conn-base-1'
        onClose={vi.fn()}
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'List 2 Products to Base.com',
        saveText: 'Export to Base.com',
      })
    );
  });
});
