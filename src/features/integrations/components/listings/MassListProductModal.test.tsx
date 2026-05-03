import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useListingSelectionMock,
  formModalPropsMock,
  useMassListFormMock,
  handleSubmitMock,
  handleMarketplaceLoginMock,
} = vi.hoisted(() => ({
  useListingSelectionMock: vi.fn(),
  formModalPropsMock: vi.fn(),
  useMassListFormMock: vi.fn(),
  handleSubmitMock: vi.fn(),
  handleMarketplaceLoginMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  ListingSettingsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useListingSelection: () => useListingSelectionMock(),
}));

vi.mock('./hooks/useMassListForm', () => ({
  useMassListForm: () => useMassListFormMock(),
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
  MassListProgressPanel: ({
    current,
    total,
    paused,
  }: {
    current: number;
    total: number;
    paused?: boolean;
  }) => (
    <div data-testid='mass-list-progress-panel'>
      {paused ? `Paused at ${current} of ${total}.` : `Processing ${current} of ${total}...`}
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormModal: ({
    children,
    open,
    title,
    saveText,
    isSaveDisabled,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    title?: string;
    saveText?: string;
    isSaveDisabled?: boolean;
  }) => {
    formModalPropsMock({ title, saveText, isSaveDisabled });
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
    useMassListFormMock.mockReturnValue({
      error: null,
      progress: null,
      exportLogs: [],
      authRequired: false,
      authRequiredMarketplace: null,
      loggingIn: false,
      handleSubmit: handleSubmitMock,
      handleMarketplaceLogin: handleMarketplaceLoginMock,
      submitting: false,
    });
  });

  it('uses marketplace-specific mass-list titles for non-Base integrations', () => {
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

  it('uses the Vinted.pl mass-list title for Vinted quicklist flows', () => {
    useListingSelectionMock.mockReturnValue({
      loadingIntegrations: false,
      selectedIntegration: {
        id: 'integration-vinted-1',
        name: 'Vinted',
        slug: 'vinted',
      },
      isBaseComIntegration: false,
    });

    render(
      <MassListProductModal
        isOpen={true}
        item={['product-1', 'product-2']}
        integrationId='integration-vinted-1'
        connectionId='conn-vinted-1'
        onClose={vi.fn()}
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'List 2 Products to Vinted.pl',
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

  it('renders a Vinted recovery action and disables the header save button while auth recovery is required', () => {
    useListingSelectionMock.mockReturnValue({
      loadingIntegrations: false,
      selectedIntegration: {
        id: 'integration-vinted-1',
        name: 'Vinted',
        slug: 'vinted',
      },
      isBaseComIntegration: false,
    });
    useMassListFormMock.mockReturnValue({
      error:
        'Vinted login requires manual verification. Solve the browser challenge in the opened window and retry.',
      progress: {
        current: 2,
        total: 4,
        errors: 0,
      },
      exportLogs: [],
      authRequired: true,
      authRequiredMarketplace: 'vinted',
      loggingIn: false,
      handleSubmit: handleSubmitMock,
      handleMarketplaceLogin: handleMarketplaceLoginMock,
      submitting: false,
    });

    render(
      <MassListProductModal
        isOpen={true}
        item={['product-1', 'product-2', 'product-3', 'product-4']}
        integrationId='integration-vinted-1'
        connectionId='conn-vinted-1'
        onClose={vi.fn()}
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'List 4 Products to Vinted.pl',
        saveText: 'List Products',
        isSaveDisabled: true,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Login and continue on Vinted.pl' }));
    expect(handleMarketplaceLoginMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Paused at 2 of 4.')).toBeInTheDocument();
  });

  it('shows a Vinted.pl waiting label while bulk login recovery is in progress', () => {
    useListingSelectionMock.mockReturnValue({
      loadingIntegrations: false,
      selectedIntegration: {
        id: 'integration-vinted-1',
        name: 'Vinted',
        slug: 'vinted',
      },
      isBaseComIntegration: false,
    });
    useMassListFormMock.mockReturnValue({
      error:
        'Vinted login requires manual verification. Solve the browser challenge in the opened window and retry.',
      progress: {
        current: 2,
        total: 4,
        errors: 0,
      },
      exportLogs: [],
      authRequired: true,
      authRequiredMarketplace: 'vinted',
      loggingIn: true,
      handleSubmit: handleSubmitMock,
      handleMarketplaceLogin: handleMarketplaceLoginMock,
      submitting: false,
    });

    render(
      <MassListProductModal
        isOpen={true}
        item={['product-1', 'product-2', 'product-3', 'product-4']}
        integrationId='integration-vinted-1'
        connectionId='conn-vinted-1'
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Waiting for Vinted.pl login...' })).toBeDisabled();
  });
});
